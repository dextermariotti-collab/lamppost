import { useCallback, useEffect, useState } from "react";

const KEY = "lamppost-progress-v1";

export type ProgressState = {
  streak: number;
  gems: number;
  xp: number;
  /** slug -> number of lessons completed */
  courses: Record<string, { topic: string; completed: number; total: number }>;
};

const DEFAULT_STATE: ProgressState = {
  streak: 7,
  gems: 1280,
  xp: 2450,
  courses: {},
};


function read(): ProgressState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_STATE, ...(JSON.parse(raw) as ProgressState) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
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
        return {
          ...prev,
          xp: prev.xp + (gained ? 50 : 0),
          gems: prev.gems + (gained ? 10 : 0),
          courses: { ...prev.courses, [slug]: { topic, completed, total } },
        };
      }),
    [update],
  );

  return { state, hydrated, registerCourse, completeLesson };
}
