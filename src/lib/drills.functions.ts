import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LESSONS } from "./curriculum";
import { EXERCISE_KINDS, type Exercise, type ExerciseKind } from "./exercises";
import { MOTIVATION_IDS } from "./onboarding";

/**
 * Serves ONE fresh drill of a skill + type for reviews, the daily challenge and
 * the placement check.
 *
 * Everything is served from a pre-validated pool so the learner never waits on
 * a model call and never sees a generation failure. Within the pool the pick is
 * steered by the learner's rating (difficulty band), their goal (setting), and
 * which variants they have already seen. The pool is topped up in the
 * background; if it is somehow empty, the lesson's own validated drills seed it.
 */

const Input = z.object({
  lessonId: z.string().min(1),
  kind: z.enum(EXERCISE_KINDS),
  seen: z.array(z.number().int()).max(80).default([]),
  /** Difficulty band the learner's rating asks for. */
  difficulty: z.number().int().min(1).max(3).default(2),
  motivation: z.enum(MOTIVATION_IDS).nullish(),
});

/** Below this, a background top-up is kicked off after answering. */
const POOL_TARGET = 8;

export type DrillVariantResult =
  | {
      ok: true;
      variant: number;
      exercise: Exercise;
      kind: ExerciseKind;
      difficulty: number;
    }
  | { ok: false; reason: string };

export const getDrillVariant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<DrillVariantResult> => {
    const meta = LESSONS.find((l) => l.id === data.lessonId);
    if (!meta) return { ok: false, reason: "That drill isn't part of the curriculum." };

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { seedPoolFromLesson, readCachedLesson, isUsableLesson, ensureLessonContent } =
        await import("./curriculum-generate.server");
      const { domainsFor } = await import("./domains");

      const readPool = async () =>
        (
          await supabaseAdmin
            .from("drill_variants")
            .select("variant, kind, content, difficulty, domain")
            .eq("lesson_id", meta.id)
            .order("variant", { ascending: true })
        ).data ?? [];

      let rows = await readPool();

      // Empty pool: seed it from this lesson's own validated drills.
      if (rows.length === 0) {
        const cached = await readCachedLesson(meta.id);
        if (isUsableLesson(cached, meta.drills)) {
          await seedPoolFromLesson(meta.id, cached!.exercises!);
        } else {
          const generated = await ensureLessonContent(meta.id);
          if (generated.ok && generated.lesson.exercises) {
            if (generated.cached) await seedPoolFromLesson(meta.id, generated.lesson.exercises);
          }
        }
        rows = await readPool();
      }

      const ofKind = rows.filter((row) => row.kind === data.kind);
      const candidates = ofKind.length > 0 ? ofKind : rows;
      if (candidates.length === 0) {
        return { ok: false, reason: "This drill is still being prepared. Try again in a moment." };
      }

      // The lesson's own drills are seeded into the pool; a learner who played
      // the lesson has seen those, so they never count as a "new scenario".
      const lesson = await readCachedLesson(meta.id).catch(() => null);
      const questionOf = (c: unknown) =>
        String((c as { question?: string } | null)?.question ?? "").trim().toLowerCase();
      const lessonQuestions = new Set(
        ((lesson?.exercises ?? []) as unknown[]).map(questionOf).filter(Boolean),
      );
      const fresh = candidates.filter(
        (row) => !data.seen.includes(row.variant) && !lessonQuestions.has(questionOf(row.content)),
      );
      // Out of unseen drills: least-recently-seen first, and top the pool up.
      const lastSeenAt = (v: number) => data.seen.lastIndexOf(v);
      const oldest = [...candidates].sort((a, b) => lastSeenAt(a.variant) - lastSeenAt(b.variant));
      const pool = fresh.length > 0 ? fresh : oldest.slice(0, 1);
      const exhausted = fresh.length === 0;

      // Then keep it near their rating, and in a setting their goal cares about.
      const nearest = Math.min(
        ...pool.map((row) => Math.abs((row.difficulty ?? 2) - data.difficulty)),
      );
      const atLevel = pool.filter(
        (row) => Math.abs((row.difficulty ?? 2) - data.difficulty) === nearest,
      );
      const wanted = domainsFor(data.motivation ?? null);
      const onTheme = atLevel.filter((row) => row.domain && wanted.includes(row.domain));
      const source = onTheme.length > 0 ? onTheme : atLevel;
      const chosen = source[Math.floor(Math.random() * source.length)]!;

      // Keep the pool healthy for next time, without making anyone wait for it.
      if ((exhausted || ofKind.length < POOL_TARGET) && meta.drills.includes(data.kind)) {
        const domain = wanted[Math.floor(Math.random() * wanted.length)];
        void import("./curriculum-generate.server")
          .then(({ generatePoolDrill }) =>
            generatePoolDrill(meta.id, data.kind, {
              difficulty: data.difficulty,
              ...(domain ? { domain } : {}),
            }),
          )
          .catch(() => undefined);
      }

      return {
        ok: true,
        variant: chosen.variant,
        exercise: chosen.content as unknown as Exercise,
        kind: chosen.kind as ExerciseKind,
        difficulty: chosen.difficulty ?? 2,
      };
    } catch (error) {
      console.error("Drill pool read failed:", error);
      return { ok: false, reason: "This drill is still being prepared. Try again in a moment." };
    }
  });
