import { argumentXpFor } from "./exercises";
import { dayKey, isDayKey, shiftDay } from "./days";
import { MAX_FREEZES, advanceStreak, effectiveStreak } from "./streak";
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
  /**
   * Gems, from the retired reward economy: earned plus granted, minus spent. Nothing earns or
   * spends them any more; the number is kept (and synced) only so an account stays consistent.
   */
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
  /** YYYY-MM-DD of the last day a lesson, review or case was completed */
  lastActiveDay: string | null;
  /**
   * YYYY-MM-DD -> things practiced that day: lessons, review answers and cases. The streak, the
   * calendar and the account's daily activity read this; it is not a count of lessons.
   */
  history: Record<string, number>;
  /** YYYY-MM-DD -> lessons finished that day. The daily goal and every "lessons" label read this. */
  lessonsByDay: Record<string, number>;
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
  /**
   * The lessons finished, by id: what is saved and synced. An index points at a different
   * lesson once one is added or the order changes; an id doesn't. `doneLessons` is derived from
   * these whenever the state is loaded or saved (`loadLessons`, `saveLessons`).
   */
  doneLessonIds: string[] | null;
  /**
   * Lessons the onboarding placement check marked done, by id, that haven't been played since.
   * They count as done on the map, but nothing was studied: playing one still counts as a lesson.
   */
  placedLessonIds: string[];
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
  lessonsByDay: {},
  dailyGoal: 3,
  celebration: null,
  courses: {},
  doneLessons: null,
  doneLessonIds: null,
  placedLessonIds: [],
  freezes: 1,
  freezeLog: [],
  freezeSaved: null,
  dayKeyVersion: DAY_KEY_VERSION,
};

export { MAX_FREEZES, effectiveStreak };

const STREAK_MILESTONES = [3, 7, 30, 100, 365];

/** XP for a finished lesson. */
export const LESSON_XP = 50;

/** XP for one graded review answer. */
export const REVIEW_XP = { correct: 20, wrong: 5 } as const;

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

/**
 * Lessons finished today and in the last seven days, and how the last seven days of practice
 * compare with earlier ones. Lessons come from `lessonsByDay`; practice (and so whether the streak
 * is at risk) from `history`, where a review or a case counts too.
 */
export function deriveInsights(state: ProgressState, now = new Date()) {
  const today = dayKey(now);
  const doneToday = state.lessonsByDay[today] ?? 0;
  const sevenDays = (counts: Record<string, number>, offset: number) =>
    Array.from({ length: 7 }, (_, i) => counts[shiftDay(today, -(i + offset * 7))] ?? 0).reduce(
      (a, b) => a + b,
      0,
    );
  const thisWeek = sevenDays(state.lessonsByDay, 0);
  const practiced = sevenDays(state.history, 0);
  const past = [1, 2, 3, 4, 5, 6, 7, 8]
    .map((offset) => sevenDays(state.history, offset))
    .filter((v) => v > 0);
  const beaten = past.filter((v) => practiced > v).length;
  const percentile = past.length >= 2 ? Math.round((beaten / past.length) * 100) : null;
  const hoursLeft = 24 - now.getHours();
  const practicedToday = (state.history[today] ?? 0) > 0;
  return {
    doneToday,
    thisWeek,
    percentile,
    hoursLeft,
    atRisk: !practicedToday && effectiveStreak(state, today) > 0 && hoursLeft <= 8,
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

type CourseRef = { slug: string; topic: string };

/** Indexes into `order` for the given ids, sorted; ids not in `order` are skipped. */
function indexesOf(ids: readonly string[], order: readonly string[]): number[] {
  const position = new Map(order.map((id, i) => [id, i]));
  return ids
    .flatMap((id) => {
      const i = position.get(id);
      return i === undefined ? [] : [i];
    })
    .sort((x, y) => x - y);
}

function withLessons(
  state: ProgressState,
  ids: string[],
  order: readonly string[],
  course: CourseRef,
): ProgressState {
  const doneLessons = indexesOf(ids, order);
  const existing = state.courses[course.slug];
  const courses =
    existing || doneLessons.length > 0
      ? {
          ...state.courses,
          [course.slug]: {
            ...(existing ?? { topic: course.topic }),
            total: order.length,
            completed: doneLessons.length,
          },
        }
      : state.courses;
  return { ...state, doneLessonIds: ids, doneLessons, courses };
}

/**
 * Finished lessons as loaded: from the saved ids when there are any (their saved indexes may be
 * from an older lesson order, so they're ignored), otherwise from an older save's indexes or
 * count. `order` is today's lesson ids in curriculum order.
 */
export function loadLessons(
  state: ProgressState,
  order: readonly string[],
  course: CourseRef,
): ProgressState {
  const ids = state.doneLessonIds
    ? [...new Set(state.doneLessonIds)]
    : doneLessonIndexes(state, course.slug).flatMap((i) => (order[i] ? [order[i]] : []));
  return withLessons(state, ids, order, course);
}

/**
 * Finished lessons as saved: the ids already known (including any for lessons no longer in the
 * curriculum) plus any lesson finished since, by its id.
 */
export function saveLessons(
  state: ProgressState,
  order: readonly string[],
  course: CourseRef,
): ProgressState {
  const now = doneLessonIndexes(state, course.slug).flatMap((i) => (order[i] ? [order[i]] : []));
  const ids = [...new Set([...(state.doneLessonIds ?? []), ...now])];
  return withLessons(state, ids, order, course);
}

/**
 * Finished lessons that were studied rather than placed out of at onboarding, sorted. Units that
 * schedule upkeep reviews or close a before-check should read these.
 */
export function studiedLessonIndexes(
  state: Pick<ProgressState, "courses" | "doneLessons" | "placedLessonIds">,
  slug: string,
  order: readonly string[],
): number[] {
  const placed = new Set(state.placedLessonIds);
  return doneLessonIndexes(state, slug).filter((i) => !placed.has(order[i] ?? ""));
}

/**
 * The next stop after lesson `index` (0-based): the first unfinished lesson further along the
 * map, else the first unfinished one before it, else none. Someone who chose a unit carries on
 * from where they are.
 */
export function nextStopAfter(
  index: number,
  done: ReadonlySet<number>,
  total: number,
): number | null {
  for (let i = index + 1; i < total; i++) if (!done.has(i)) return i;
  for (let i = 0; i < Math.min(index, total); i++) if (!done.has(i)) return i;
  return null;
}

/** The later of two day keys: a clock that is behind never moves the last active day back. */
const laterDay = (day: string | null, today: string) => (day && day > today ? day : today);

/**
 * Adds lessons the account has finished on another device. Returns `prev` when none are new.
 * The indexes follow when the state is saved (`saveLessons`).
 */
export function adoptLessons(prev: ProgressState, ids: readonly string[]): ProgressState {
  const have = new Set(prev.doneLessonIds ?? []);
  const added = [...new Set(ids)].filter((id) => !have.has(id));
  return added.length === 0 ? prev : { ...prev, doneLessonIds: [...have, ...added] };
}

/**
 * Applies a finished lesson. Returns `prev` untouched when nothing new was earned. A lesson that
 * was only placed out of (its `id` is in `placedLessonIds`) counts as finished now.
 */
export function applyLessonComplete(
  prev: ProgressState,
  lesson: { slug: string; topic: string; index: number; total: number; id?: string },
  today: string,
  now = Date.now(),
): ProgressState {
  const { slug, topic, index, total, id } = lesson;
  const before = doneLessonIndexes(prev, slug);
  const placed = id !== undefined && prev.placedLessonIds.includes(id);
  if (before.includes(index) && !placed) return prev;
  const doneLessons = placed ? before : [...before, index].sort((x, y) => x - y);
  const completed = doneLessons.length;

  const history = { ...prev.history, [today]: (prev.history[today] ?? 0) + 1 };
  const lessonsByDay = { ...prev.lessonsByDay, [today]: (prev.lessonsByDay[today] ?? 0) + 1 };
  const advanced = advanceStreak(prev, today);
  const streak = advanced.streak;
  const longestStreak = Math.max(prev.longestStreak, streak);

  const pct = Math.round((completed / total) * 100);
  const hitStreak =
    (prev.lastActiveDay === null || prev.lastActiveDay < today) &&
    STREAK_MILESTONES.includes(streak);

  const celebration: Celebration = hitStreak
    ? {
        kind: "streak",
        title: `${streak}-day streak`,
        detail: `You've practiced ${streak} days in a row.`,
        emoji: "🔥",
        big: true,
      }
    : pct === 100
      ? {
          kind: "mastery",
          title: "Every lesson done",
          detail: `That's all of ${topic}. Reviews and the daily case keep it sharp.`,
          emoji: "✅",
          big: true,
        }
      : {
          kind: "lesson",
          title: "Lesson complete",
          detail: `+${LESSON_XP} XP.`,
          emoji: "✅",
        };

  return {
    ...prev,
    xp: prev.xp + LESSON_XP,
    streak,
    longestStreak,
    freezes: advanced.freezes,
    freezeLog: advanced.freezeLog,
    freezeSaved: advanced.freezeSaved,
    lastActiveDay: laterDay(prev.lastActiveDay, today),
    history,
    lessonsByDay,
    celebration,
    courses: {
      ...prev.courses,
      [slug]: { topic, completed, total, lastActivityAt: now },
    },
    doneLessons,
    placedLessonIds: placed
      ? prev.placedLessonIds.filter((placedId) => placedId !== id)
      : prev.placedLessonIds,
  };
}

/**
 * Marks the first `count` lessons as already known (added to any already finished) — used by the optional
 * onboarding placement check. No XP, no streak: nothing was practiced. The ids of the lessons it
 * marks (from `order`, today's lesson ids) are kept in `placedLessonIds`, so they aren't taken
 * for lessons studied.
 */
export function applyUnlockLessons(
  prev: ProgressState,
  slug: string,
  topic: string,
  count: number,
  total: number,
  order: readonly string[] = [],
): ProgressState {
  const existing = prev.courses[slug] ?? { topic, completed: 0, total };
  const before = doneLessonIndexes(prev, slug);
  const known = new Set(before);
  const added: string[] = [];
  for (let i = 0; i < Math.min(count, total); i++) {
    if (known.has(i)) continue;
    known.add(i);
    const id = order[i];
    if (id) added.push(id);
  }
  if (known.size === before.length) return prev;
  const doneLessons = [...known].sort((x, y) => x - y);
  return {
    ...prev,
    courses: {
      ...prev.courses,
      [slug]: { ...existing, topic, total, completed: doneLessons.length },
    },
    doneLessons,
    placedLessonIds: [...new Set([...prev.placedLessonIds, ...added])],
  };
}

/**
 * What one review answer pays: `scale` is the share of the usual (0.5 after the nudge), so the
 * amount shown is the amount paid.
 */
export function reviewXp(correct: boolean, scale = 1): number {
  const share = Number.isFinite(scale) ? Math.min(Math.max(scale, 0), 1) : 1;
  return Math.round((correct ? REVIEW_XP.correct : REVIEW_XP.wrong) * share);
}

/** A graded spaced-repetition answer: keeps the streak alive and pays out. */
export function applyReview(
  prev: ProgressState,
  correct: boolean,
  today: string,
  scale = 1,
): ProgressState {
  return applyPracticed(prev, reviewXp(correct, scale), today);
}

/** XP for a daily case: something for reading it, more for each question right. */
export const caseXp = (right: number) => 5 + 10 * Math.max(0, Math.min(right, 3));

/** A daily case: counts for the day and the streak once, like a review. */
export function applyCase(prev: ProgressState, right: number, today: string): ProgressState {
  return applyPracticed(prev, caseXp(right), today);
}

function applyPracticed(prev: ProgressState, xp: number, today: string): ProgressState {
  const advanced = advanceStreak(prev, today);
  const streak = advanced.streak;
  return {
    ...prev,
    xp: prev.xp + xp,
    streak,
    longestStreak: Math.max(prev.longestStreak, streak),
    freezes: advanced.freezes,
    freezeLog: advanced.freezeLog,
    freezeSaved: advanced.freezeSaved,
    lastActiveDay: laterDay(prev.lastActiveDay, today),
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
  };
}

/** XP per reasoning exercise, scaled by how much of it was right. */
export function applyExercise(prev: ProgressState, score: number, bonus = 0): ProgressState {
  const clamped = Math.min(Math.max(score, 0), 1);
  return {
    ...prev,
    xp: prev.xp + Math.max(5, Math.round(25 * clamped)) + Math.max(0, bonus),
  };
}

/** The written argument pays by rubric score, not by length. */
export function applyArgument(prev: ProgressState, total: number, max: number): ProgressState {
  return {
    ...prev,
    xp: prev.xp + argumentXpFor(total, max),
  };
}

/** Lifetime gems this device has earned: what a sync tells the account. */
export const gemsEarned = (state: Pick<ProgressState, "gems" | "gemsSpent" | "gemsGranted">) =>
  state.gems + state.gemsSpent - state.gemsGranted;

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
  /** Lessons finished on any of the account's devices, by id. */
  doneLessons?: readonly string[];
  /** Recent days the account has activity on, so an adopted streak arrives with its days. */
  activeDays?: readonly string[];
};

/** Marks the account's active days in `history` (once each), keeping the device's own counts. */
function withActiveDays(
  history: Record<string, number>,
  days: readonly string[],
  today: string,
): Record<string, number> {
  const latest = shiftDay(today, 1);
  const missing = days.filter((day) => isDayKey(day) && day <= latest && !history[day]);
  if (missing.length === 0) return history;
  return { ...history, ...Object.fromEntries(missing.map((day) => [day, 1])) };
}

/**
 * Folds the signed-in account's numbers into this device's, so a new device
 * isn't blank. XP, gems, finished lessons and the longest streak only ever go up. The account's
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

  const withLessons = adoptLessons(prev, account.doneLessons ?? []);
  const history = withActiveDays(prev.history, account.activeDays ?? [], today);
  const next: ProgressState = {
    ...withLessons,
    history,
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
    next.lastActiveDay === prev.lastActiveDay &&
    history === prev.history &&
    withLessons === prev;
  return unchanged ? prev : next;
}
