import type { ExerciseKind } from "../exercises";
import type { LessonStep } from "./types";

/**
 * Step attempts are stored with the drill attempts, under the plain lesson id, so mastery, the
 * thinking map, badges and the calibration chart all see them. Steps take indexes from 100 so
 * they can never collide with the numbered drills of an older, generated version of a lesson.
 */
export const STEP_ATTEMPT_BASE = 100;
export const stepAttemptIndex = (stepIndex: number) => STEP_ATTEMPT_BASE + stepIndex;

/**
 * The review queue re-serves a fresh drill of a kind planned for the lesson. A step doesn't have
 * a drill kind of its own, so it borrows the lesson's planned kinds in turn: the review is about
 * the lesson's skill, and any planned kind is a valid way to test it.
 */
export function reviewKindFor(
  plan: readonly ExerciseKind[],
  gradedIndex: number,
): ExerciseKind | null {
  if (plan.length === 0) return null;
  return plan[gradedIndex % plan.length]!;
}

/** The confidence a learner stated on this step, if it asked for one. */
export function statedConfidence(answer: unknown): number | undefined {
  const value = (answer as { confidence?: unknown } | null)?.confidence;
  return typeof value === "number" ? value : undefined;
}

/** How many steps earn XP and count towards accuracy: everything but the text card. */
export const isGraded = (step: LessonStep) => step.kind !== "note";
