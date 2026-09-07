import { useEffect, useState } from "react";
import type { Course } from "./courses";

const KEY = "lamppost-courses-v1";
const EVENT = "lamppost-courses-change";

type Store = Record<string, Course>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

export function saveCourse(course: Course) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...readStore(), [course.slug]: course };
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function getStoredCourse(slug: string): Course | undefined {
  return readStore()[slug];
}

export function listStoredCourses(): Course[] {
  return Object.values(readStore());
}

/** Reactive list of the learner's generated courses. */
export function useStoredCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setCourses(listStoredCourses());
    sync();
    setHydrated(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { courses, hydrated };
}

/** Reads a stored (AI-generated) course after hydration. */
export function useStoredCourse(slug: string) {
  const [course, setCourse] = useState<Course | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setCourse(getStoredCourse(slug));
    sync();
    setHydrated(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [slug]);

  return { course, hydrated };
}
