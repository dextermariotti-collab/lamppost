import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useSessionUser } from "./companion-store";
import { getMyProfile, syncProgress } from "./profile.functions";
import { argumentXpFor } from "./exercises";

const KEY = "lamppost-progress-v1";
const PROGRESS_EVENT = "lamppost-progress-change";

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
};

const DEFAULT_STATE: ProgressState = {
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
};

/** Most freezes that can be held at once, and the gem price of one. */
export const MAX_FREEZES = 2;
export const FREEZE_COST = 60;

const STREAK_MILESTONES = [3, 7, 30, 100, 365];

function daysBetween(from: string, to: string) {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Streak forgiveness. A gap of missed days is covered by held freezes (one per
 * missed day) so the streak continues instead of resetting — loss aversion only
 * motivates while there's an escape valve. Every 7th day earns a freeze back.
 */
function advanceStreak(prev: ProgressState, today: string) {
  if (prev.lastActiveDay === today) {
    return {
      streak: prev.streak,
      freezes: prev.freezes,
      freezeLog: prev.freezeLog,
      freezeSaved: prev.freezeSaved,
    };
  }
  const gap = prev.lastActiveDay ? daysBetween(prev.lastActiveDay, today) - 1 : 0;
  let streak = 1;
  let freezes = prev.freezes;
  let freezeLog = prev.freezeLog;
  let freezeSaved: ProgressState["freezeSaved"] = null;

  if (prev.lastActiveDay && gap <= 0) {
    streak = prev.streak + 1;
  } else if (prev.lastActiveDay && gap > 0 && gap <= freezes) {
    const covered = Array.from({ length: gap }, (_, i) => shiftDay(today, -(i + 1)));
    freezes -= gap;
    freezeLog = [...prev.freezeLog, ...covered].slice(-30);
    freezeSaved = { days: gap, day: today };
    streak = prev.streak + 1;
  }

  if (streak > 0 && streak % 7 === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
  return { streak, freezes, freezeLog, freezeSaved };
}

const SURPRISES = [
  "Bonus XP — you showed up when it counted.",
  "Momentum bonus unlocked.",
  "Lucky drop: extra XP for a clean run.",
  "Deep-focus bonus applied.",
];

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function shiftDay(key: string, days: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return dayKey(d);
}

function read(): ProgressState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_STATE, ...(JSON.parse(raw) as ProgressState) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

// One module-level snapshot shared by every screen, signed in or not: each hook
// instance subscribes to the same cached state instead of keeping its own copy,
// so XP, gems, lessons and the streak can never differ between screens.
let snapshot: ProgressState | null = null;

function getSnapshot(): ProgressState {
  if (!snapshot) snapshot = read();
  return snapshot;
}

function getServerSnapshot(): ProgressState {
  return DEFAULT_STATE;
}

const listeners = new Set<() => void>();

function emit() {
  snapshot = read();
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener(PROGRESS_EVENT, emit);
    window.addEventListener("storage", emit);
  }
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener(PROGRESS_EVENT, emit);
      window.removeEventListener("storage", emit);
    }
  };
}

function writeState(next: ProgressState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  snapshot = next;
  listeners.forEach((fn) => fn());
  // Also notify anything listening on the DOM event (other tabs, non-hook code).
  queueMicrotask(() => window.dispatchEvent(new Event(PROGRESS_EVENT)));
}

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

/** Lessons done today, and how the week compares to previous weeks. */
export function deriveInsights(state: ProgressState) {
  const today = dayKey();
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
  const hoursLeft = 24 - new Date().getHours();
  return {
    doneToday,
    thisWeek,
    percentile,
    hoursLeft,
    atRisk: doneToday === 0 && state.streak > 0 && hoursLeft <= 8,
  };
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

export function useProgress() {
  const [state, setState] = useState<ProgressState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const { userId } = useSessionUser();
  const lastSynced = useRef("");
  const pulled = useRef<string | null>(null);

  // Every screen that reads progress shares one source of truth: writes from any
  // hook instance are broadcast so no screen shows stale XP, gems or lessons.
  useEffect(() => {
    const sync = () => setState(read());
    sync();
    setHydrated(true);
    window.addEventListener(PROGRESS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((fn: (prev: ProgressState) => ProgressState) => {
    setState((prev) => {
      const next = fn(prev);
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      // Broadcast after the render pass, so other screens never receive a state
      // update while React is rendering this one.
      queueMicrotask(() => window.dispatchEvent(new Event(PROGRESS_EVENT)));
      return next;
    });
  }, []);

  // On sign-in, pull the account's numbers down so a new device isn't blank.
  useEffect(() => {
    if (!hydrated || !userId || pulled.current === userId) return;
    pulled.current = userId;
    void getMyProfile()
      .then((profile) => {
        if (!profile) return;
        update((prev) => ({
          ...prev,
          xp: Math.max(prev.xp, profile.totalXp),
          gems: Math.max(prev.gems, profile.gems),
          streak: Math.max(prev.streak, profile.currentStreak),
          longestStreak: Math.max(prev.longestStreak, profile.longestStreak),
          lastActiveDay:
            [prev.lastActiveDay, profile.lastActiveDay].filter(Boolean).sort().pop() ?? null,
        }));
      })
      .catch(() => undefined);
  }, [hydrated, userId, update]);

  // Write-through sync: the account is the source of truth friends can see.
  useEffect(() => {
    if (!hydrated || !userId) return;
    const payload = {
      streak: state.streak,
      longestStreak: state.longestStreak,
      totalXp: state.xp,
      gems: state.gems,
      lastActiveDay: state.lastActiveDay,
      history: state.history,
    };
    const signature = JSON.stringify(payload);
    if (signature === lastSynced.current) return;
    lastSynced.current = signature;
    void syncProgress({ data: payload }).catch(() => undefined);
  }, [hydrated, userId, state]);

  const registerCourse = useCallback(
    (slug: string, topic: string, total: number) =>
      update((prev) =>
        prev.courses[slug]
          ? prev
          : { ...prev, courses: { ...prev.courses, [slug]: { topic, completed: 0, total } } },
      ),
    [update],
  );

  /**
   * Marks the first `count` lessons as already known — used by the optional
   * onboarding placement check. No XP, no streak: nothing was practised.
   */
  const unlockLessons = useCallback(
    (slug: string, topic: string, count: number, total: number) =>
      update((prev) => {
        const existing = prev.courses[slug] ?? { topic, completed: 0, total };
        const completed = Math.max(existing.completed, Math.min(count, total));
        if (completed === existing.completed) return prev;
        return {
          ...prev,
          courses: { ...prev.courses, [slug]: { ...existing, topic, total, completed } },
        };
      }),
    [update],
  );

  const completeLesson = useCallback(
    (slug: string, topic: string, index: number, total: number) =>
      update((prev) => {
        const existing = prev.courses[slug] ?? { topic, completed: 0, total };
        const completed = Math.max(existing.completed, index + 1);
        const gained = completed > existing.completed;
        if (!gained) return prev;

        const today = dayKey();
        const history = { ...prev.history, [today]: (prev.history[today] ?? 0) + 1 };
        const advanced = advanceStreak(prev, today);
        const streak = advanced.streak;
        const longestStreak = Math.max(prev.longestStreak, streak);

        const bonusXp = Math.random() < 0.25 ? 25 + Math.floor(Math.random() * 4) * 25 : undefined;
        const pct = Math.round((completed / total) * 100);
        const hitStreak = prev.lastActiveDay !== today && STREAK_MILESTONES.includes(streak);

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
                    ? SURPRISES[Math.floor(Math.random() * SURPRISES.length)]!
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
            [slug]: { topic, completed, total, lastActivityAt: Date.now() },
          },
        };
      }),
    [update],
  );

  /** A graded spaced-repetition answer: keeps the streak alive and pays out. */
  const recordReview = useCallback(
    (correct: boolean) =>
      update((prev) => {
        const today = dayKey();
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
      }),
    [update],
  );

  /**
   * An explain-it-back session. XP here is paid for the explanation, and the
   * bonus specifically for linking the idea to an earlier one — the connections
   * engine is the moat, so that is what the reward points at.
   */
  const recordPractice = useCallback(
    (verdict: "solid" | "shaky" | "revisit", connectionMade: boolean) =>
      update((prev) => {
        const base = verdict === "solid" ? 30 : verdict === "shaky" ? 20 : 10;
        const bonus = connectionMade ? 40 : 0;
        return {
          ...prev,
          xp: prev.xp + base + bonus,
          gems: prev.gems + (connectionMade ? 5 : 0),
        };
      }),
    [update],
  );
  /** XP per reasoning exercise, scaled by how much of it was right. */
  const recordExercise = useCallback(
    (score: number, bonus = 0) =>
      update((prev) => {
        const clamped = Math.min(Math.max(score, 0), 1);
        return {
          ...prev,
          xp: prev.xp + Math.max(5, Math.round(25 * clamped)) + Math.max(0, bonus),
          gems: prev.gems + (clamped === 1 ? 2 : 0),
        };
      }),
    [update],
  );

  /** The written argument pays by rubric score, not by length. */
  const recordArgument = useCallback(
    (total: number, max: number) =>
      update((prev) => ({
        ...prev,
        xp: prev.xp + argumentXpFor(total, max),
        gems: prev.gems + (total / Math.max(max, 1) >= 0.75 ? 5 : 1),
      })),
    [update],
  );

  /** Buy one freeze with gems, capped so it can't be stockpiled. */
  const buyFreeze = useCallback(
    () =>
      update((prev) =>
        prev.gems < FREEZE_COST || prev.freezes >= MAX_FREEZES
          ? prev
          : { ...prev, gems: prev.gems - FREEZE_COST, freezes: prev.freezes + 1 },
      ),
    [update],
  );

  const clearFreezeSaved = useCallback(
    () => update((prev) => (prev.freezeSaved ? { ...prev, freezeSaved: null } : prev)),
    [update],
  );

  const clearCelebration = useCallback(
    () => update((prev) => (prev.celebration ? { ...prev, celebration: null } : prev)),
    [update],
  );

  const setDailyGoal = useCallback(
    (goal: number) => update((prev) => ({ ...prev, dailyGoal: Math.min(10, Math.max(1, goal)) })),
    [update],
  );

  return {
    state,
    hydrated,
    registerCourse,
    unlockLessons,
    completeLesson,
    recordReview,
    recordPractice,
    recordExercise,
    recordArgument,

    buyFreeze,
    clearFreezeSaved,
    clearCelebration,
    setDailyGoal,
  };
}
