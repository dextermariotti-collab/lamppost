import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LESSONS, type CurriculumLesson } from "./curriculum";
import { cleanLessonHypotheticals } from "./hypothetical";
import {
  PART_PATTERN,
  slotOf,
  type LessonComplete,
  type LessonInProgress,
  type PartName,
  type PartPending,
} from "./lesson-parts";
import { limitedFailure, type LimitedFailure } from "./rate-limit";

const Input = z.object({ lessonId: z.string().min(1).max(80) });
const PartInput = Input.extend({ part: z.string().regex(PART_PATTERN) });

/**
 * What a lesson request can come back with:
 * - the finished lesson (almost always: lessons are written ahead of time),
 * - the lesson so far — the idea card and whatever drills exist — while a lesson
 *   that isn't cached is written in parts,
 * - "someone is already writing this, ask again shortly",
 * - a limit, or a plain failure.
 */
export type LessonContentResult =
  LessonComplete | LessonInProgress | PartPending | { ok: false; reason: string } | LimitedFailure;

const SOON: PartPending = {
  ok: false,
  pending: true,
  reason: "This lesson is still being prepared. One moment.",
};
const NOT_YET = {
  ok: false as const,
  reason: "This lesson is still being prepared. Give it a moment and try again.",
};

async function cachedLesson(meta: CurriculumLesson): Promise<LessonComplete | null> {
  const { readCachedLesson, isUsableLesson } = await import("./curriculum-generate.server");
  const cached = await readCachedLesson(meta.id);
  return isUsableLesson(cached, meta.drills)
    ? { ok: true, complete: true, lesson: cleanLessonHypotheticals(cached!), cached: true }
    : null;
}

/**
 * Fetches one curriculum lesson. Lessons are pre-generated and validated by the
 * warm-up pass, so this almost always answers straight from the cache. If a
 * lesson is missing it is written in parts instead of in one long request: this
 * call returns as soon as the idea card exists, and the browser asks for the
 * drills and the written task with getLessonPart, so the learner reads the card
 * while the rest is written and never sees a parser or quality-check error.
 */
export const getCurriculumLesson = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<LessonContentResult> => {
    const meta = LESSONS.find((l) => l.id === data.lessonId);
    if (!meta) return { ok: false, reason: "That lesson isn't part of the curriculum." };

    const cached = await cachedLesson(meta);
    if (cached) return cached;

    return await writePart(meta, "concept");
  });

/**
 * One more part of a lesson that isn't cached yet: a drill (`drill:<n>`) or the
 * written task (`written`). Returns what exists so far — or the finished lesson if
 * this part was the last one. A part that is already written is returned without
 * touching the limits or the model.
 */
export const getLessonPart = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PartInput.parse(input))
  .handler(async ({ data }): Promise<LessonContentResult> => {
    const meta = LESSONS.find((l) => l.id === data.lessonId);
    if (!meta) return { ok: false, reason: "That lesson isn't part of the curriculum." };
    const slot = slotOf(data.part);
    if (slot !== null && slot >= meta.drills.length) {
      return { ok: false, reason: "That drill isn't part of this lesson." };
    }

    const cached = await cachedLesson(meta);
    if (cached) return cached;

    return await writePart(meta, data.part as PartName);
  });

async function writePart(meta: CurriculumLesson, part: PartName): Promise<LessonContentResult> {
  const { livePartsDeps, readSnapshot, inProgress, assembleIfComplete, ensurePart } =
    await import("./lesson-parts.server");
  const deps = await livePartsDeps();

  // Whatever is already written is free to hand back.
  const snapshot = await readSnapshot(meta, deps.store);
  const written =
    part === "concept"
      ? snapshot.concept !== null
      : part === "written"
        ? snapshot.written !== null
        : snapshot.drills[slotOf(part)!] != null;
  if (written) {
    const finished = await assembleIfComplete(meta, deps);
    if (finished) {
      return {
        ok: true,
        complete: true,
        lesson: cleanLessonHypotheticals(finished),
        cached: false,
      };
    }
    return inProgress(meta, snapshot) ?? NOT_YET;
  }

  // Only a part that doesn't exist yet spends AI credit: one writer per part at a
  // time, within the caller's limits and the app-wide budget.
  const { guardedGeneration } = await import("./rate-limit.server");
  const attempt = await guardedGeneration({
    policy: "lessonPart",
    lockKey: `gen:part:${meta.id}:${part}`,
    lockTtlSeconds: 120,
    run: () => ensurePart(meta, part, deps),
  });
  if (attempt.status === "limited") return limitedFailure(attempt);
  if (attempt.status === "busy") return SOON;
  if (attempt.value.status === "failed") return NOT_YET;

  const { assembled, snapshot: latest } =
    attempt.value.status === "made"
      ? attempt.value
      : { assembled: null, snapshot: attempt.value.snapshot };
  if (assembled) {
    return { ok: true, complete: true, lesson: cleanLessonHypotheticals(assembled), cached: false };
  }
  return inProgress(meta, latest) ?? NOT_YET;
}
