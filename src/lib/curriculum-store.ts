import { useCallback, useEffect, useRef, useState } from "react";
import type { Course, Lesson } from "./courses";
import { getStoredCourse, saveCourse } from "./course-store";
import {
  CURRICULUM_SLUG,
  CURRICULUM_TAGLINE,
  CURRICULUM_TITLE,
  LESSONS,
  lessonAt,
} from "./curriculum";
import { getCurriculumLesson, getLessonPart } from "./curriculum.functions";
import { emptyState, loadLesson, type LoaderState } from "./lesson-loader";
import { cleanLessonHypotheticals } from "./hypothetical";

/**
 * The fixed curriculum lives in the existing course store under one slug, so
 * progress, reviews and practice keep working unchanged. Lessons start as
 * skeletons (title + objective) and fill in with cached AI content on demand.
 */

function skeleton(): Course {
  return {
    slug: CURRICULUM_SLUG,
    topic: CURRICULUM_TITLE,
    tagline: CURRICULUM_TAGLINE,
    emoji: "🔍",
    lessons: LESSONS.map((lesson) => ({
      title: lesson.title,
      subtitle: lesson.objective,
      emoji: lesson.emoji,
    })),
  };
}

/** Phase 2 lessons are only usable once their exercise set is present. */
export const hasLessonContent = (lesson: Lesson | undefined) =>
  Boolean(lesson?.exercises && lesson.exercises.length >= 3);

/** Returns the curriculum course, creating/refreshing the skeleton as needed. */
export function ensureCurriculumCourse(): Course {
  const stored = getStoredCourse(CURRICULUM_SLUG);
  const base = skeleton();
  if (!stored || stored.lessons.length !== base.lessons.length) {
    const merged: Course = {
      ...base,
      lessons: base.lessons.map((lesson, i) => {
        const old = stored?.lessons[i];
        return old && old.title === lesson.title && hasLessonContent(old) ? old : lesson;
      }),
    };
    saveCourse(merged);
    return merged;
  }
  // Keep titles/objectives in sync with the curriculum config.
  const synced: Course = {
    ...base,
    lessons: base.lessons.map((lesson, i) => {
      const old = stored.lessons[i];
      return old && old.title === lesson.title ? { ...old, subtitle: lesson.subtitle } : lesson;
    }),
  };
  saveCourse(synced);
  return synced;
}

function storeLesson(index: number, lesson: Lesson) {
  const course = ensureCurriculumCourse();
  const lessons = [...course.lessons];
  lessons[index] = lesson;
  saveCourse({ ...course, lessons });
}

/**
 * Loads one curriculum lesson. `finished` is whether the learner has finished this lesson
 * (`useProgress().doneLessons.has(index)`): lessons can be done in any order.
 *
 * A lesson the learner has already finished is served from their local copy so
 * their own drills and answers stay put. A lesson they have NOT finished always
 * refetches the current shared version — otherwise someone who started a lesson
 * before a content fix would keep seeing the broken drills forever.
 *
 * A lesson that isn't cached on the server yet is written in parts: `lesson` is
 * usable as soon as its idea card exists (`ready`), and `drills` / `written` fill
 * in as each is written. `complete` says everything has arrived. Nothing is stored
 * locally until the lesson is complete.
 */
export function useCurriculumLesson(index: number, finished = false) {
  const meta = lessonAt(index);
  const plan = meta?.drills ?? [];
  const [held, setHeld] = useState<{ index: number; state: LoaderState } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  /** The latest state of this lesson, so a retry picks up where the last run left off. */
  const latest = useRef<{ index: number; state: LoaderState } | null>(null);

  useEffect(() => {
    if (!meta) return;
    let canceled = false;
    const kinds = meta.drills;
    const course = ensureCurriculumCourse();
    const local = course.lessons[index];

    const withMeta = (lesson: Lesson): Lesson => ({
      ...cleanLessonHypotheticals(lesson),
      title: meta.title,
      subtitle: meta.objective,
      emoji: meta.emoji,
    });

    if (finished && hasLessonContent(local)) {
      const lesson = cleanLessonHypotheticals(local!);
      setHeld({
        index,
        state: {
          ...emptyState(kinds),
          lesson,
          drills: kinds.map((_, i) => lesson.exercises?.[i] ?? null),
          written: lesson.written ?? null,
          complete: true,
        },
      });
      return;
    }

    const previous = latest.current?.index === index ? latest.current.state : null;
    const initial: LoaderState = previous?.lesson
      ? { ...previous, error: null, notice: null, failed: [] }
      : emptyState(kinds);
    setHeld({ index, state: initial });
    let stored = false;
    void loadLesson(kinds, {
      initial,
      fetchLesson: () => getCurriculumLesson({ data: { lessonId: meta.id } }),
      fetchPart: (part) => getLessonPart({ data: { lessonId: meta.id, part } }),
      isCancelled: () => canceled,
      onChange: (next) => {
        const lesson = next.lesson ? withMeta(next.lesson) : null;
        if (next.complete && lesson && !stored) {
          stored = true;
          storeLesson(index, lesson);
        }
        latest.current = { index, state: { ...next, lesson } };
        setHeld(latest.current);
      },
    });

    return () => {
      canceled = true;
    };
  }, [index, meta, attempt, finished]);

  const state = held && held.index === index ? held.state : emptyState(plan);
  return {
    lesson: state.lesson ?? undefined,
    drills: state.drills,
    written: state.written,
    complete: state.complete,
    meta,
    loading: !state.lesson && !state.error,
    error: state.error,
    notice: state.notice,
    failed: state.failed,
    retry,
    /** The idea card exists, so the lesson can open. */
    ready: Boolean(state.lesson?.concept),
  };
}

/** Reactive curriculum course (skeleton titles always available). */
export function useCurriculumCourse() {
  const [course, setCourse] = useState<Course | undefined>(undefined);

  useEffect(() => {
    const sync = () => setCourse(ensureCurriculumCourse());
    sync();
    window.addEventListener("lamppost-courses-change", sync);
    return () => window.removeEventListener("lamppost-courses-change", sync);
  }, []);

  return course ?? skeleton();
}
