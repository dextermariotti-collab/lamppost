import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LESSONS } from "./curriculum";
import { EXERCISE_KINDS, type Exercise, type ExerciseKind } from "./exercises";

/**
 * Serves ONE fresh drill of a skill + type for reviews, the daily challenge and
 * the placement check.
 *
 * Everything is served from a pre-validated pool so the learner never waits on
 * a model call and never sees a generation failure. The pool is topped up in the
 * background; if it is somehow empty, the lesson's own validated drills seed it.
 */

const Input = z.object({
  lessonId: z.string().min(1),
  kind: z.enum(EXERCISE_KINDS),
  seen: z.array(z.number().int()).max(50).default([]),
});

/** Below this, a background top-up is kicked off after answering. */
const POOL_TARGET = 8;

export type DrillVariantResult =
  | { ok: true; variant: number; exercise: Exercise; kind: ExerciseKind }
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

      const readPool = async () =>
        (
          await supabaseAdmin
            .from("drill_variants")
            .select("variant, kind, content")
            .eq("lesson_id", meta.id)
            .order("variant", { ascending: true })
        ).data ?? [];

      let rows = await readPool();

      // Empty pool: seed it from this lesson's own validated drills.
      if (rows.length === 0) {
        const cached = await readCachedLesson(meta.id);
        if (isUsableLesson(cached)) {
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

      const unseen = candidates.filter((row) => !data.seen.includes(row.variant));
      const source = unseen.length > 0 ? unseen : candidates;
      const chosen = source[Math.floor(Math.random() * source.length)]!;

      // Keep the pool healthy for next time, without making anyone wait for it.
      if (ofKind.length < POOL_TARGET && meta.drills.includes(data.kind)) {
        void import("./curriculum-generate.server")
          .then(({ generatePoolDrill }) => generatePoolDrill(meta.id, data.kind))
          .catch(() => undefined);
      }

      return {
        ok: true,
        variant: chosen.variant,
        exercise: chosen.content as unknown as Exercise,
        kind: chosen.kind as ExerciseKind,
      };
    } catch (error) {
      console.error("Drill pool read failed:", error);
      return { ok: false, reason: "This drill is still being prepared. Try again in a moment." };
    }
  });
