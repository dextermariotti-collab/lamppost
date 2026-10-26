/**
 * Skill ratings.
 *
 * Every question answered nudges a simple Elo-style rating for that lesson's skill, weighted by the
 * question's difficulty and the confidence stated. The weakest skills are what reviews reach for
 * first.
 */

const KEY = "lamppost-rating-v1";
export const RATING_EVENT = "lamppost-rating-change";
const EVENT = RATING_EVENT;

/** Rating a learner starts at, and the rating each difficulty band represents. */
export const START_RATING = 1000;
const BAND_RATING: Record<number, number> = { 1: 950, 2: 1050, 3: 1150 };
const K = 26;

export type SkillRating = {
  rating: number;
  answered: number;
  /** Consecutive correct (positive) or missed (negative) run. */
  run: number;
  lastAt: number;
  /** Drill variants served by the retired AI pool; kept so older saves and syncs still read. */
  seen: number[];
};

export type RatingStore = Record<string, SkillRating>;
type Store = RatingStore;

const blank = (): SkillRating => ({
  rating: START_RATING,
  answered: 0,
  run: 0,
  lastAt: 0,
  seen: [],
});

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Store) : {};
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function readRatingStore(): Store {
  return readStore();
}

/** Replaces every rating: used when the account's copy is merged in. */
export function writeRatingStore(store: Store) {
  writeStore(store);
}

/**
 * Records one drill outcome. Confidence, when the drill asked for it, makes a
 * confident miss cost more and a hesitant win pay less.
 */
export function recordDrillOutcome(
  lessonId: string,
  opts: { score: number; difficulty?: number; confidence?: number },
) {
  const store = readStore();
  const current = store[lessonId] ?? blank();
  const score = Math.min(Math.max(opts.score, 0), 1);
  const band = BAND_RATING[opts.difficulty ?? 2] ?? BAND_RATING[2]!;
  const expected = 1 / (1 + Math.pow(10, (band - current.rating) / 200));
  const weight =
    typeof opts.confidence === "number"
      ? 0.8 + (Math.min(Math.max(opts.confidence, 0), 100) / 100) * 0.4
      : 1;
  const rating = Math.round(current.rating + K * weight * (score - expected));
  const correct = score >= 0.999;
  writeStore({
    ...store,
    [lessonId]: {
      ...current,
      rating: Math.min(Math.max(rating, 700), 1400),
      answered: current.answered + 1,
      run: correct ? Math.max(current.run, 0) + 1 : Math.min(current.run, 0) - 1,
      lastAt: Date.now(),
    },
  });
}

/* ------------------------- pooled drills already seen ------------------------- */
