import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LESSONS } from "./curriculum";
import type { Lesson } from "./courses";
import { cleanLessonHypotheticals } from "./hypothetical";
import { limitedFailure, type LimitedFailure } from "./rate-limit";

const Input = z.object({ lessonId: z.string().min(1).max(80) });

export type LessonContentResult =
  { ok: true; lesson: Lesson; cached: boolean } | { ok: false; reason: string } | LimitedFailure;

/**
 * Fetches one curriculum lesson. Lessons are pre-generated and validated by the
 * warm-up pass, so this almost always answers straight from the cache. If a
 * lesson is somehow missing it is generated here, and the learner only ever
 * sees a soft "one moment" message — never a parser or quality-check error.
 */
export const getCurriculumLesson = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<LessonContentResult> => {
    const meta = LESSONS.find((l) => l.id === data.lessonId);
    if (!meta) return { ok: false, reason: "That lesson isn't part of the curriculum." };

    const { readCachedLesson, isUsableLesson, ensureLessonContent } =
      await import("./curriculum-generate.server");

    const cached = await readCachedLesson(meta.id);
    if (isUsableLesson(cached, meta.drills)) {
      return { ok: true, lesson: cleanLessonHypotheticals(cached!), cached: true };
    }

    // A cache miss is the only path that spends AI credit. It is limited per caller
    // and for the whole app, and only one request per lesson generates at a time —
    // the rest are told it is being prepared, and find it cached on their retry.
    const { guardedGeneration } = await import("./rate-limit.server");
    const attempt = await guardedGeneration({
      policy: "lessonGeneration",
      lockKey: `gen:lesson:${meta.id}`,
      lockTtlSeconds: 240,
      run: () => ensureLessonContent(meta.id),
    });
    if (attempt.status === "limited") return limitedFailure(attempt);
    if (attempt.status === "ran" && attempt.value.ok) {
      return { ...attempt.value, lesson: cleanLessonHypotheticals(attempt.value.lesson) };
    }

    // Anything left over is a temporary condition from the learner's point of view.
    return {
      ok: false,
      reason: "This lesson is still being prepared. Give it a moment and try again.",
    };
  });
