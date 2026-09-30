import { argumentXpFor } from "./exercises";
import { dayKey, shiftDay } from "./days";
import { FREEZE_COST, MAX_FREEZES, advanceStreak, effectiveStreak } from "./streak";
import type { ChestRecord } from "./rewards";

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
  /** Spendable gems: earned plus granted, minus spent. */
  gems: number;
  /** Lifetime gems spent. */
  gemsSpent: number;
  /**
   * Lifetime gems the SERVER has handed out (reward chests opened while signed in).
   * Lifetime earned on this device is `gems + gemsSpent - gemsGranted`, which is what
   * a sync tells the account; grants are the account's to report, not the device's.
   */
  gemsGranted: number;
  /** Hint tokens held: each takes a hint without the half-XP cost. */
  hintTokens: number;
  /** Ids of the companion cosmetics unlocked with gems. */
  cosmetics: string[];
  /** Reward chests opened today (`day` is the local day the count belongs to). */
  chests: { day: string | null; opened: number };
  /** The last chests opened, newest first. */
  chestHistory: ChestRecord[];
  /** Monday-start week -> XP earned on this device that week. Kept for the last few weeks. */
  weeklyXp: Record<string, number>;
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
  /**
   * The lessons finished, by 0-based index, in any order (every unit is open from day one).
   * `null` is how a save from before this existed reads: the first `completed` lessons.
   * `courses[slug].completed` is always the number of these.
   */
  doneLessons: number[] | null;
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
  gemsSpent: 0,
  gemsGranted: 0,
  hintTokens: 0,
  cosmetics: [],
  chests: { day: null, opened: 0 },
  chestHistory: [],
  weeklyXp: {},
  xp: 0,
  lastActiveDay: null,
  history: {},
  dailyGoal: 3,
  celebration: null,
  courses: {},
  doneLessons: null,
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

/** Lesson indexes finished, sorted. Older saves only kept a count, read as the first lessons. */
export function doneLessonIndexes(
  state: Pick<ProgressState, "courses" | "doneLessons">,
  slug: string,
): number[] {
  if (state.doneLessons) return [...state.doneLessons].sort((x, y) => x - y);
  const count = state.courses[slug]?.completed ?? 0;
  return Array.from({ length: count }, (_, i) => i);
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
  const before = doneLessonIndexes(prev, slug);
  if (before.includes(index)) return prev;
  const doneLessons = [...before, index].sort((x, y) => x - y);
  const completed = doneLessons.length;

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
    doneLessons,
  };
}

/**
 * Marks the first `count` lessons as already known (added to any already finished) — used by the optional
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
  const before = doneLessonIndexes(prev, slug);
  const known = new Set(before);
  for (let i = 0; i < Math.min(count, total); i++) known.add(i);
  if (known.size === before.length) return prev;
  const doneLessons = [...known].sort((x, y) => x - y);
  return {
    ...prev,
    courses: {
      ...prev.courses,
      [slug]: { ...existing, topic, total, completed: doneLessons.length },
    },
    doneLessons,
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

/** Lifetime gems this device has earned: what a sync tells the account. */
export const gemsEarned = (state: Pick<ProgressState, "gems" | "gemsSpent" | "gemsGranted">) =>
  state.gems + state.gemsSpent - state.gemsGranted;

/** Whether a freeze can be bought right now (enough gems, room to hold another). */
export const canBuyFreeze = (state: Pick<ProgressState, "gems" | "freezes">) =>
  state.gems >= FREEZE_COST && state.freezes < MAX_FREEZES;

/**
 * Buy one freeze with gems, capped so it can't be stockpiled. This is the
 * signed-out path: a guest's gems only exist on the device, so the device is the
 * only place the purchase can happen. A signed-in learner buys on the server (see
 * wallet.functions.ts) and the result is folded in by `applyServerPurchase`.
 */
export function applyBuyFreeze(prev: ProgressState): ProgressState {
  return canBuyFreeze(prev)
    ? {
        ...prev,
        gems: prev.gems - FREEZE_COST,
        gemsSpent: prev.gemsSpent + FREEZE_COST,
        freezes: prev.freezes + 1,
      }
    : prev;
}

/**
 * The account's lifetime spend and lifetime server grants, as the server reports
 * them. `granted` is left out by replies that don't carry it.
 */
export type ServerWallet = { spent: number; granted?: number };

/**
 * Takes the account's lifetime spend (and grants) as the truth, so the balance shown
 * is what the server would let the learner spend. Both only ever move up: an older
 * reply can't refund gems or take a grant back.
 */
export function adoptWallet(prev: ProgressState, wallet: ServerWallet): ProgressState {
  if (!Number.isFinite(wallet.spent)) return prev;
  const spent = Math.max(prev.gemsSpent, wallet.spent);
  const granted =
    typeof wallet.granted === "number" && Number.isFinite(wallet.granted)
      ? Math.max(prev.gemsGranted, wallet.granted)
      : prev.gemsGranted;
  if (spent === prev.gemsSpent && granted === prev.gemsGranted) return prev;
  const earned = gemsEarned(prev);
  return {
    ...prev,
    gemsSpent: spent,
    gemsGranted: granted,
    gems: Math.max(earned + granted - spent, 0),
  };
}

/** A freeze the server sold: the gems are gone on the account, and the freeze is held here. */
export function applyServerPurchase(prev: ProgressState, wallet: ServerWallet): ProgressState {
  const adopted = adoptWallet(prev, wallet);
  return prev.freezes >= MAX_FREEZES ? adopted : { ...adopted, freezes: adopted.freezes + 1 };
}

/** The account's stored numbers, as returned by getMyProfile. */
export type AccountProgress = {
  totalXp: number;
  gems: number;
  /** Lifetime gems the account has earned, been granted by the server, and spent. */
  gemsEarned: number;
  gemsGranted: number;
  gemsSpent: number;
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

  // Earned and spent each only ever rise; the balance is whatever is left.
  const earned = Math.max(gemsEarned(prev), account.gemsEarned);
  const spent = Math.max(prev.gemsSpent, account.gemsSpent);
  const granted = Math.max(prev.gemsGranted, account.gemsGranted);

  const next: ProgressState = {
    ...prev,
    xp: Math.max(prev.xp, account.totalXp),
    gems: Math.max(earned + granted - spent, 0),
    gemsSpent: spent,
    gemsGranted: granted,
    longestStreak: Math.max(prev.longestStreak, account.longestStreak),
    streak: remoteIsFresher ? Math.max(account.currentStreak, 0) : prev.streak,
    lastActiveDay: remoteIsFresher ? remoteDay : localDay,
  };

  const unchanged =
    next.xp === prev.xp &&
    next.gems === prev.gems &&
    next.gemsSpent === prev.gemsSpent &&
    next.gemsGranted === prev.gemsGranted &&
    next.longestStreak === prev.longestStreak &&
    next.streak === prev.streak &&
    next.lastActiveDay === prev.lastActiveDay;
  return unchanged ? prev : next;
}
