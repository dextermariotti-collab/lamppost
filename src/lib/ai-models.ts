/**
 * The model each AI feature calls, by Lovable AI Gateway name. Kept in one place so moving to a
 * newer model is one change that can't leave a feature behind, and so a feature can be moved on
 * its own when it needs to be. `ai-models.test.ts` fails if a model name appears anywhere else.
 */
const FLASH = "google/gemini-3.6-flash";

export const AI_MODELS = {
  /** Lesson content and its validation pass (also stored with each cached lesson). */
  lessons: FLASH,
  /** Grading a written argument. */
  grading: FLASH,
  /** The companion's follow-up question after a drill. */
  socratic: FLASH,
  /** Debates with a friend: the opening and the judging. */
  debate: FLASH,
  /** AI-written daily cases: the writer and the reviewer. */
  cases: FLASH,
  /** "Check something you saw". */
  look: FLASH,
  /** The explain-it-back tutor, a longer back-and-forth. */
  tutor: "google/gemini-3.7-flash",
  /** The allow/refuse screen on free text before anything is generated: small and fast. */
  screen: "google/gemini-3.6-flash-lite",
} as const;
