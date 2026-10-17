import { useCallback, useEffect, useState } from "react";
import { LESSONS, lessonIndexOf, unitById } from "./curriculum";

/**
 * Adaptivity.
 *
 * Every drill answered nudges a simple Elo-style rating for that lesson's skill.
 * The rating decides which difficulty band (1-3) of pooled drill gets served
 * next, two right in a row steps up, two misses step down and offer a hint, and
 * the weakest / least-recently-practiced skills are what reviews reach for first.
 */

const KEY = "lamppost-rating-v1";
const EVENT = "lamppost-rating-change";

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
  /** Pooled drill variants already served to this learner. */
  seen: number[];
};

type Store = Record<string, SkillRating>;

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

export function skillRating(lessonId: string): SkillRating {
  return readStore()[lessonId] ?? blank();
}

/** The difficulty band to serve next for this skill. */
export function targetDifficulty(lessonId: string): 1 | 2 | 3 {
  const { rating } = skillRating(lessonId);
  if (rating < 990) return 1;
  if (rating < 1110) return 2;
  return 3;
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

/** Two misses in a row: the learner has earned an easier drill and a hint. */
export function needsHelp(lessonId: string) {
  return skillRating(lessonId).run <= -2;
}

/** Two right in a row: step the difficulty up. */
export function readyToStepUp(lessonId: string) {
  return skillRating(lessonId).run >= 2;
}

/* ------------------------- pooled drills already seen ------------------------- */

export function seenVariants(lessonId: string): number[] {
  return skillRating(lessonId).seen;
}

export function markPoolVariantSeen(lessonId: string, variant: number) {
  const store = readStore();
  const current = store[lessonId] ?? blank();
  if (current.seen.includes(variant)) return;
  writeStore({ ...store, [lessonId]: { ...current, seen: [...current.seen, variant].slice(-60) } });
}

/* ------------------------------ what to practice ------------------------------ */

export type SkillNeed = {
  lessonId: string;
  lessonTitle: string;
  lessonIndex: number;
  unitTitle: string;
  rating: number;
  answered: number;
  daysSince: number | null;
  /** One line explaining why this came up. */
  reason: string;
};

/**
 * Weakest and least-recently-practiced unlocked skills first. Used by reviews and
 * the home "Continue" recommendation.
 */
export function skillsToPractice(done: ReadonlySet<number>): SkillNeed[] {
  const store = readStore();
  const now = Date.now();
  return LESSONS.filter((_, index) => done.has(index))
    .map((lesson) => {
      const row = store[lesson.id] ?? blank();
      const daysSince = row.lastAt ? Math.floor((now - row.lastAt) / 86_400_000) : null;
      const staleness = daysSince === null ? 3 : Math.min(daysSince, 14) / 14;
      const weakness = (1150 - row.rating) / 300;
      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonIndex: lessonIndexOf(lesson.id),
        unitTitle: unitById(lesson.unitId).title,
        rating: row.rating,
        answered: row.answered,
        daysSince,
        reason:
          row.answered === 0
            ? "You haven't drilled this skill yet."
            : row.rating < 980
              ? `This one keeps catching you out — ${lesson.title.toLowerCase()}.`
              : daysSince !== null && daysSince >= 7
                ? `You haven't touched ${lesson.title.toLowerCase()} in ${daysSince} days.`
                : "Keeps a solid skill sharp.",
        score: weakness + staleness,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ score: _score, ...need }) => need);
}

/** Live view of the rating store, for screens that show mastery. */
export function useSkillRatings() {
  const [store, setStore] = useState<Store>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setStore(readStore());
    sync();
    setHydrated(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const record = useCallback(recordDrillOutcome, []);
  return { store, hydrated, record };
}
