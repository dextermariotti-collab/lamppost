import { useCallback, useEffect, useMemo, useState } from "react";
import { listStoredCourses } from "./course-store";
import { lessonQuizzes, type Quiz } from "./courses";
import { getPracticeResult, practiceWeight } from "./practice";
import { getPredictionAttempt } from "./prediction-store";
import { dayKey } from "./progress";

/**
 * Lightweight spaced repetition over lessons the learner has already finished.
 *
 * Every completed lesson becomes a review item. Getting it right pushes the next
 * due date further out (1 → 2 → 4 → 8 → 16 → 32 days); getting it wrong resets
 * the interval to tomorrow.
 *
 * The lesson's "predict before reveal" answer weights that interval: a lesson
 * the learner predicted correctly is treated as better understood (interval
 * stretched), while a missed prediction pulls the next review closer.
 */

const KEY = "lamppost-reviews-v1";
const EVENT = "lamppost-reviews-change";

const INTERVALS = [1, 2, 4, 8, 16, 32];

/** Interval multiplier derived from the lesson's prediction beat. */
export function predictionWeight(slug: string, lessonIndex: number) {
  const attempt = getPredictionAttempt(slug, lessonIndex);
  if (!attempt) return 1;
  return attempt.correct ? 1.3 : 0.6;
}

/**
 * Combined interval weighting. An explain-it-back session is stronger evidence
 * of understanding than a single prediction, so it dominates when both exist.
 */
export function lessonWeight(slug: string, lessonIndex: number) {
  const practice = practiceWeight(slug, lessonIndex);
  if (practice !== 1) return practice;
  return predictionWeight(slug, lessonIndex);
}

export type PracticeSignal = "solid" | "shaky" | "revisit" | null;

export function practiceSignalFor(slug: string, lessonIndex: number): PracticeSignal {
  return getPracticeResult(slug, lessonIndex)?.verdict ?? null;
}

export type PredictionSignal = "confident" | "shaky" | "unknown";

export function predictionSignal(slug: string, lessonIndex: number): PredictionSignal {
  const attempt = getPredictionAttempt(slug, lessonIndex);
  if (!attempt) return "unknown";
  return attempt.correct ? "confident" : "shaky";
}

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

export type ScheduledItem = ReviewItem & {
  /** Next due date (UTC day key). */
  due: string;
  /** Days until due; 0 = today, negative = overdue. */
  dueInDays: number;
  /** Leitner box, 0 = freshly reset. */
  box: number;
  /** Interval weighting from the prediction beat and any practice session. */
  weight: number;
  signal: PredictionSignal;
  /** The tutor's read on the learner's spoken-back explanation, if any. */
  practice: PracticeSignal;
};

/** Every completed lesson with its next due date, most urgent first. */
function buildSchedule(completedBySlug: Record<string, number>): ScheduledItem[] {
  const log = readLog();
  const today = dayKey();
  const items: ScheduledItem[] = [];

  for (const course of listStoredCourses()) {
    const completed = completedBySlug[course.slug] ?? 0;
    for (let i = 0; i < Math.min(completed, course.lessons.length); i += 1) {
      const lesson = course.lessons[i];
      if (!lesson) continue;
      const quiz = lessonQuizzes(lesson)[0];
      if (!quiz) continue;
      const key = reviewKey(course.slug, i);
      // Unseen lessons are due immediately; seen ones wait for their due date.
      const due = log[key]?.due ?? today;
      items.push({
        key,
        slug: course.slug,
        topic: course.topic,
        lessonIndex: i,
        lessonTitle: lesson.title,
        quiz,
        due,
        dueInDays: daysBetween(today, due),
        overdueDays: Math.max(0, daysBetween(due, today)),
        box: log[key]?.box ?? 0,
        weight: lessonWeight(course.slug, i),
        signal: predictionSignal(course.slug, i),
        practice: practiceSignalFor(course.slug, i),
      });
    }
  }

  // Soonest (and most overdue) first so nothing rots at the bottom of the pile.
  return items.sort((a, b) => a.dueInDays - b.dueInDays || a.topic.localeCompare(b.topic));
}

/** Builds today's queue from stored courses + how far the learner has got. */
function buildQueue(completedBySlug: Record<string, number>): ReviewItem[] {
  return buildSchedule(completedBySlug)
    .filter((item) => item.dueInDays <= 0)
    .sort((a, b) => b.overdueDays - a.overdueDays);
}

function useReviewSignature(completedBySlug: Record<string, number>) {
  return useMemo(
    () =>
      Object.entries(completedBySlug)
        .map(([slug, n]) => `${slug}:${n}`)
        .sort()
        .join(","),
    [completedBySlug],
  );
}

function useSynced<T>(build: () => T, signature: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setValue(build());
    sync();
    setHydrated(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("lamppost-courses-change", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("lamppost-courses-change", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return { value, hydrated };
}

/** Grades one item, weighting the next interval by its prediction answer. */
export function gradeReview(key: string, correct: boolean) {
  const [slug, indexPart] = key.split("#");
  const lessonIndex = Number(indexPart ?? 0);
  const log = readLog();
  const box = log[key]?.box ?? 0;
  const nextBox = correct ? Math.min(box + 1, INTERVALS.length - 1) : 0;
  const base = correct ? INTERVALS[nextBox]! : 1;
  const weight = slug ? lessonWeight(slug, lessonIndex) : 1;
  const gap = Math.max(1, Math.round(base * weight));
  writeLog({ ...log, [key]: { box: nextBox, due: shiftDay(dayKey(), gap) } });
}

export function useReviewQueue(completedBySlug: Record<string, number>) {
  const signature = useReviewSignature(completedBySlug);
  const { value: items, hydrated } = useSynced<ReviewItem[]>(
    () => buildQueue(completedBySlug),
    signature,
    [],
  );
  const grade = useCallback((key: string, correct: boolean) => gradeReview(key, correct), []);
  return { items, hydrated, grade };
}

/** Full upcoming schedule, for the review tracker screen. */
export function useReviewSchedule(completedBySlug: Record<string, number>) {
  const signature = useReviewSignature(completedBySlug);
  const { value: items, hydrated } = useSynced<ScheduledItem[]>(
    () => buildSchedule(completedBySlug),
    signature,
    [],
  );
  return { items, hydrated };
}


/** Urgency band used for the home-screen reviews card. */
export function reviewUrgency(count: number, maxOverdue: number) {
  if (count === 0) return "clear" as const;
  if (maxOverdue >= 3 || count >= 12) return "piling" as const;
  if (maxOverdue >= 1 || count >= 6) return "warm" as const;
  return "calm" as const;
}
