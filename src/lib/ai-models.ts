/**
 * The model each AI feature calls, by the name the AI service uses (Google's Gemini API by default;
 * see `ai-gateway.server.ts`). Kept in one place so moving to a newer model is one change that
 * can't leave a feature behind, and so a feature can be moved on its own when it needs to be.
 * `architecture.test.ts` fails if a model name appears anywhere else.
 */
const FLASH = "gemini-3.6-flash";

export const AI_MODELS = {
  /** Lesson content and its validation pass (also stored with each cached lesson). */
  lessons: FLASH,
  /** Grading a written argument. */
  grading: FLASH,
  /** The guide's follow-up question after a drill. */
  socratic: FLASH,
  /** Debates with a friend: the opening and the judging. */
  debate: FLASH,
  /** AI-written daily cases: the writer and the reviewer. */
  cases: FLASH,
  /** "Check something you saw". */
  look: FLASH,
  /** The explain-it-back tutor, a longer back-and-forth. */
  tutor: "gemini-3.8-flash",
  /** The allow/refuse screen on free text before anything is generated: small and fast. */
  screen: "gemini-3.5-flash-lite",
} as const;

/**
 * The longest reply each kind of call needs, in tokens, sized to what it returns with room to
 * spare. The limits in `rate-limit.ts` count calls; these bound what one call can cost.
 */
export const AI_REPLY_TOKENS = {
  /** A whole lesson (idea card, four or five drills, the written task), or a repair of its drills. */
  lesson: 6000,
  /** One part of a lesson: a drill, the idea card or the written task. */
  lessonPart: 1500,
  /** The reviewer's verdict on up to five drills. */
  lessonReview: 1000,
  /** A rubric grade: a score and a sentence per criterion, and a tip. */
  grading: 1000,
  /** One line from the guide. */
  socratic: 120,
  /** A debate motion: a topic, a short passage and a prompt. */
  debateMotion: 600,
  /** A daily case: the text and three questions with their explanations. */
  caseWriter: 2500,
  /** A pass or fail for each of a case's three questions. */
  caseReview: 400,
  /** "Check something you saw": a claim, three lenses and a way to check. */
  look: 1000,
  /** One tutor turn: a few sentences, and the close when it ends. */
  tutor: 800,
  /** The allow/refuse classifier's one line of JSON. */
  screen: 60,
} as const;

export type AiJob = keyof typeof AI_REPLY_TOKENS;

/**
 * Gemini counts the model's thinking toward its output, so every cap leaves room for a low
 * reasoning effort on top of the reply itself.
 */
export const THINKING_TOKENS = 2048;

/** What every model call passes: a cap on what it writes, and a low reasoning effort. */
export const aiOutput = (job: AiJob) => ({
  maxOutputTokens: AI_REPLY_TOKENS[job] + THINKING_TOKENS,
  reasoning: "low" as const,
});
