import { useCallback, useEffect, useState } from "react";

const KEY = "lamppost-progress-v1";

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
  courses: Record<string, { topic: string; completed: number; total: number }>;
};

const DEFAULT_STATE: ProgressState = {
  streak: 7,
  longestStreak: 12,
  gems: 1280,
  xp: 2450,
  lastActiveDay: null,
  history: {},
  dailyGoal: 3,
  celebration: null,
  courses: {},
};

const STREAK_MILESTONES = [7, 30, 100, 365];

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
    Array.from({ length: 7 }, (_, i) => state.history[shiftDay(today, -(i + offset * 7))] ?? 0).reduce(
      (a, b) => a + b,
      0,
    );
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

export function useProgress() {
  const [state, setState] = useState<ProgressState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(read());
    setHydrated(true);
  }, []);

  const update = useCallback((fn: (prev: ProgressState) => ProgressState) => {
    setState((prev) => {
      const next = fn(prev);
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const registerCourse = useCallback(
    (slug: string, topic: string, total: number) =>
      update((prev) =>
        prev.courses[slug]
          ? prev
          : { ...prev, courses: { ...prev.courses, [slug]: { topic, completed: 0, total } } },
      ),
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
        const streak =
          prev.lastActiveDay === today
            ? prev.streak
            : prev.lastActiveDay === shiftDay(today, -1)
              ? prev.streak + 1
              : 1;
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
          lastActiveDay: today,
          history,
          celebration,
          courses: { ...prev.courses, [slug]: { topic, completed, total } },
        };
      }),
    [update],
  );

  /** A graded spaced-repetition answer: keeps the streak alive and pays out. */
  const recordReview = useCallback(
    (correct: boolean) =>
      update((prev) => {
        const today = dayKey();
        const streak =
          prev.lastActiveDay === today
            ? prev.streak
            : prev.lastActiveDay === shiftDay(today, -1)
              ? prev.streak + 1
              : 1;
        return {
          ...prev,
          xp: prev.xp + (correct ? 20 : 5),
          gems: prev.gems + (correct ? 2 : 0),
          streak,
          longestStreak: Math.max(prev.longestStreak, streak),
          lastActiveDay: today,
          history: { ...prev.history, [today]: (prev.history[today] ?? 0) + 1 },
        };
      }),
    [update],
  );

  const clearCelebration = useCallback(
    () => update((prev) => (prev.celebration ? { ...prev, celebration: null } : prev)),
    [update],
  );

  return { state, hydrated, registerCourse, completeLesson, recordReview, clearCelebration };
}
