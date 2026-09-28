import { argumentXpFor } from "./exercises";
import { dayKey, shiftDay } from "./days";
import { FREEZE_COST, MAX_FREEZES, advanceStreak, effectiveStreak } from "./streak";

/**
 * The pure half of the progress store: state shape, defaults, and every state
 * transition as a plain function. `progress.ts` wires these to localStorage and
 * React; keeping them free of both is what lets the streak and day-boundary
 * rules be unit-tested.
 */

export type Celebration = {
  kind: "lesson" | "streak" | "mastery";
  title: string;
  detail: string;
  emoji: string;
  bonusXp?: number | undefined;
  big?: boolean | undefined;
};

export type ProgressState = {
  streak: number;
  longestStreak: number;
  gems: number;
  xp: number;
  /** YYYY-MM-DD of the last day a lesson was completed */
  lastActiveDay: string | null;
  /** YYYY-MM-DD -> lessons completed that day */
  history: Record<string, number>;
  /** lessons the user aims to complete each day */
  dailyGoal: number;
  /** queued celebration, consumed by the progress screen */
  celebration: Celebration | null;
  /** slug -> number of lessons completed */
  courses: Record<
    string,
    { topic: string; completed: number; total: number; lastActivityAt?: number }
  >;
  /** unused streak freezes held */
  freezes: number;
  /** YYYY-MM-DD days a freeze covered, so they're only spent once */
  freezeLog: string[];
  /** set when the last visit was rescued by a freeze, consumed by the UI */
  freezeSaved: { days: number; day: string } | null;
  /** 1 = day keys were UTC days (legacy); 2 = the device's local calendar days */
  dayKeyVersion: number;
};

/** The day-key scheme this build writes. See progress-migrate.ts for the upgrade from 1. */
export const DAY_KEY_VERSION = 2;

export const DEFAULT_STATE: ProgressState = {
  streak: 0,
  longestStreak: 0,
  gems: 0,
  xp: 0,
  lastActiveDay: null,
  history: {},
  dailyGoal: 3,
  celebration: null,
  courses: {},
  freezes: 1,
  freezeLog: [],
  freezeSaved: null,
  dayKeyVersion: DAY_KEY_VERSION,
};

export { FREEZE_COST, MAX_FREEZES, effectiveStreak };

const STREAK_MILESTONES = [3, 7, 30, 100, 365];

const SURPRISES = [
  "Bonus XP — you showed up when it counted.",
  "Momentum bonus unlocked.",
  "Lucky drop: extra XP for a clean run.",
  "Deep-focus bonus applied.",
];

export type Tier = { name: string; emoji: string; min: number };

export const TIERS: Tier[] = [
  { name: "Novice", emoji: "🌱", min: 0 },
  { name: "Learning", emoji: "📘", min: 25 },
  { name: "Proficient", emoji: "🎯", min: 60 },
  { name: "Mastered", emoji: "👑", min: 100 },
];

export function tierFor(pct: number): Tier {
  return [...TIERS].reverse().find((t) => pct >= t.min) ?? TIERS[0]!;
}

export const LEAGUES: { name: string; min: number }[] = [
  { name: "Novice", min: 0 },
  { name: "Learning", min: 250 },
  { name: "Proficient", min: 1000 },
  { name: "Mastered", min: 2500 },
];

/** League tier derived from lifetime XP, reusing the mastery tier names. */
export function leagueFor(xp: number) {
  return [...LEAGUES].reverse().find((l) => xp >= l.min) ?? LEAGUES[0]!;
}

/** Lessons done today, and how the week compares to previous weeks. */
export function deriveInsights(state: ProgressState, now = new Date()) {
  const today = dayKey(now);
  const doneToday = state.history[today] ?? 0;
  const weekOf = (offset: number) =>
    Array.from(
      { length: 7 },
      (_, i) => state.history[shiftDay(today, -(i + offset * 7))] ?? 0,
    ).reduce((a, b) => a + b, 0);
  const thisWeek = weekOf(0);
  const past = [1, 2, 3, 4, 5, 6, 7, 8].map(weekOf).filter((v) => v > 0);
  const beaten = past.filter((v) => thisWeek > v).length;
  const percentile = past.length >= 2 ? Math.round((beaten / past.length) * 100) : null;
  const hoursLeft = 24 - now.getHours();
  return {
    doneToday,
    thisWeek,
    percentile,
    hoursLeft,
    atRisk: doneToday === 0 && effectiveStreak(state, today) > 0 && hoursLeft <= 8,
  };
}

/** Applies a finished lesson. Returns `prev` untouched when nothing new was earned. */
export function applyLessonComplete(
  prev: ProgressState,
  lesson: { slug: string; topic: string; index: number; total: number },
  today: string,
  now = Date.now(),
  random: () => number = Math.random,
): ProgressState {
  const { slug, topic, index, total } = lesson;
  const existing = prev.courses[slug] ?? { topic, completed: 0, total };
  const completed = Math.max(existing.completed, index + 1);
  const gained = completed > existing.completed;
  if (!gained) return prev;

  const history = { ...prev.history, [today]: (prev.history[today] ?? 0) + 1 };
  const advanced = advanceStreak(prev, today);
  const streak = advanced.streak;
  const longestStreak = Math.max(prev.longestStreak, streak);

  const bonusXp = random() < 0.25 ? 25 + Math.floor(random() * 4) * 25 : undefined;
  const pct = Math.round((completed / total) * 100);
  const hitStreak =
    (prev.lastActiveDay === null || prev.lastActiveDay < today) &&
    STREAK_MILESTONES.includes(streak);

  const celebration: Celebration = hitStreak
    ? {
        kind: "streak",
        title: `${streak}-day streak!`,
        detail: `You've shown up ${streak} days in a row. That's how mastery compounds.`,
        emoji: "🔥",
        big: true,
        bonusXp,
      }
    : pct === 100
      ? {
          kind: "mastery",
          title: `${topic} mastered`,
          detail: "Every lesson complete. Time to pick your next frontier.",
          emoji: "👑",
          big: true,
          bonusXp,
        }
      : {
          kind: "lesson",
          title: "Lesson complete",
          detail:
            bonusXp !== undefined
              ? SURPRISES[Math.floor(random() * SURPRISES.length)]!
              : "+50 XP · one step closer.",
          emoji: "✅",
          bonusXp,
        };

  return {
    ...prev,
    xp: prev.xp + 50 + (bonusXp ?? 0),
    gems: prev.gems + 10,
    streak,
    longestStreak,
    freezes: advanced.freezes,
    freezeLog: advanced.freezeLog,
    freezeSaved: advanced.freezeSaved,
    lastActiveDay: today,
    history,
    celebration,
    courses: {
      ...prev.courses,
      [slug]: { topic, completed, total, lastActivityAt: now },
    },
  };
}

/**
 * Marks the first `count` lessons as already known — used by the optional
 * onboarding placement check. No XP, no streak: nothing was practised.
 */
export function applyUnlockLessons(
  prev: ProgressState,
  slug: string,
  topic: string,
  count: number,
  total: number,
): ProgressState {
  const existing = prev.courses[slug] ?? { topic, completed: 0, total };
  const completed = Math.max(existing.completed, Math.min(count, total));
  if (completed === existing.completed) return prev;
  return {
    ...prev,
    courses: { ...prev.courses, [slug]: { ...existing, topic, total, completed } },
  };
}

/** A graded spaced-repetition answer: keeps the streak alive and pays out. */
export function applyReview(prev: ProgressState, correct: boolean, today: string): ProgressState {
  const advanced = advanceStreak(prev, today);
  const streak = advanced.streak;
  return {
    ...prev,
    xp: prev.xp + (correct ? 20 : 5),
    gems: prev.gems + (correct ? 2 : 0),
    streak,
    longestStreak: Math.max(prev.longestStreak, streak),
    freezes: advanced.freezes,
    freezeLog: advanced.freezeLog,
    freezeSaved: advanced.freezeSaved,
    lastActiveDay: today,
    history: { ...prev.history, [today]: (prev.history[today] ?? 0) + 1 },
  };
}

/**
 * An explain-it-back session. XP here is paid for the explanation, and the
 * bonus specifically for linking the idea to an earlier one — the connections
 * engine is the moat, so that is what the reward points at.
 */
export function applyPractice(
  prev: ProgressState,
  verdict: "solid" | "shaky" | "revisit",
  connectionMade: boolean,
): ProgressState {
  const base = verdict === "solid" ? 30 : verdict === "shaky" ? 20 : 10;
  const bonus = connectionMade ? 40 : 0;
  return {
    ...prev,
    xp: prev.xp + base + bonus,
    gems: prev.gems + (connectionMade ? 5 : 0),
  };
}

/** XP per reasoning exercise, scaled by how much of it was right. */
export function applyExercise(prev: ProgressState, score: number, bonus = 0): ProgressState {
  const clamped = Math.min(Math.max(score, 0), 1);
  return {
    ...prev,
    xp: prev.xp + Math.max(5, Math.round(25 * clamped)) + Math.max(0, bonus),
    gems: prev.gems + (clamped === 1 ? 2 : 0),
  };
}

/** The written argument pays by rubric score, not by length. */
export function applyArgument(prev: ProgressState, total: number, max: number): ProgressState {
  return {
    ...prev,
    xp: prev.xp + argumentXpFor(total, max),
    gems: prev.gems + (total / Math.max(max, 1) >= 0.75 ? 5 : 1),
  };
}

/** Buy one freeze with gems, capped so it can't be stockpiled. */
export function applyBuyFreeze(prev: ProgressState): ProgressState {
  return prev.gems < FREEZE_COST || prev.freezes >= MAX_FREEZES
    ? prev
    : { ...prev, gems: prev.gems - FREEZE_COST, freezes: prev.freezes + 1 };
}

/** The account's stored numbers, as returned by getMyProfile. */
export type AccountProgress = {
  totalXp: number;
  gems: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDay: string | null;
};

/**
 * Folds the signed-in account's numbers into this device's, so a new device
 * isn't blank. XP, gems and the longest streak only ever go up. The account's
 * *current* streak is only adopted when the account was active more recently
 * than this device, or on the same day with a longer run — a stale number from
 * an old sync must never overrule a fresher local streak (that is how one screen
 * could show 1 while another showed 2).
 */
export function mergeAccountProgress(
  prev: ProgressState,
  account: AccountProgress,
  today: string,
): ProgressState {
  // A local date can be at most one day ahead of UTC-based "today" bookkeeping.
  const remoteDay =
    account.lastActiveDay && account.lastActiveDay <= shiftDay(today, 1)
      ? account.lastActiveDay
      : null;
  const localDay = prev.lastActiveDay;

  const remoteIsFresher =
    remoteDay !== null &&
    (localDay === null ||
      remoteDay > localDay ||
      (remoteDay === localDay && account.currentStreak > prev.streak));

  const next: ProgressState = {
    ...prev,
    xp: Math.max(prev.xp, account.totalXp),
    gems: Math.max(prev.gems, account.gems),
    longestStreak: Math.max(prev.longestStreak, account.longestStreak),
    streak: remoteIsFresher ? Math.max(account.currentStreak, 0) : prev.streak,
    lastActiveDay: remoteIsFresher ? remoteDay : localDay,
  };

  const unchanged =
    next.xp === prev.xp &&
    next.gems === prev.gems &&
    next.longestStreak === prev.longestStreak &&
    next.streak === prev.streak &&
    next.lastActiveDay === prev.lastActiveDay;
  return unchanged ? prev : next;
}
