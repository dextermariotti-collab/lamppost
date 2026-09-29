/**
 * How well a step went, as a score from 0 to 1 that feeds XP, ratings and reviews the same
 * way a drill does. First try full marks, a retry half, a third try a quarter, and giving up
 * (asking to be shown the answer) nothing. A hint halves whatever was earned, as it always has.
 */

export const TRIES_BEFORE_SHOW_ME = 2;

export function scoreFor(input: {
  wrongAttempts: number;
  hintUsed: boolean;
  revealed: boolean;
}): number {
  if (input.revealed) return 0;
  const base = input.wrongAttempts <= 0 ? 1 : input.wrongAttempts === 1 ? 0.5 : 0.25;
  return input.hintUsed ? base * 0.5 : base;
}

/** "Show me" appears once the learner has missed this many times. */
export const canShowAnswer = (wrongAttempts: number) => wrongAttempts >= TRIES_BEFORE_SHOW_ME;

export type StepResult = {
  /** 0-1, see scoreFor. */
  score: number;
  /** What the learner chose, kept with the attempt (confidence steps store `{ confidence }`). */
  answer: unknown;
  wrongAttempts: number;
  hintUsed: boolean;
  revealed: boolean;
};
