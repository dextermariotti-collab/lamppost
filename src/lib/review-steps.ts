import type { LoadedScript } from "@/content/lessons";
import { LESSONS } from "./curriculum";
import type { ExerciseAttempt } from "./exercise-store";
import type { ExerciseKind } from "./exercises";
import { isGraded, reviewKindFor, stepAttemptIndex } from "./steps/attempts";
import type { LessonScript, LessonStep } from "./steps/types";
import type { ScheduledDrill } from "./review-drills";

/**
 * Reviews and the placement check are served from the lessons' own authored steps. A queued
 * review (`lessonId#kind`) was made by one of the lesson's graded steps: each borrows a planned
 * drill kind in turn (`reviewKindFor`), so the steps that share the item's kind are the ones it
 * came from. Pure: the caller loads the script.
 */

export type ReviewPick = {
  step: LessonStep;
  /** The step's place in its lesson. */
  stepIndex: number;
  /** What `gradeDrillReview` records as served, so the next review asks a different step. */
  variant: number;
};

const gradedSteps = (script: LessonScript) => {
  let graded = 0;
  return script.steps.flatMap((step, stepIndex) =>
    isGraded(step) ? [{ step, stepIndex, gradedIndex: graded++ }] : [],
  );
};

/**
 * The step a review asks: one of the steps the item came from that hasn't been served lately,
 * the one the learner got wrong first; once all have been served, they come round in turn.
 */
export function pickReviewStep(
  script: LessonScript,
  plan: readonly ExerciseKind[],
  kind: ExerciseKind,
  seen: readonly number[],
  attempts: Readonly<Record<string, ExerciseAttempt>>,
): ReviewPick | null {
  const graded = gradedSteps(script);
  const ownKind = graded.filter((g) => reviewKindFor(plan, g.gradedIndex) === kind);
  const pool = ownKind.length > 0 ? ownKind : graded;
  if (pool.length === 0) return null;
  const variantOf = (stepIndex: number) => stepAttemptIndex(stepIndex);
  const missed = (stepIndex: number) =>
    (attempts[`${script.lessonId}#${stepAttemptIndex(stepIndex)}`]?.score ?? 1) < 1;
  const fresh = pool.filter((g) => !seen.includes(variantOf(g.stepIndex)));
  const chosen =
    fresh.find((g) => missed(g.stepIndex)) ?? fresh[0] ?? pool[seen.length % pool.length]!;
  return { step: chosen.step, stepIndex: chosen.stepIndex, variant: variantOf(chosen.stepIndex) };
}

/** The question the placement check asks about a lesson: its hardest, the closing case. */
export function placementStep(script: LessonScript): LessonStep | null {
  return gradedSteps(script).at(-1)?.step ?? null;
}

/** A step's words, for a report about it. */
export function stepExcerpt(step: LessonStep): string {
  const words: string[] = [];
  const walk = (value: unknown, key: string) => {
    if (key === "id" || key === "kind") return;
    if (typeof value === "string") words.push(value);
    else if (Array.isArray(value)) value.forEach((item) => walk(item, ""));
    else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(v, k);
    }
  };
  walk(step, "");
  return words.join("\n").slice(0, 1500);
}

export type ReviewQuestion = ReviewPick & { item: ScheduledDrill };

/**
 * Today's review as questions: one step for each due item, from its lesson's script. An item
 * whose lesson can't be loaded is left out, ungraded, and stays due for another day.
 */
export async function reviewSession(
  items: readonly ScheduledDrill[],
  load: (unitId: string, lessonId: string) => Promise<LoadedScript>,
  attempts: Readonly<Record<string, ExerciseAttempt>>,
): Promise<{ questions: ReviewQuestion[]; skipped: number }> {
  const picks = await Promise.all(
    items.map(async (item) => {
      const meta = LESSONS.find((lesson) => lesson.id === item.lessonId);
      if (!meta) return null;
      const loaded = await load(meta.unitId, meta.id);
      if (!loaded.ok) return null;
      const pick = pickReviewStep(loaded.script, meta.drills, item.kind, item.seen, attempts);
      return pick ? { ...pick, item } : null;
    }),
  );
  const questions = picks.filter((pick): pick is ReviewQuestion => pick !== null);
  return { questions, skipped: items.length - questions.length };
}
