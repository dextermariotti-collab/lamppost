import { isDayKey } from "./days";
import type { ExerciseAttempt } from "./exercise-store";
import {
  EXERCISE_KINDS,
  RUBRIC_CRITERIA,
  type ExerciseKind,
  type RubricCriterion,
} from "./exercises";
import type { WrittenScore } from "./mastery";
import type { SkillRating } from "./rating";
import type { DrillItem } from "./review-drills";

/**
 * The learning state that follows an account across devices: the review queue, skill ratings,
 * drill attempts (accuracy and calibration on the Skills screen) and graded writing. It is one
 * document per account, merged the same way on the device and on the server, so two devices
 * that each sync end up with the same reviews and the same skills.
 *
 * Pure: no storage, no network. `boundLearningState` is what the server believes of a device's
 * claim (known lessons only, values in range, sizes capped); `mergeLearningState` combines two
 * copies and gives the same answer whichever comes first.
 */

export const LEARNING_STATE_VERSION = 1;

export type LearningState = {
  v: typeof LEARNING_STATE_VERSION;
  reviews: Record<string, DrillItem>;
  ratings: Record<string, SkillRating>;
  attempts: Record<string, ExerciseAttempt>;
  written: WrittenScore[];
};

export const EMPTY_LEARNING_STATE: LearningState = {
  v: LEARNING_STATE_VERSION,
  reviews: {},
  ratings: {},
  attempts: {},
  written: [],
};

export const LEARNING_LIMITS = {
  reviews: 600,
  ratings: 200,
  attempts: 4000,
  written: 40,
  /** Variant numbers remembered per review and per skill, as on the device. */
  reviewSeen: 20,
  ratingSeen: 60,
  /** A saved answer longer than this (as JSON) is kept without its answer. */
  answerChars: 1500,
  /** The most a sync request may carry, as JSON. */
  requestChars: 1_500_000,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BOX = 6;
const REASONS: readonly DrillItem["reason"][] = ["missed", "unsure", "practice", "keep"];
const KINDS: ReadonlySet<string> = new Set(EXERCISE_KINDS);
const CRITERIA: ReadonlySet<string> = new Set(RUBRIC_CRITERIA);

type Bounds = { known: ReadonlySet<string>; now: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function int(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(Math.round(value), min, max)
    : null;
}

/** A time stamp: never after the server's now (a fast clock can't win every merge). */
function stamp(value: unknown, now: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.min(Math.round(value), now + DAY_MS)
    : null;
}

function variants(value: unknown, keep: number): number[] {
  if (!Array.isArray(value)) return [];
  const out = value.filter(
    (n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n < 1_000_000,
  );
  return [...new Set(out)].slice(-keep);
}

/** Keeps the `cap` most recent entries of a record, in key order so the result is stable. */
function newest<T>(entries: [string, T][], cap: number, at: (item: T) => number) {
  const kept =
    entries.length > cap
      ? [...entries].sort(([ka, a], [kb, b]) => at(b) - at(a) || ka.localeCompare(kb)).slice(0, cap)
      : entries;
  return Object.fromEntries(kept.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

function boundReview(key: string, raw: unknown, { known, now }: Bounds): DrillItem | null {
  if (!isRecord(raw)) return null;
  const { lessonId, kind, due, reason } = raw;
  if (typeof lessonId !== "string" || !known.has(lessonId)) return null;
  if (typeof kind !== "string" || !KINDS.has(kind) || key !== `${lessonId}#${kind}`) return null;
  const box = int(raw["box"], 0, MAX_BOX);
  const at = stamp(raw["at"], now);
  if (box === null || at === null || !isDayKey(due)) return null;
  return {
    lessonId,
    kind: kind as ExerciseKind,
    box,
    due,
    seen: variants(raw["seen"], LEARNING_LIMITS.reviewSeen),
    reason: REASONS.includes(reason as DrillItem["reason"])
      ? (reason as DrillItem["reason"])
      : "missed",
    at,
  };
}

function boundRating(raw: unknown, { now }: Bounds): SkillRating | null {
  if (!isRecord(raw)) return null;
  const rating = int(raw["rating"], 700, 1400);
  const answered = int(raw["answered"], 0, 1_000_000);
  const run = int(raw["run"], -10_000, 10_000);
  const lastAt = stamp(raw["lastAt"], now);
  if (rating === null || answered === null || run === null || lastAt === null) return null;
  return { rating, answered, run, lastAt, seen: variants(raw["seen"], LEARNING_LIMITS.ratingSeen) };
}

function boundAttempt(key: string, raw: unknown, { known, now }: Bounds): ExerciseAttempt | null {
  if (!isRecord(raw)) return null;
  const hash = key.lastIndexOf("#");
  const lessonId = key.slice(0, hash);
  const index = key.slice(hash + 1);
  if (hash < 0 || !known.has(lessonId) || !/^(0|[1-9]\d?|1\d\d)$/.test(index)) return null;
  const score = raw["score"];
  const at = stamp(raw["at"], now);
  if (typeof score !== "number" || !Number.isFinite(score) || at === null) return null;
  let answer: unknown = raw["answer"] ?? null;
  try {
    if (JSON.stringify(answer).length > LEARNING_LIMITS.answerChars) answer = null;
  } catch {
    answer = null;
  }
  return { answer, score: clamp(score, 0, 1), at };
}

function boundWritten(raw: unknown, { known, now }: Bounds): WrittenScore | null {
  if (!isRecord(raw)) return null;
  const { lessonId, total, max } = raw;
  const at = stamp(raw["at"], now);
  if (typeof lessonId !== "string" || !known.has(lessonId) || at === null) return null;
  if (typeof total !== "number" || typeof max !== "number") return null;
  if (!Number.isFinite(total) || !Number.isFinite(max) || max <= 0 || max > 100) return null;
  const scores: Partial<Record<RubricCriterion, number>> = {};
  if (isRecord(raw["scores"])) {
    for (const [criterion, value] of Object.entries(raw["scores"])) {
      const score = int(value, 1, 4);
      if (CRITERIA.has(criterion) && score !== null) scores[criterion as RubricCriterion] = score;
    }
  }
  return {
    lessonId,
    total: clamp(total, 0, max),
    max,
    at,
    ...(Object.keys(scores).length > 0 ? { scores } : {}),
  };
}

const writtenId = (score: WrittenScore) => `${score.lessonId}@${score.at}`;

/**
 * What can be believed of a copy of the learning state, from a device or from storage: entries
 * for lessons that don't exist or with values out of range are dropped, and each part is capped
 * at its most recent entries. The result is also the canonical form two copies are compared in.
 */
export function boundLearningState(raw: unknown, bounds: Bounds): LearningState {
  const state = isRecord(raw) ? raw : {};
  const part = (name: string) => (isRecord(state[name]) ? Object.entries(state[name]) : []);

  const reviews = part("reviews").flatMap(([key, item]) => {
    const kept = boundReview(key, item, bounds);
    return kept ? [[key, kept] as [string, DrillItem]] : [];
  });
  const ratings = part("ratings").flatMap(([key, item]) => {
    const kept = bounds.known.has(key) ? boundRating(item, bounds) : null;
    return kept ? [[key, kept] as [string, SkillRating]] : [];
  });
  const attempts = part("attempts").flatMap(([key, item]) => {
    const kept = boundAttempt(key, item, bounds);
    return kept ? [[key, kept] as [string, ExerciseAttempt]] : [];
  });
  const written = new Map<string, WrittenScore>();
  for (const item of Array.isArray(state["written"]) ? state["written"] : []) {
    const kept = boundWritten(item, bounds);
    if (kept) written.set(writtenId(kept), kept);
  }

  return {
    v: LEARNING_STATE_VERSION,
    reviews: newest(reviews, LEARNING_LIMITS.reviews, (item) => item.at),
    ratings: newest(ratings, LEARNING_LIMITS.ratings, (item) => item.lastAt),
    attempts: newest(attempts, LEARNING_LIMITS.attempts, (item) => item.at),
    written: [...written.values()]
      .sort((a, b) => a.at - b.at || writtenId(a).localeCompare(writtenId(b)))
      .slice(-LEARNING_LIMITS.written),
  };
}

/** Ties go to the copy that sorts later, so either order of merging picks the same one. */
const later = <T>(a: T, b: T, at: (item: T) => number) =>
  at(a) !== at(b) ? (at(a) > at(b) ? a : b) : JSON.stringify(a) >= JSON.stringify(b) ? a : b;

function mergeRecords<T>(
  a: Record<string, T>,
  b: Record<string, T>,
  pick: (x: T, y: T) => T,
): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [key, item] of Object.entries(b)) {
    const mine = out[key];
    out[key] = mine === undefined ? item : pick(mine, item);
  }
  return out;
}

const unionSeen = (a: number[], b: number[], keep: number) =>
  [...new Set([...a, ...b])].sort((x, y) => x - y).slice(-keep);

/**
 * Two copies of the learning state as one:
 * - a review or a skill rating is the one changed most recently, remembering the variants
 *   either copy has already served;
 * - a drill attempt is the first one made (a lesson replayed never replaces its first answer);
 * - graded writing is every score either copy holds, the most recent kept.
 */
export function mergeLearningState(a: LearningState, b: LearningState): LearningState {
  const reviews = mergeRecords(a.reviews, b.reviews, (x, y) => ({
    ...later(x, y, (item) => item.at),
    seen: unionSeen(x.seen, y.seen, LEARNING_LIMITS.reviewSeen),
  }));
  const ratings = mergeRecords(a.ratings, b.ratings, (x, y) => ({
    ...later(x, y, (item) => item.lastAt),
    seen: unionSeen(x.seen, y.seen, LEARNING_LIMITS.ratingSeen),
  }));
  const attempts = mergeRecords(a.attempts, b.attempts, (x, y) => later(x, y, (item) => -item.at));
  const written = new Map<string, WrittenScore>();
  for (const score of [...a.written, ...b.written]) {
    const id = writtenId(score);
    const held = written.get(id);
    written.set(id, held ? later(held, score, () => 0) : score);
  }
  return {
    v: LEARNING_STATE_VERSION,
    reviews,
    ratings,
    attempts,
    written: [...written.values()],
  };
}

/** A string that is equal for two copies holding the same learning state. */
export function learningSignature(state: LearningState, bounds: Bounds): string {
  return JSON.stringify(boundLearningState(state, bounds));
}
