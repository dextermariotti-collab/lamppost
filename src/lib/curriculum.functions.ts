import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LESSONS, UNITS, type CurriculumLesson } from "./curriculum";
import type { Lesson } from "./courses";

const Input = z.object({ lessonId: z.string().min(1) });

export type LessonContentResult =
  { ok: true; lesson: Lesson; cached: boolean } | { ok: false; reason: string };

const MODEL = "google/gemini-3.6-flash";
/** Bumped when the generation pipeline changes; invalidates cached lessons. */
const CONTENT_VERSION = 3;
/** Regeneration rounds allowed for drills that fail review. */
const MAX_REPAIRS = 2;

function describe(error: unknown): string {
  const text = String((error as { message?: string })?.message ?? error ?? "unknown");
  console.error("Curriculum lesson generation failed:", text, (error as { stack?: string })?.stack);
  if (/402|credit|quota|billing|payment/i.test(text)) {
    return "The AI workspace is out of credits, so this lesson couldn't be written. Top up AI credits and try again.";
  }
  if (/429|rate.?limit/i.test(text)) {
    return "The tutor is rate limited right now. Wait a moment and try again.";
  }
  return "This lesson couldn't be written just now. Try again in a moment.";
}

/**
 * Fetches one curriculum lesson's content. Content is generated once through the
 * AI pipeline, strictly constrained to that lesson's objective, then cached by
 * lesson id in the database so every learner sees the same lesson.
 */
export const getCurriculumLesson = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<LessonContentResult> => {
    const meta: CurriculumLesson | undefined = LESSONS.find((l) => l.id === data.lessonId);
    if (!meta) return { ok: false, reason: "That lesson isn't part of the curriculum." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cached = await supabaseAdmin
      .from("curriculum_lessons")
      .select("content")
      .eq("lesson_id", meta.id)
      .maybeSingle();
    const cachedLesson = cached.data?.content as unknown as Lesson | undefined;
    // Content generated before the current pipeline is regenerated for everyone.
    if (
      cachedLesson?.contentVersion === CONTENT_VERSION &&
      cachedLesson.exercises &&
      cachedLesson.exercises.length >= 3
    ) {
      return { ok: true, lesson: cachedLesson, cached: true };
    }

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false, reason: "AI isn't configured for this project yet." };

    try {
      const { streamText } = await import("ai");
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const { screenOutput } = await import("./moderation.server");
      const {
        exerciseSystemPrompt,
        exerciseLessonPrompt,
        parseExerciseLesson,
        normalizeExercise,
        extractJson,
      } = await import("./exercise-ai.server");
      const { VALIDATION_SYSTEM, validationPrompt, parseVerdicts, repairPrompt } =
        await import("./exercise-validate.server");

      const gateway = createLovableAiGatewayProvider(key);
      const system = exerciseSystemPrompt(meta.drills, meta.written);

      const ask = async (systemPrompt: string, prompt: string) => {
        const result = streamText({ model: gateway(MODEL), system: systemPrompt, prompt });
        return await result.text;
      };

      const text = await ask(system, exerciseLessonPrompt(meta));
      const screened = screenOutput(text);
      if (!screened.allowed) return { ok: false, reason: screened.message };

      const lesson = parseExerciseLesson(text, {
        title: meta.title,
        objective: meta.objective,
        emoji: meta.emoji,
        drills: meta.drills,
        written: meta.written,
      });
      if (!lesson?.exercises) {
        return { ok: false, reason: "The tutor's reply couldn't be read as a lesson." };
      }

      // ---- validation pass: only cache a lesson whose every drill checks out ----
      let exercises = lesson.exercises;
      let passed = false;

      for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
        const review = await ask(VALIDATION_SYSTEM, validationPrompt(meta, exercises));
        const verdicts = parseVerdicts(review, exercises.length);
        if (!verdicts) {
          console.warn(`[curriculum] ${meta.id}: validation reply unreadable, attempt ${attempt}`);
          break;
        }

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
            // The only fault was the key: point it at the option the reviewer named.
            console.warn(
              `[curriculum] ${meta.id}: re-keyed drill ${verdict.index} (${drill.kind}) — ${verdict.problem}`,
            );
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

        console.warn(
          `[curriculum] ${meta.id}: ${failures.length} drill(s) failed review (attempt ${attempt + 1}): ` +
            failures
              .map((f) => `#${f.index} ${exercises[f.index]?.kind}: ${f.problem}`)
              .join(" | "),
        );
        if (attempt === MAX_REPAIRS) break;

        const repair = await ask(
          system,
          repairPrompt(
            meta,
            failures.map((f) => ({ exercise: exercises[f.index]!, problem: f.problem })),
          ),
        );
        const repairScreen = screenOutput(repair);
        if (!repairScreen.allowed) break;
        const replacements = (
          Array.isArray(extractJson(repair)?.["exercises"])
            ? (extractJson(repair)!["exercises"] as unknown[])
            : []
        )
          .map(normalizeExercise)
          .filter((e): e is NonNullable<typeof e> => e !== null);

        let used = 0;
        exercises = exercises.map((existing, i) => {
          const failure = failures.find((f) => f.index === i);
          if (!failure) return existing;
          const next = replacements.find((r, j) => r.kind === existing.kind && j >= used);
          if (!next) return existing;
          used = replacements.indexOf(next) + 1;
          return next;
        });
      }

      if (!passed) {
        // Never cache content that failed review; the learner retries instead of
        // being handed a drill with a wrong answer key.
        console.warn(`[curriculum] ${meta.id}: lesson not cached — failed validation`);
        return {
          ok: false,
          reason: "This lesson didn't pass quality checks. Try again in a moment.",
        };
      }

      const validated: Lesson = { ...lesson, exercises, contentVersion: CONTENT_VERSION };

      const unit = UNITS.find((u) => u.id === meta.unitId);
      await supabaseAdmin.from("curriculum_lessons").upsert(
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

      return { ok: true, lesson: validated, cached: false };
    } catch (error) {
      return { ok: false, reason: describe(error) };
    }
  });
