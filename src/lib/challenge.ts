import { useCallback, useEffect, useState } from "react";
import { LESSONS, lessonIndexOf, unitById } from "./curriculum";
import { dayKey } from "./progress";
import type { ExerciseKind } from "./exercises";

/**
 * One quick drill a day, drawn from any skill the learner has already unlocked.
 * The pick is seeded by the date so it is the same drill all day, and finishing
 * it counts towards the streak like a lesson does.
 */

const KEY = "lamppost-challenge-v1";
const EVENT = "lamppost-challenge-change";

export type DailyChallenge = {
  day: string;
  lessonId: string;
  kind: ExerciseKind;
  lessonTitle: string;
  unitTitle: string;
  lessonIndex: number;
};

export type ChallengeRecord = { day: string; correct: boolean; at: number };

/** Deterministic per-day hash so everyone's challenge is stable within a day. */
function seedFor(day: string) {
  let hash = 0;
  for (let i = 0; i < day.length; i++) hash = (hash * 31 + day.charCodeAt(i)) % 100_000;
  return hash;
}

/** The pool is every drill type of every unlocked lesson. */
export function challengeFor(completedLessons: number, day = dayKey()): DailyChallenge | null {
  const unlocked = LESSONS.slice(0, Math.max(completedLessons, 0));
  const pool = unlocked.flatMap((lesson) =>
    lesson.drills.map(
      (kind) => ({ lesson, kind }) as { lesson: (typeof LESSONS)[number]; kind: ExerciseKind },
    ),
  );
  if (pool.length === 0) return null;
  const pick = pool[seedFor(day) % pool.length]!;
  return {
    day,
    lessonId: pick.lesson.id,
    kind: pick.kind,
    lessonTitle: pick.lesson.title,
    unitTitle: unitById(pick.lesson.unitId).title,
    lessonIndex: lessonIndexOf(pick.lesson.id),
  };
}

function readRecord(): ChallengeRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ChallengeRecord) : null;
  } catch {
    return null;
  }
}

export function recordChallenge(correct: boolean) {
  if (typeof window === "undefined") return;
  try {
    const record: ChallengeRecord = { day: dayKey(), correct, at: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(record));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

/** Today's challenge plus whether it's already been done. */
export function useDailyChallenge(completedLessons: number) {
  const [record, setRecord] = useState<ChallengeRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setRecord(readRecord());
    sync();
    setHydrated(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const today = dayKey();
  const complete = useCallback(recordChallenge, []);

  return {
    challenge: challengeFor(completedLessons, today),
    doneToday: record?.day === today,
    lastCorrect: record?.day === today ? record.correct : null,
    hydrated,
    complete,
  };
}
