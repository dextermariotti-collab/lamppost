import { useCallback, useEffect, useState } from "react";

/**
 * Local record of exercise attempts, keyed by lesson + exercise index, so a
 * learner who revisits a lesson sees their answers and isn't paid XP twice.
 */

const KEY = "lamppost-exercises-v1";
export const ATTEMPTS_EVENT = "lamppost-exercises-change";

export type ExerciseAttempt = {
  /** Serialized answer: option index, bucket map or ordering, per exercise kind. */
  answer: unknown;
  /** 0..1 share of the exercise answered correctly. */
  score: number;
  at: number;
};

type Store = Record<string, ExerciseAttempt>;

const idFor = (lessonId: string, index: number) => `${lessonId}#${index}`;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(ATTEMPTS_EVENT));
  } catch {
    /* ignore */
  }
}

/** All attempts for one lesson, plus a recorder that never overwrites a score. */
export function useLessonAttempts(lessonId: string) {
  const [attempts, setAttempts] = useState<Record<number, ExerciseAttempt>>({});

  useEffect(() => {
    const store = readStore();
    const mine: Record<number, ExerciseAttempt> = {};
    for (const [key, value] of Object.entries(store)) {
      const [id, index] = key.split("#");
      if (id === lessonId && index !== undefined) mine[Number(index)] = value;
    }
    setAttempts(mine);
  }, [lessonId]);

  const record = useCallback(
    (index: number, answer: unknown, score: number) => {
      const attempt: ExerciseAttempt = { answer, score, at: Date.now() };
      setAttempts((prev) => (prev[index] ? prev : { ...prev, [index]: attempt }));
      const store = readStore();
      const key = idFor(lessonId, index);
      if (store[key]) return false;
      writeStore({ ...store, [key]: attempt });
      return true;
    },
    [lessonId],
  );

  return { attempts, record };
}

/** Every attempt, keyed `lessonId#index` — read by the progress analytics. */
export function readAttemptStore(): Record<string, ExerciseAttempt> {
  return readStore();
}

/** Replaces every attempt: used when the account's copy is merged in. */
export function writeAttemptStore(store: Record<string, ExerciseAttempt>) {
  writeStore(store);
}
