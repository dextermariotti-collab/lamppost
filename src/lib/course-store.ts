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

/**
 * Change notifications are deferred and de-duplicated.
 *
 * Dispatching synchronously from inside `saveCourse` meant a listener that
 * itself normalised and re-saved the course re-entered `saveCourse` on the same
 * call stack — one blip of disagreement between two writers was enough to
 * recurse until the stack blew up. A queued, guarded notification keeps writers
 * and readers on separate turns of the event loop.
 */
let notifyQueued = false;
function notify() {
  if (typeof window === "undefined" || notifyQueued) return;
  notifyQueued = true;
  window.setTimeout(() => {
    notifyQueued = false;
    window.dispatchEvent(new Event(EVENT));
  }, 0);
}

export function saveCourse(course: Course) {
  if (typeof window === "undefined") return;
  try {
    const store = readStore();
    const serialized = JSON.stringify(course);
    // No-op writes would otherwise re-fire the change event and loop listeners.
    if (store[course.slug] && JSON.stringify(store[course.slug]) === serialized) return;
    const next = { ...store, [course.slug]: course };
    window.localStorage.setItem(KEY, JSON.stringify(next));
    notify();
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
