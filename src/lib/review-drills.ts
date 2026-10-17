import { useCallback, useEffect, useState } from "react";
import { LESSONS, lessonIndexOf, unitById, unitProgress } from "./curriculum";
import { dayKey, daysBetween, shiftDay } from "./days";
import { skillRating } from "./rating";
import type { ExerciseKind } from "./exercises";

/**
 * Spaced repetition over reasoning drills, not over lesson text.
 *
 * An item is created when a drill actually went badly — wrong, partly wrong, or
 * right but with low stated confidence. It comes back as a FRESH variant of the
 * same skill and drill type, so the learner can't memorize an answer.
 *
 * Intervals: 1d → 3d → 7d → 14d → 30d → 60d → 120d. A miss resets to the first box. A finished
 * unit also puts each of its lessons on the 30-day rung, so skills that never went wrong still
 * come back before they fade (`upkeepEntries`).
 */

const KEY = "lamppost-review-drills-v1";
const EVENT = "lamppost-review-drills-change";

/** Below this stated confidence, a correct answer still earns a review. */
export const LOW_CONFIDENCE = 60;

export const DRILL_INTERVALS = [1, 3, 7, 14, 30, 60, 120];
/** Where a finished unit's lessons join the queue: the 30-day rung. */
export const UPKEEP_BOX = 4;

export type DrillItem = {
  lessonId: string;
  kind: ExerciseKind;
  /** 0-based index into DRILL_INTERVALS. */
  box: number;
  /** YYYY-MM-DD the item is next due. */
  due: string;
  /** Variant numbers already served, so reviews stay fresh. */
  seen: number[];
  /** Why it entered the queue, shown in the schedule. */
  reason: "missed" | "unsure" | "practice" | "keep";
  at: number;
};

type Store = Record<string, DrillItem>;

export const drillKey = (lessonId: string, kind: ExerciseKind) => `${lessonId}#${kind}`;

function daysUntil(due: string, today = dayKey()) {
  return daysBetween(today, due);
}

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
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

/**
 * Called after every drill in a lesson, review or challenge. Only shaky answers
 * are queued; a confident, correct answer either never enters the queue or
 * graduates out of it.
 */
export function trackDrillResult(
  lessonId: string,
  kind: ExerciseKind,
  score: number,
  confidence?: number,
) {
  const store = readStore();
  const key = drillKey(lessonId, kind);
  const existing = store[key];
  const today = dayKey();
  const unsure = score >= 1 && typeof confidence === "number" && confidence < LOW_CONFIDENCE;
  const shaky = score < 1;

  if (!shaky && !unsure) {
    if (!existing) return;
    // Solid answer on a queued item: push it out one box.
    const box = Math.min(existing.box + 1, DRILL_INTERVALS.length - 1);
    writeStore({
      ...store,
      [key]: {
        ...existing,
        box,
        reason: "practice",
        due: shiftDay(today, DRILL_INTERVALS[box]!),
        at: Date.now(),
      },
    });
    return;
  }

  const box = shaky ? 0 : Math.min(existing?.box ?? 0, 1);
  writeStore({
    ...store,
    [key]: {
      lessonId,
      kind,
      box,
      due: shiftDay(today, DRILL_INTERVALS[box]!),
      seen: existing?.seen ?? [],
      reason: shaky ? "missed" : "unsure",
      at: Date.now(),
    },
  });
}

/**
 * Upkeep for a finished unit: one drill per lesson on the 30-day rung, a day apart, so a unit adds
 * about one review a day when it comes due rather than five at once (`spread` pushes the first one
 * later, so several units enrolled together keep to one a day too). The drill type changes from
 * lesson to lesson. A lesson already in the queue keeps its place, which also makes this safe to
 * run on every visit.
 */
export function upkeepEntries(
  store: Store,
  lessons: readonly { id: string; drills: readonly ExerciseKind[] }[],
  today: string,
  now: number,
  spread = 0,
): Store {
  const queued = new Set(Object.values(store).map((item) => item.lessonId));
  const added: Store = {};
  lessons.forEach((lesson, i) => {
    const kind = lesson.drills[i % lesson.drills.length];
    if (queued.has(lesson.id) || !kind) return;
    const day = spread + Object.keys(added).length;
    added[drillKey(lesson.id, kind)] = {
      lessonId: lesson.id,
      kind,
      box: UPKEEP_BOX,
      due: shiftDay(today, DRILL_INTERVALS[UPKEEP_BOX]! + day),
      seen: [],
      reason: "keep",
      at: now,
    };
  });
  return added;
}

/** Puts every finished unit's lessons on the upkeep schedule, once. */
export function enrolFinishedUnits(done: ReadonlySet<number>) {
  const store = readStore();
  let added: Store = {};
  for (const unit of unitProgress(done)) {
    if (unit.state !== "complete") continue;
    const spread = Object.keys(added).length;
    added = {
      ...added,
      ...upkeepEntries({ ...store, ...added }, unit.lessons, dayKey(), Date.now(), spread),
    };
  }
  if (Object.keys(added).length > 0) writeStore({ ...store, ...added });
}

/** Records the outcome of a review/challenge answer against the schedule. */
export function gradeDrillReview(key: string, correct: boolean, variant?: number) {
  const store = readStore();
  const item = store[key];
  if (!item) return;
  const box = correct ? Math.min(item.box + 1, DRILL_INTERVALS.length - 1) : 0;
  const seen = variant !== undefined ? [...new Set([...item.seen, variant])].slice(-20) : item.seen;
  // Once it comes back right, stop calling it a miss: it is upkeep from here.
  const reason: DrillItem["reason"] = !correct
    ? "missed"
    : item.reason === "keep"
      ? "keep"
      : "practice";
  writeStore({
    ...store,
    [key]: {
      ...item,
      box,
      seen,
      reason,
      due: shiftDay(dayKey(), DRILL_INTERVALS[box]!),
      at: Date.now(),
    },
  });
}

export function markVariantSeen(key: string, variant: number) {
  const store = readStore();
  const item = store[key];
  if (!item || item.seen.includes(variant)) return;
  writeStore({ ...store, [key]: { ...item, seen: [...item.seen, variant].slice(-20) } });
}

export type ScheduledDrill = DrillItem & {
  key: string;
  lessonTitle: string;
  lessonIndex: number;
  unitTitle: string;
  dueInDays: number;
  overdueDays: number;
};

function decorate(store: Store): ScheduledDrill[] {
  const today = dayKey();
  return Object.entries(store)
    .flatMap(([key, item]) => {
      const meta = LESSONS.find((l) => l.id === item.lessonId);
      if (!meta) return [];
      const dueInDays = daysUntil(item.due, today);
      return [
        {
          ...item,
          key,
          lessonTitle: meta.title,
          lessonIndex: lessonIndexOf(meta.id),
          unitTitle: unitById(meta.unitId).title,
          dueInDays,
          overdueDays: Math.max(0, -dueInDays),
        },
      ];
    })
    .sort((a, b) => a.dueInDays - b.dueInDays || b.overdueDays - a.overdueDays);
}

function useDrillStore() {
  const [store, setStore] = useState<Store>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setStore(readStore());
    sync();
    setHydrated(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { store, hydrated };
}

/** Everything tracked, with its due date — powers the schedule screen. */
export function useDrillSchedule() {
  const { store, hydrated } = useDrillStore();
  return { items: decorate(store), hydrated };
}

/** Only what is due now, capped so a session stays short. */
export function useDueDrills(limit = 8) {
  const { store, hydrated } = useDrillStore();
  // Due first, then weakest and least-recently-practiced skills at the front.
  const due = decorate(store)
    .filter((item) => item.dueInDays <= 0)
    .sort((a, b) => skillRating(a.lessonId).rating - skillRating(b.lessonId).rating);
  // Interleave drill kinds so one session isn't three of the same exercise.
  const items: typeof due = [];
  const pool = [...due];
  while (pool.length > 0) {
    const lastKind = items[items.length - 1]?.kind;
    const pickIndex = pool.findIndex((item) => item.kind !== lastKind);
    items.push(...pool.splice(pickIndex === -1 ? 0 : pickIndex, 1));
  }
  const grade = useCallback(
    (key: string, correct: boolean, variant?: number) => gradeDrillReview(key, correct, variant),
    [],
  );
  return { items: items.slice(0, limit), total: items.length, hydrated, grade };
}

export function reviewUrgencyFor(due: number, maxOverdue: number) {
  if (due === 0) return "clear" as const;
  if (maxOverdue >= 3 || due >= 6) return "piling" as const;
  return "ready" as const;
}

/** One calm line about when the next review is, for when nothing is due. */
export function nextReviewLine(items: readonly { dueInDays: number }[]): string {
  const upcoming = items.map((item) => item.dueInDays).filter((days) => days > 0);
  if (upcoming.length === 0) return "Drills you miss come back here as new scenarios.";
  const soonest = Math.min(...upcoming);
  return soonest === 1
    ? "Your next review is tomorrow."
    : `Your next review is in ${soonest} days.`;
}
