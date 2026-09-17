/**
 * "Explain it back" active practice — client-safe types and local signal store.
 *
 * The conversation itself lives on the server (see `practice.functions.ts`).
 * What's kept locally is the *outcome* of a session, because the spaced
 * repetition scheduler reads it synchronously while building the queue.
 */

export type PracticeVerdict = "solid" | "shaky" | "revisit";

export type PracticeTurn = { role: "tutor" | "learner"; text: string };

export type PracticeClose = {
  verdict: PracticeVerdict;
  /** The one sentence worth remembering. */
  remembered: string;
  /** True when the learner linked this idea to an earlier lesson. */
  connectionMade: boolean;
};

/** How many free sessions a non-subscriber gets each week. */
export const FREE_WEEKLY_PRACTICE = 3;

/** Maximum learner replies before the tutor wraps up. */
export const MAX_PRACTICE_TURNS = 3;

const KEY = "lamppost-practice-v1";

type Stored = PracticeClose & { at: number };
type Store = Record<string, Stored>;

const idFor = (slug: string, lessonIndex: number) => `${slug}#${lessonIndex}`;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

export function getPracticeResult(slug: string, lessonIndex: number): Stored | undefined {
  return readStore()[idFor(slug, lessonIndex)];
}

export function savePracticeResult(slug: string, lessonIndex: number, close: PracticeClose) {
  if (typeof window === "undefined") return;
  try {
    const next: Store = {
      ...readStore(),
      [idFor(slug, lessonIndex)]: { ...close, at: Date.now() },
    };
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("lamppost-reviews-change"));
  } catch {
    /* ignore */
  }
}

/**
 * Interval multiplier from an explain-it-back session. A solid explanation is
 * stronger evidence of understanding than a correct prediction, so it stretches
 * further; a shaky one pulls the lesson back sooner.
 */
export function practiceWeight(slug: string, lessonIndex: number) {
  const result = getPracticeResult(slug, lessonIndex);
  if (!result) return 1;
  if (result.verdict === "solid") return 1.6;
  if (result.verdict === "shaky") return 0.8;
  return 0.5;
}

export const VERDICT_COPY: Record<PracticeVerdict, { label: string; blurb: string }> = {
  solid: { label: "Solid", blurb: "You explained this in your own words. It'll come back later." },
  shaky: { label: "Shaky", blurb: "Mostly there. Lamppost will bring this back a little sooner." },
  revisit: { label: "Worth another look", blurb: "This one comes back tomorrow while it's fresh." },
};
