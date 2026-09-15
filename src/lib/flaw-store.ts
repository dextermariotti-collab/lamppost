import { useCallback, useEffect, useState } from "react";

const KEY = "lamppost-flaws-v1";

export type FlawAttempt = {
  choice: number;
  correct: boolean;
  at: number;
};

type Store = Record<string, FlawAttempt>;

const idFor = (slug: string, lessonIndex: number) => `${slug}#${lessonIndex}`;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

export function getFlawAttempt(slug: string, lessonIndex: number): FlawAttempt | undefined {
  return readStore()[idFor(slug, lessonIndex)];
}

export function saveFlawAttempt(slug: string, lessonIndex: number, attempt: FlawAttempt) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...readStore(), [idFor(slug, lessonIndex)]: attempt };
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** Persisted "spot the flaw" answer for one lesson. */
export function useFlawAttempt(slug: string, lessonIndex: number) {
  const [attempt, setAttempt] = useState<FlawAttempt | undefined>(undefined);

  useEffect(() => {
    setAttempt(getFlawAttempt(slug, lessonIndex));
  }, [slug, lessonIndex]);

  const record = useCallback(
    (choice: number, correct: boolean) => {
      const next: FlawAttempt = { choice, correct, at: Date.now() };
      setAttempt(next);
      saveFlawAttempt(slug, lessonIndex, next);
    },
    [slug, lessonIndex],
  );

  return { attempt, record };
}
