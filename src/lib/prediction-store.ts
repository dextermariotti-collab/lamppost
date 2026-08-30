import { useCallback, useEffect, useState } from "react";

const KEY = "lamppost-predictions-v1";

export type PredictionAttempt = {
  choice: number;
  correct: boolean;
  at: number;
};

type Store = Record<string, PredictionAttempt>;

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

export function getPredictionAttempt(
  slug: string,
  lessonIndex: number,
): PredictionAttempt | undefined {
  return readStore()[idFor(slug, lessonIndex)];
}

export function savePredictionAttempt(
  slug: string,
  lessonIndex: number,
  attempt: PredictionAttempt,
) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...readStore(), [idFor(slug, lessonIndex)]: attempt };
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/**
 * Persisted "predict before reveal" answer for one lesson. Kept locally so a
 * later spaced-repetition weighting pass can read it; no scoring here yet.
 */
export function usePredictionAttempt(slug: string, lessonIndex: number) {
  const [attempt, setAttempt] = useState<PredictionAttempt | undefined>(undefined);

  useEffect(() => {
    setAttempt(getPredictionAttempt(slug, lessonIndex));
  }, [slug, lessonIndex]);

  const record = useCallback(
    (choice: number, correct: boolean) => {
      const next: PredictionAttempt = { choice, correct, at: Date.now() };
      setAttempt(next);
      savePredictionAttempt(slug, lessonIndex, next);
    },
    [slug, lessonIndex],
  );

  return { attempt, record };
}
