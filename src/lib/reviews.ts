import { useCallback, useEffect, useMemo, useState } from "react";
import { listStoredCourses } from "./course-store";
import { lessonQuizzes, type Quiz } from "./courses";
import { dayKey } from "./progress";

/**
 * Lightweight spaced repetition over lessons the learner has already finished.
 *
 * Every completed lesson becomes a review item. Getting it right pushes the next
 * due date further out (1 → 2 → 4 → 8 → 16 → 32 days); getting it wrong resets
 * the interval to tomorrow.
 */

const KEY = "lamppost-reviews-v1";
const EVENT = "lamppost-reviews-change";

const INTERVALS = [1, 2, 4, 8, 16, 32];

type Entry = { due: string; box: number };
type Log = Record<string, Entry>;

export const reviewKey = (slug: string, lessonIndex: number) => `${slug}#${lessonIndex}`;

function readLog(): Log {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Log) : {};
  } catch {
    return {};
  }
}

function writeLog(log: Log) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(log));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

function shiftDay(key: string, days: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return dayKey(d);
}

const daysBetween = (from: string, to: string) =>
  Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000,
  );

export type ReviewItem = {
  key: string;
  slug: string;
  topic: string;
  lessonIndex: number;
  lessonTitle: string;
  quiz: Quiz;
  /** How many days past its due date this item is (0 = due today). */
  overdueDays: number;
};

/** Builds today's queue from stored courses + how far the learner has got. */
function buildQueue(completedBySlug: Record<string, number>): ReviewItem[] {
  const log = readLog();
  const today = dayKey();
  const items: ReviewItem[] = [];

  for (const course of listStoredCourses()) {
    const completed = completedBySlug[course.slug] ?? 0;
    for (let i = 0; i < Math.min(completed, course.lessons.length); i += 1) {
      const lesson = course.lessons[i];
      if (!lesson) continue;
      const quizzes = lessonQuizzes(lesson);
      const quiz = quizzes[0];
      if (!quiz) continue;
      const key = reviewKey(course.slug, i);
      // Unseen lessons are due immediately; seen ones wait for their due date.
      const due = log[key]?.due ?? today;
      if (due > today) continue;
      items.push({
        key,
        slug: course.slug,
        topic: course.topic,
        lessonIndex: i,
        lessonTitle: lesson.title,
        quiz,
        overdueDays: Math.max(0, daysBetween(due, today)),
      });
    }
  }

  // Most overdue first so nothing rots at the bottom of the pile.
  return items.sort((a, b) => b.overdueDays - a.overdueDays);
}

export function useReviewQueue(completedBySlug: Record<string, number>) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const slugSignature = useMemo(
    () =>
      Object.entries(completedBySlug)
        .map(([slug, n]) => `${slug}:${n}`)
        .sort()
        .join(","),
    [completedBySlug],
  );

  useEffect(() => {
    const sync = () => setItems(buildQueue(completedBySlug));
    sync();
    setHydrated(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("lamppost-courses-change", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("lamppost-courses-change", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugSignature]);

  const grade = useCallback((key: string, correct: boolean) => {
    const log = readLog();
    const box = log[key]?.box ?? 0;
    const nextBox = correct ? Math.min(box + 1, INTERVALS.length - 1) : 0;
    const gap = correct ? INTERVALS[nextBox]! : 1;
    writeLog({ ...log, [key]: { box: nextBox, due: shiftDay(dayKey(), gap) } });
  }, []);

  return { items, hydrated, grade };
}

/** Urgency band used for the home-screen reviews card. */
export function reviewUrgency(count: number, maxOverdue: number) {
  if (count === 0) return "clear" as const;
  if (maxOverdue >= 3 || count >= 12) return "piling" as const;
  if (maxOverdue >= 1 || count >= 6) return "warm" as const;
  return "calm" as const;
}
