import { LESSONS, UNITS, type CurriculumLesson } from "./curriculum";
import { AI_MODELS } from "./ai-models";
import type { Lesson } from "./courses";
import type { Exercise, ExerciseKind } from "./exercises";
import { exercisesMatchPlan } from "./drill-plan";

/**
 * Server-only lesson generation.
 *
 * Learners must never wait on generation, so this module is written to be run
 * ahead of time (a warm-up pass over the whole curriculum) as well as on demand.
 * Everything it produces is validated before it is cached, and every validated
 * drill is also copied into the shared drill pool so reviews, the daily
 * challenge and the placement check always have vetted material to serve
 * instantly.
 */

export const MODEL = AI_MODELS.lessons;
/** Bumped when the generation pipeline changes; invalidates cached lessons. */
export const CONTENT_VERSION = 7;
/** Regeneration rounds allowed for drills that fail review. */
const MAX_REPAIRS = 2;
/** Whole-lesson attempts before giving up on this request. */
const MAX_ATTEMPTS = 3;

/**
 * A cached lesson is only served if it is the current content version AND holds
 * exactly the drills the curriculum plans for it (4–5 different types).
 */
export const isUsableLesson = (lesson: Lesson | undefined | null, plan: readonly ExerciseKind[]) =>
  Boolean(lesson?.contentVersion === CONTENT_VERSION && exercisesMatchPlan(lesson.exercises, plan));

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function readCachedLesson(lessonId: string): Promise<Lesson | undefined> {
  const db = await admin();
  const cached = await db
    .from("curriculum_lessons")
    .select("content")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  return (cached.data?.content as unknown as Lesson | undefined) ?? undefined;
}

/**
 * Copies a lesson's validated drills into the shared pool, so a review or
 * challenge on this skill always has something vetted to serve with no wait.
 */
export async function seedPoolFromLesson(
  lessonId: string,
  exercises: Exercise[],
  opts: { difficulty?: number; domains?: string[] } = {},
) {
  const db = await admin();
  const existing =
    (await db.from("drill_variants").select("variant, kind").eq("lesson_id", lessonId)).data ?? [];
  let next = existing.reduce((max, row) => Math.max(max, row.variant), 0);
  const rows = exercises.map((exercise, i) => ({
    lesson_id: lessonId,
    kind: exercise.kind,
    variant: ++next,
    difficulty: opts.difficulty ?? 2,
    domain: opts.domains?.[i] ?? null,
    content: JSON.parse(JSON.stringify(exercise)),
    model: MODEL,
  }));
  if (rows.length === 0) return;
  await db.from("drill_variants").insert(rows);
}

/** How many vetted drills exist per kind for a lesson. */
export async function poolCounts(lessonId: string): Promise<Record<string, number>> {
  const db = await admin();
  const rows =
    (await db.from("drill_variants").select("kind").eq("lesson_id", lessonId)).data ?? [];
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.kind] = (counts[row.kind] ?? 0) + 1;
  return counts;
}

export type GenerateResult =
  { ok: true; lesson: Lesson; cached: boolean } | { ok: false; reason: string };

/**
 * Returns a validated lesson, generating and caching it if needed. Safe to call
 * concurrently: the cache row is upserted on lesson_id.
 */
export async function ensureLessonContent(
  lessonId: string,
  opts: { force?: boolean; difficulty?: number } = {},
): Promise<GenerateResult> {
  const meta: CurriculumLesson | undefined = LESSONS.find((l) => l.id === lessonId);
  if (!meta) return { ok: false, reason: "unknown-lesson" };

  if (!opts.force) {
    const cached = await readCachedLesson(meta.id);
    if (isUsableLesson(cached, meta.drills)) return { ok: true, lesson: cached!, cached: true };
  }

  const key = process.env["AI_API_KEY"];
  if (!key) return { ok: false, reason: "ai-unconfigured" };

  const { streamText } = await import("ai");
  const { createAiProvider } = await import("./ai-gateway.server");
  const { screenOutput } = await import("./moderation.server");
  const { withGuardrails } = await import("./ai-guardrails.server");
  const {
    exerciseSystemPrompt,
    exerciseLessonPrompt,
    parseExerciseLesson,
    normalizeExercise,
    extractJson,
  } = await import("./exercise-ai.server");
  const { VALIDATION_SYSTEM, validationPrompt, parseVerdicts, repairPrompt } =
    await import("./exercise-validate.server");

  const { domainPlan } = await import("./domains");
  const domains = domainPlan(null, meta.drills.length);
  const difficulty = opts.difficulty ?? 2;

  const gateway = createAiProvider(key);
  const system = exerciseSystemPrompt(meta.drills, meta.written);
  const ask = async (systemPrompt: string, prompt: string) =>
    await streamText({
      model: gateway(MODEL),
      system: withGuardrails(systemPrompt),
      prompt,
      maxRetries: 2,
    }).text;

  for (let round = 0; round < MAX_ATTEMPTS; round++) {
    try {
      const text = await ask(system, exerciseLessonPrompt(meta, { domains, difficulty }));
      const screened = screenOutput(text);
      if (!screened.allowed) continue;

      const lesson = parseExerciseLesson(text, {
        title: meta.title,
        objective: meta.objective,
        emoji: meta.emoji,
        drills: meta.drills,
        written: meta.written,
      });
      if (!lesson?.exercises || !exercisesMatchPlan(lesson.exercises, meta.drills)) {
        console.warn(`[curriculum] ${meta.id}: reply unreadable (round ${round + 1})`);
        continue;
      }

      let exercises = lesson.exercises;
      let passed = false;

      for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
        const review = await ask(
          VALIDATION_SYSTEM,
          validationPrompt(meta, exercises, lesson.concept?.body),
        );
        const verdicts = parseVerdicts(review, exercises.length);
        if (!verdicts) break;

        const failures: { index: number; problem: string }[] = [];
        for (const verdict of verdicts) {
          if (verdict.pass) continue;
          const drill = exercises[verdict.index];
          if (!drill) continue;
          const fixable =
            verdict.betterCorrect !== null &&
            "options" in drill &&
            Array.isArray(drill.options) &&
            verdict.betterCorrect >= 0 &&
            verdict.betterCorrect < drill.options.length;
          if (fixable) {
            exercises = exercises.map((e, i) =>
              i === verdict.index ? { ...e, correct: verdict.betterCorrect } : e,
            ) as typeof exercises;
            continue;
          }
          failures.push({ index: verdict.index, problem: verdict.problem });
        }

        if (!failures.length) {
          passed = true;
          break;
        }
        if (attempt === MAX_REPAIRS) break;

        const repair = await ask(
          system,
          repairPrompt(
            meta,
            failures.map((f) => ({ exercise: exercises[f.index]!, problem: f.problem })),
          ),
        );
        if (!screenOutput(repair).allowed) break;
        const root = extractJson(repair);
        const replacements = (
          Array.isArray(root?.["exercises"]) ? (root!["exercises"] as unknown[]) : []
        )
          .map(normalizeExercise)
          .filter((e): e is Exercise => e !== null);

        let used = 0;
        exercises = exercises.map((existing, i) => {
          if (!failures.some((f) => f.index === i)) return existing;
          const next = replacements.find((r, j) => r.kind === existing.kind && j >= used);
          if (!next) return existing;
          used = replacements.indexOf(next) + 1;
          return next;
        });
      }

      if (!passed) {
        console.warn(`[curriculum] ${meta.id}: failed validation (round ${round + 1})`);
        continue;
      }

      const validated: Lesson = { ...lesson, exercises, contentVersion: CONTENT_VERSION };
      const db = await admin();
      const unit = UNITS.find((u) => u.id === meta.unitId);
      await db.from("curriculum_lessons").upsert(
        {
          lesson_id: meta.id,
          unit_id: unit?.id ?? meta.unitId,
          title: meta.title,
          content: JSON.parse(JSON.stringify(validated)),
          model: MODEL,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "lesson_id" },
      );
      await seedPoolFromLesson(meta.id, exercises, { difficulty, domains }).catch(() => undefined);
      return { ok: true, lesson: validated, cached: false };
    } catch (error) {
      console.error(`[curriculum] ${meta.id}: generation error`, error);
    }
  }

  return { ok: false, reason: "generation-failed" };
}

/**
 * Writes one drill of `kind` for a lesson and has a second pass check it. Nothing
 * is stored: the caller decides where it goes (the shared pool, or a lesson that
 * is being written in parts). A drill the reviewer can't be heard on is rejected,
 * not waved through.
 */
export async function generateValidatedDrill(
  meta: CurriculumLesson,
  kind: ExerciseKind,
  opts: {
    difficulty?: number;
    domain?: string;
    /** Scenarios already used, so the new one is clearly different. */
    avoid?: string[];
    /** The concept card the learner has read, so the drill doesn't echo it. */
    conceptBody?: string;
  } = {},
): Promise<Exercise | null> {
  const key = process.env["AI_API_KEY"];
  if (!key) return null;

  const { streamText } = await import("ai");
  const { createAiProvider } = await import("./ai-gateway.server");
  const { screenOutput } = await import("./moderation.server");
  const { withGuardrails } = await import("./ai-guardrails.server");
  const { variantSystemPrompt, variantPrompt, normalizeExercise, extractJson } =
    await import("./exercise-ai.server");
  const { VALIDATION_SYSTEM, validationPrompt, parseVerdicts } =
    await import("./exercise-validate.server");

  const difficulty = opts.difficulty ?? 2;
  const gateway = createAiProvider(key);
  const ask = async (system: string, prompt: string) =>
    await streamText({
      model: gateway(MODEL),
      system: withGuardrails(system),
      prompt,
      maxRetries: 2,
    }).text;

  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await ask(
      variantSystemPrompt(kind),
      variantPrompt(meta, kind, opts.avoid ?? [], {
        difficulty,
        ...(opts.domain ? { domain: opts.domain } : {}),
        ...(opts.conceptBody ? { conceptBody: opts.conceptBody } : {}),
      }),
    );
    if (!screenOutput(text).allowed) continue;
    const root = extractJson(text);
    const candidate = normalizeExercise(
      root && Array.isArray(root["exercises"]) ? root["exercises"][0] : root,
    );
    if (!candidate || candidate.kind !== kind) continue;

    const review = await ask(
      VALIDATION_SYSTEM,
      validationPrompt(meta, [candidate], opts.conceptBody),
    );
    const verdict = parseVerdicts(review, 1)?.[0];
    if (!verdict) continue;
    if (verdict.pass) return candidate;

    const fixable =
      verdict.betterCorrect !== null &&
      "options" in candidate &&
      Array.isArray(candidate.options) &&
      verdict.betterCorrect >= 0 &&
      verdict.betterCorrect < candidate.options.length;
    if (fixable) return { ...candidate, correct: verdict.betterCorrect } as Exercise;
  }
  return null;
}

/**
 * Generates one extra vetted drill of a given kind for a lesson and adds it to
 * the pool. Used by the background top-up, never awaited by a learner.
 */
export async function generatePoolDrill(
  lessonId: string,
  kind: ExerciseKind,
  opts: { difficulty?: number; domain?: string } = {},
): Promise<Exercise | null> {
  const meta = LESSONS.find((l) => l.id === lessonId);
  if (!meta) return null;

  try {
    const { describeExercise } = await import("./exercises");
    const db = await admin();
    const pool =
      (
        await db
          .from("drill_variants")
          .select("variant, content")
          .eq("lesson_id", lessonId)
          .eq("kind", kind)
          .order("variant", { ascending: false })
          .limit(4)
      ).data ?? [];
    const avoid = pool.map((row) =>
      describeExercise(row.content as unknown as Exercise).slice(0, 200),
    );

    const exercise = await generateValidatedDrill(meta, kind, { ...opts, avoid });
    if (!exercise) return null;

    const max =
      (await db.from("drill_variants").select("variant").eq("lesson_id", lessonId)).data?.reduce(
        (m, row) => Math.max(m, row.variant),
        0,
      ) ?? 0;
    await db.from("drill_variants").insert({
      lesson_id: lessonId,
      kind,
      variant: max + 1,
      difficulty: opts.difficulty ?? 2,
      domain: opts.domain ?? null,
      content: JSON.parse(JSON.stringify(exercise)),
      model: MODEL,
    });
    return exercise;
  } catch (error) {
    console.error(`[pool] ${lessonId}/${kind} top-up failed`, error);
  }
  return null;
}
