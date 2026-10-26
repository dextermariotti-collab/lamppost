import type { ExerciseKind } from "./exercises";

/**
 * Every lesson is a workout of 4–5 different drill types. The plan lives in
 * curriculum.ts; this module is the rule it must satisfy, shared by the
 * curriculum test, the generator (a reply that doesn't deliver the whole plan is
 * rejected) and the cache check (a stored lesson that doesn't match is stale).
 */

export const MIN_DRILLS = 4;
export const MAX_DRILLS = 5;

/**
 * Pairs that ask for the same judgment in a different costume, so a lesson must
 * not contain both. (Lesson 6 shipped "rank the evidence" and "order the
 * evidence" — one drill twice.)
 */
const NEAR_DUPLICATE_KINDS: readonly (readonly [ExerciseKind, ExerciseKind])[] = [
  ["rank", "order"],
];

/** Everything wrong with a drill plan; empty when it is fine. */
export function drillPlanProblems(plan: readonly ExerciseKind[]): string[] {
  const problems: string[] = [];
  if (plan.length < MIN_DRILLS || plan.length > MAX_DRILLS) {
    problems.push(`has ${plan.length} drills, needs ${MIN_DRILLS}–${MAX_DRILLS}`);
  }
  const seen = new Set<ExerciseKind>();
  for (const kind of plan) {
    if (seen.has(kind)) problems.push(`repeats the "${kind}" drill`);
    seen.add(kind);
  }
  for (const [a, b] of NEAR_DUPLICATE_KINDS) {
    if (seen.has(a) && seen.has(b))
      problems.push(`has both "${a}" and "${b}", which are near-identical`);
  }
  return problems;
}

/** True when the exercises are exactly the planned kinds, in plan order. */
export function exercisesMatchPlan(
  exercises: readonly { kind: ExerciseKind }[] | null | undefined,
  plan: readonly ExerciseKind[],
): boolean {
  if (!exercises || exercises.length !== plan.length) return false;
  return exercises.every((exercise, i) => exercise.kind === plan[i]);
}
