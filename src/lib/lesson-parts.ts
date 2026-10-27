import type { Lesson } from "./courses";
import type { Exercise, ExerciseKind, WrittenPrompt } from "./exercises";

/**
 * A lesson that isn't cached yet is written in parts, so the learner can start on
 * the idea card after a few seconds instead of waiting for every drill:
 *
 *   concept     the idea card and takeaways (a few seconds)
 *   drill:<n>   the n-th drill of the lesson's plan (each on its own, in parallel)
 *   written     the closing written task
 *
 * This module is the shared vocabulary: how parts are named, and what the server
 * tells the browser about a lesson that is not finished.
 */

export type PartName = "concept" | "written" | `drill:${number}`;

export const drillPart = (slot: number): PartName => `drill:${slot}`;

/** The parts the browser may ask for (the concept comes with the lesson itself). */
export const PART_PATTERN = /^(written|drill:[0-4])$/;

/** The slot a `drill:<n>` part fills, or null for any other part. */
export function slotOf(part: string): number | null {
  const match = /^drill:(\d+)$/.exec(part);
  return match ? Number(match[1]) : null;
}

/** Every part a lesson with this drill plan is made of, in the order it is needed. */
export const allParts = (plan: readonly ExerciseKind[]): PartName[] => [
  "concept",
  ...plan.map((_, slot) => drillPart(slot)),
  "written",
];

/** The parts the browser asks for after the concept: every drill, then the written task. */
export const requestableParts = (plan: readonly ExerciseKind[]): PartName[] =>
  allParts(plan).filter((part) => part !== "concept");

/**
 * What is known so far about a lesson that is not finished. `lesson` carries the
 * idea card and takeaways (and the written task once it exists) but no exercises;
 * `drills` has one entry per planned drill, null until that drill is written.
 */
export type LessonInProgress = {
  ok: true;
  complete: false;
  lesson: Lesson;
  drills: (Exercise | null)[];
  written: WrittenPrompt | null;
};

export type LessonComplete = { ok: true; complete: true; lesson: Lesson; cached: boolean };

/**
 * "Someone is already writing this part, ask again shortly." Not a failure the
 * learner should hear about.
 */
export type PartPending = { ok: false; reason: string; pending: true };

export const isPending = (result: { ok: boolean }): result is PartPending =>
  !result.ok && (result as Partial<PartPending>).pending === true;
