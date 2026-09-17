import { useCallback, useEffect, useState } from "react";
import type { Course, Lesson } from "./courses";
import { getStoredCourse, saveCourse } from "./course-store";
import {
  CURRICULUM_SLUG,
  CURRICULUM_TAGLINE,
  CURRICULUM_TITLE,
  LESSONS,
  lessonAt,
} from "./curriculum";
import { getCurriculumLesson } from "./curriculum.functions";

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
 * Loads one curriculum lesson.
 *
 * A lesson the learner has already finished is served from their local copy so
 * their own drills and answers stay put. A lesson they have NOT finished always
 * refetches the current shared version — otherwise someone who started a lesson
 * before a content fix would keep seeing the broken drills forever.
 */
export function useCurriculumLesson(index: number, completedLessons = 0) {
  const meta = lessonAt(index);
  const [lesson, setLesson] = useState<Lesson | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const finished = index < completedLessons;

  useEffect(() => {
    if (!meta) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const course = ensureCurriculumCourse();
    const local = course.lessons[index];

    if (finished && hasLessonContent(local)) {
      setLesson(local);
      setLoading(false);
      return;
    }

    setLesson(undefined);
    setLoading(true);
    setError(null);

    void getCurriculumLesson({ data: { lessonId: meta.id } })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          const merged: Lesson = {
            ...result.lesson,
            title: meta.title,
            subtitle: meta.objective,
            emoji: meta.emoji,
          };
          storeLesson(index, merged);
          setLesson(merged);
        } else {
          setError(result.reason);
        }
      })
      .catch(() => {
        if (!cancelled) setError("This lesson couldn't be loaded. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [index, meta, attempt, finished]);

  return { lesson, meta, loading, error, retry, ready: hasLessonContent(lesson) };
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
