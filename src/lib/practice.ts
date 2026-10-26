import { CURRICULUM_SLUG, LESSONS } from "./curriculum";
import { reviewLessonWithin } from "./review-drills";
import { isRecord, readJson, recordOf } from "./local-store";

/**
 * "Explain it back" active practice — client-safe types and local signal store.
 *
 * The conversation itself lives on the server (see `practice.functions.ts`).
 * What's kept locally is the *outcome* of a session, by lesson id. A shaky or
 * revisit verdict also puts the lesson on the review queue, which is what
 * `VERDICT_COPY` tells the learner will happen.
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

/**
 * The free sessions are counted per week from Monday 00:00 UTC, the same instant for every
 * learner wherever they are (Sunday evening across the US). This is when the current week began.
 */
export function practiceWeekStart(now: Date = new Date()): Date {
  const sinceMonday = (now.getUTCDay() + 6) % 7;
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - sinceMonday),
  );
}

/** When this week's free sessions come back: the next Monday 00:00 UTC, always after `now`. */
export function nextPracticeReset(now: Date = new Date()): Date {
  const start = practiceWeekStart(now);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 7));
}

const KEY = "lamppost-practice-v1";

type Stored = PracticeClose & { at: number };
type Store = Record<string, Stored>;

/** The latest review rung each verdict brings the lesson back on: tomorrow, or in three days. */
const REVIEW_BOX: Partial<Record<PracticeVerdict, number>> = { revisit: 0, shaky: 1 };

const OLD_PREFIX = `${CURRICULUM_SLUG}#`;

/** `lessonNumber` is 1-based, as the lesson screens count. */
function idFor(slug: string, lessonNumber: number) {
  const lesson = slug === CURRICULUM_SLUG ? LESSONS[lessonNumber - 1] : undefined;
  return lesson?.id ?? `${slug}#${lessonNumber}`;
}

/** Older builds keyed results `slug#lessonNumber`; moves those to the lesson's id, newest kept. */
function byLessonId(store: Store): Store {
  const moves = Object.keys(store).flatMap((key) => {
    const number = key.startsWith(OLD_PREFIX) ? key.slice(OLD_PREFIX.length) : "";
    const id = /^\d+$/.test(number) ? LESSONS[Number(number) - 1]?.id : undefined;
    return id ? [[key, id] as const] : [];
  });
  if (moves.length === 0) return store;
  const next: Store = { ...store };
  for (const [key, id] of moves) {
    const result = next[key]!;
    delete next[key];
    const kept = next[id];
    if (!kept || kept.at < result.at) next[id] = result;
  }
  return next;
}

const VERDICTS: readonly PracticeVerdict[] = ["solid", "shaky", "revisit"];

const readStored = (value: unknown): Stored | null =>
  isRecord(value) &&
  VERDICTS.includes(value["verdict"] as PracticeVerdict) &&
  typeof value["remembered"] === "string" &&
  typeof value["at"] === "number"
    ? {
        verdict: value["verdict"] as PracticeVerdict,
        remembered: value["remembered"],
        connectionMade: value["connectionMade"] === true,
        at: value["at"],
      }
    : null;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const parsed = recordOf(readJson(KEY), readStored);
    const store = byLessonId(parsed);
    if (store !== parsed) {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(store));
      } catch {
        /* the moved copy is still returned */
      }
    }
    return store;
  } catch {
    return {};
  }
}

export function getPracticeResult(slug: string, lessonIndex: number): Stored | undefined {
  return readStore()[idFor(slug, lessonIndex)];
}

export function savePracticeResult(slug: string, lessonIndex: number, close: PracticeClose) {
  if (typeof window === "undefined") return;
  const id = idFor(slug, lessonIndex);
  try {
    const next: Store = { ...readStore(), [id]: { ...close, at: Date.now() } };
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  const box = REVIEW_BOX[close.verdict];
  if (box !== undefined && slug === CURRICULUM_SLUG) reviewLessonWithin(id, box);
}

export const VERDICT_COPY: Record<PracticeVerdict, { label: string; blurb: string }> = {
  solid: { label: "Solid", blurb: "You explained this in your own words. It'll come back later." },
  shaky: { label: "Shaky", blurb: "Mostly there. Lamppost will bring this back a little sooner." },
  revisit: { label: "Worth another look", blurb: "This one comes back tomorrow while it's fresh." },
};
