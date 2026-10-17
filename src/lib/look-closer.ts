import { LESSONS } from "./curriculum";

/**
 * "Check something you saw": a learner pastes a post, an ad, a headline or a chatbot answer,
 * and gets back the questions from the lessons that matter most for it. It never says whether
 * the text is true; it shows where to look. This module holds the limits and reads the model's
 * reply; the prompt and the call are in `look-closer.server.ts` and `look-closer.functions.ts`.
 */

/** Characters of pasted text: enough to hold a claim, short enough to stay a quick look. */
export const LOOK_TEXT = { min: 40, max: 1500 } as const;

export const LOOK_SOURCES = {
  post: "A post",
  advert: "An ad",
  headline: "A headline",
  article: "An article",
  message: "An email or message",
  chatbot: "A chatbot answer",
  other: "Something else",
} as const;
export type LookSource = keyof typeof LOOK_SOURCES;

export type Lens = {
  /** The lesson whose question this is. */
  lessonId: string;
  /** The question to ask of this text, in the learner's own voice. */
  question: string;
  /** What in the text to look at while asking it. */
  lookFor: string;
};

export type LookResult = {
  /** What the text wants the reader to accept, in one sentence. */
  claim: string;
  lenses: Lens[];
  /** One way to check it outside the text itself. */
  check: string;
};

/** Why the pasted text can't be looked at yet, or null if it can. */
export function lookInputProblem(text: string): string | null {
  const length = text.trim().length;
  if (length < LOOK_TEXT.min) return "Paste a little more: a sentence or two at least.";
  if (length > LOOK_TEXT.max)
    return `That's a lot of text. Paste the part that matters, up to ${LOOK_TEXT.max} characters.`;
  return null;
}

/**
 * A reply that passes judgment on the text instead of pointing to the questions. The feature
 * promises not to decide what's true, so a reply that does is thrown away.
 */
const VERDICT =
  /\b(this|the|that) (claim|post|text|advert|ad|headline|article|answer|statement) is (true|false|fake|accurate|correct|wrong|a lie|misinformation|disinformation)\b|\bis (definitely|certainly|clearly) (true|false)\b|\bfake news\b/i;

const str = (value: unknown, max: number) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : "";

/** The model's reply as a result, or null if it isn't usable. */
export function readLookResult(raw: unknown): LookResult | null {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const claim = str(obj["claim"], 240);
  const check = str(obj["check"], 280);
  const seen = new Set<string>();
  const lenses: Lens[] = [];
  for (const item of Array.isArray(obj["lenses"]) ? obj["lenses"] : []) {
    const lens = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const lessonId = str(lens["lessonId"], 60);
    const question = str(lens["question"], 200);
    const lookFor = str(lens["lookFor"], 320);
    if (!LESSONS.some((l) => l.id === lessonId) || seen.has(lessonId) || !question || !lookFor)
      continue;
    seen.add(lessonId);
    lenses.push({ lessonId, question, lookFor });
  }
  if (!claim || !check || lenses.length < 2) return null;
  const result = { claim, lenses: lenses.slice(0, 3), check };
  return VERDICT.test(JSON.stringify(result)) ? null : result;
}
