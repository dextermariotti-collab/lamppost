import { useEffect, useState } from "react";
import { CURRICULUM_SLUG, LESSONS } from "./curriculum";
import { readAttemptStore } from "./exercise-store";
import { writtenTrend } from "./mastery";
import { dayKey } from "./days";
import { doneLessonIndexes, type ProgressState } from "./progress-core";

/**
 * Tiered achievements, computed entirely from what the learner actually did.
 *
 * Honest rewards: every badge states its real requirement, progress toward the
 * next tier is always visible, and nothing unlocks on a hidden roll.
 */

const SEEN_KEY = "lamppost-badges-v1";
export const BADGE_EVENT = "lamppost-badge-change";

export type BadgeTier = "bronze" | "silver" | "gold";

export type BadgeDef = {
  code: string;
  name: string;
  /** One-line description of what earns it. */
  description: string;
  icon: string;
  unit: string;
  /** Thresholds for bronze, silver, gold. */
  tiers: [number, number, number];
};

export type BadgeState = BadgeDef & {
  value: number;
  /** null until the bronze threshold is met. */
  tier: BadgeTier | null;
  /** Threshold for the next tier, or null at gold. */
  nextAt: number | null;
  /** 0..100 toward the next tier (100 at gold). */
  pct: number;
};

export const BADGES: BadgeDef[] = [
  {
    code: "flawless",
    name: "Flawless",
    description: "Finish a lesson with every drill right",
    icon: "target",
    unit: "perfect lessons",
    tiers: [1, 5, 15],
  },
  {
    code: "calibrated",
    name: "Calibrated",
    description: "Confidence calls that matched the outcome",
    icon: "gauge",
    unit: "accurate calls",
    tiers: [5, 15, 40],
  },
  {
    code: "fallacy_hunter",
    name: "Fallacy Hunter",
    description: "Drills answered in Logical fallacies",
    icon: "search",
    unit: "fallacy drills",
    tiers: [10, 25, 50],
  },
  {
    code: "iron_streak",
    name: "Iron Streak",
    description: "Your longest run of daily practice",
    icon: "flame",
    unit: "days",
    tiers: [7, 30, 100],
  },
  {
    code: "steelman",
    name: "Steelman",
    description: "Written answers scoring near the top of the rubric",
    icon: "shield",
    unit: "strong answers",
    tiers: [1, 3, 8],
  },
  {
    code: "early_bird",
    name: "Early Bird",
    description: "Days you practiced between 5 and 9 a.m.",
    icon: "sunrise",
    unit: "early days",
    tiers: [1, 5, 15],
  },
  {
    code: "comeback",
    name: "Comeback",
    description: "Times you came back after missing a day",
    icon: "rotate",
    unit: "comebacks",
    tiers: [1, 3, 10],
  },
];

/** The early-morning window, in local hours: from 5:00 up to, not including, 9:00. */
const EARLY_FROM_HOUR = 5;
const EARLY_UNTIL_HOUR = 9;
const isEarly = (at: Date) => at.getHours() >= EARLY_FROM_HOUR && at.getHours() < EARLY_UNTIL_HOUR;

const FALLACY_LESSONS = new Set(
  LESSONS.filter((lesson) => lesson.unitId === "fallacies").map((lesson) => lesson.id),
);

function tierFor(def: BadgeDef, value: number): BadgeState {
  const [bronze, silver, gold] = def.tiers;
  const tier: BadgeTier | null =
    value >= gold ? "gold" : value >= silver ? "silver" : value >= bronze ? "bronze" : null;
  const nextAt = value >= gold ? null : value >= silver ? gold : value >= bronze ? silver : bronze;
  const floor = tier === "silver" ? silver : tier === "bronze" ? bronze : 0;
  const pct =
    nextAt === null
      ? 100
      : Math.max(0, Math.min(100, Math.round(((value - floor) / (nextAt - floor)) * 100)));
  return { ...def, value, tier, nextAt, pct };
}

/** Counts every badge's real metric from local history. */
export function computeBadges(state: ProgressState): BadgeState[] {
  const store = readAttemptStore();
  const entries = Object.entries(store);

  // Per-lesson perfect runs: a finished lesson with at least three drills answered, none missed.
  const byLesson = new Map<string, { total: number; right: number }>();
  let fallacyDrills = 0;
  let calibrated = 0;
  const earlyDays = new Set<string>();

  for (const [key, attempt] of entries) {
    const lessonId = key.split("#")[0] ?? "";
    const row = byLesson.get(lessonId) ?? { total: 0, right: 0 };
    row.total += 1;
    if (attempt.score >= 1) row.right += 1;
    byLesson.set(lessonId, row);

    if (FALLACY_LESSONS.has(lessonId)) fallacyDrills += 1;

    const answer = attempt.answer as { confidence?: number } | null;
    const confidence = answer && typeof answer.confidence === "number" ? answer.confidence : null;
    if (confidence !== null) {
      const correct = attempt.score >= 1;
      if ((confidence >= 70 && correct) || (confidence <= 30 && !correct)) calibrated += 1;
    }

    // Late at night isn't early: 1:40 a.m. belongs to the night before, not to the morning.
    const at = new Date(attempt.at);
    if (isEarly(at)) earlyDays.add(dayKey(at));
  }

  const finished = new Set([
    ...(state.doneLessonIds ?? []),
    ...doneLessonIndexes(state, CURRICULUM_SLUG).flatMap((i) => LESSONS[i]?.id ?? []),
  ]);
  const flawless = [...byLesson.entries()].filter(
    ([lessonId, row]) => finished.has(lessonId) && row.total >= 3 && row.right === row.total,
  ).length;

  const steelman = writtenTrend().points.filter((point) => point.pct >= 90).length;

  // A comeback is any active day that follows at least one missed day.
  const activeDays = Object.entries(state.history)
    .filter(([, count]) => count > 0)
    .map(([day]) => day)
    .sort();
  let comebacks = 0;
  for (let i = 1; i < activeDays.length; i += 1) {
    const prev = new Date(`${activeDays[i - 1]}T00:00:00Z`).getTime();
    const curr = new Date(`${activeDays[i]}T00:00:00Z`).getTime();
    if (Math.round((curr - prev) / 86_400_000) > 1) comebacks += 1;
  }

  const values: Record<string, number> = {
    flawless,
    calibrated,
    fallacy_hunter: fallacyDrills,
    iron_streak: Math.max(state.longestStreak, state.streak),
    steelman,
    early_bird: earlyDays.size,
    comeback: comebacks,
  };

  return BADGES.map((def) => tierFor(def, values[def.code] ?? 0));
}

/* ------------------------------ unlock memory ------------------------------ */

const RANK: Record<BadgeTier, number> = { bronze: 1, silver: 2, gold: 3 };

/** The highest tier shown for a badge and when it was earned. Older saves kept only the tier. */
type Seen = { tier: BadgeTier; at: number | null };
type StoredSeen = Record<string, BadgeTier | { tier: BadgeTier; at?: number | null }>;

const isTier = (value: unknown): value is BadgeTier =>
  value === "bronze" || value === "silver" || value === "gold";

function readStoredSeen(): StoredSeen {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredSeen) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readSeen(): Record<string, Seen> {
  const seen: Record<string, Seen> = {};
  for (const [code, entry] of Object.entries(readStoredSeen())) {
    if (isTier(entry)) seen[code] = { tier: entry, at: null };
    else if (entry && typeof entry === "object" && isTier(entry.tier)) {
      seen[code] = { tier: entry.tier, at: typeof entry.at === "number" ? entry.at : null };
    }
  }
  return seen;
}

/**
 * Returns badges whose tier is higher than the last tier the learner was shown,
 * and records the new tiers, and when, so a toast fires exactly once per unlock.
 */
export function drainNewUnlocks(badges: BadgeState[], now = Date.now()): BadgeState[] {
  if (typeof window === "undefined") return [];
  const seen = readSeen();
  const fresh = badges.filter(
    (badge) =>
      badge.tier !== null &&
      RANK[badge.tier] > (seen[badge.code] ? RANK[seen[badge.code]!.tier] : 0),
  );
  if (fresh.length === 0) return [];
  const next = { ...readStoredSeen() };
  for (const badge of fresh) if (badge.tier) next[badge.code] = { tier: badge.tier, at: now };
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(BADGE_EVENT));
  } catch {
    /* ignore */
  }
  return fresh;
}

/**
 * The shelf order: earned badges first, the most recently earned (or raised a tier) first, then
 * the ones still to earn in their usual order. A tier earned since the last unlock was recorded
 * counts as the newest; one recorded before times were kept counts as the oldest.
 */
export function earnedFirst(badges: readonly BadgeState[], seen = readSeen()): BadgeState[] {
  const earnedAt = (badge: BadgeState) => {
    const entry = seen[badge.code];
    if (!entry || !badge.tier || RANK[entry.tier] < RANK[badge.tier]) return Infinity;
    return entry.at ?? -Infinity;
  };
  const earned = badges
    .map((badge, i) => ({ badge, i, at: earnedAt(badge) }))
    .filter(({ badge }) => badge.tier !== null)
    .sort((a, b) => (a.at === b.at ? a.i - b.i : b.at > a.at ? 1 : -1))
    .map(({ badge }) => badge);
  return [...earned, ...badges.filter((badge) => badge.tier === null)];
}

/** Marks every currently-earned tier as already seen, without firing toasts. */
export function primeUnlocks(badges: BadgeState[]) {
  drainNewUnlocks(badges);
}

/** Badge list for the profile/progress screens, refreshed after hydration. */
export function useBadges(state: ProgressState) {
  const [badges, setBadges] = useState<BadgeState[] | null>(null);

  useEffect(() => {
    setBadges(computeBadges(state));
  }, [state]);

  return badges;
}
