// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LESSONS, unitProgress } from "./curriculum";
import { shiftDay } from "./days";
import {
  DRILL_INTERVALS,
  UPKEEP_BOX,
  drillKey,
  enrolFinishedUnits,
  trackDrillResult,
  useDueDrills,
  type DrillItem,
} from "./review-drills";

const KEY = "lamppost-review-drills-v1";
const TODAY = "2026-10-19";

const first = LESSONS[0]!;
const second = LESSONS[1]!;

const item = (lessonId: string, due: string, extra: Partial<DrillItem> = {}): DrillItem => ({
  lessonId,
  kind: "flaw",
  box: 2,
  due,
  seen: [],
  reason: "missed",
  at: 1,
  ...extra,
});
const save = (...items: DrillItem[]) =>
  window.localStorage.setItem(
    KEY,
    JSON.stringify(Object.fromEntries(items.map((i) => [drillKey(i.lessonId, i.kind), i]))),
  );
const stored = () =>
  JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, DrillItem>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 19, 12));
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("what is due", () => {
  it("reports the most overdue review, not whichever skill is weakest", () => {
    save(item(first.id, shiftDay(TODAY, -5)), item(second.id, shiftDay(TODAY, -1)));
    // The second lesson is the weaker skill, so it leads the session.
    window.localStorage.setItem(
      "lamppost-rating-v1",
      JSON.stringify({ [second.id]: { rating: 800, answered: 4, run: -2, lastAt: 1, seen: [] } }),
    );
    const { result } = renderHook(() => useDueDrills());
    expect(result.current.items[0]?.lessonId).toBe(second.id);
    expect(result.current.maxOverdue).toBe(5);
  });

  it("counts overdue days past the session cap too", () => {
    save(item(first.id, shiftDay(TODAY, -9)), item(second.id, TODAY, { kind: "judge" }));
    window.localStorage.setItem(
      "lamppost-rating-v1",
      JSON.stringify({ [second.id]: { rating: 800, answered: 4, run: -2, lastAt: 1, seen: [] } }),
    );
    const { result } = renderHook(() => useDueDrills(1));
    expect(result.current.items.map((i) => i.lessonId)).toEqual([second.id]);
    expect(result.current.maxOverdue).toBe(9);
  });

  it("is 0 when nothing is overdue", () => {
    save(item(first.id, TODAY), item(second.id, shiftDay(TODAY, 3)));
    expect(renderHook(() => useDueDrills()).result.current.maxOverdue).toBe(0);
    cleanup();
    window.localStorage.clear();
    expect(renderHook(() => useDueDrills()).result.current.maxOverdue).toBe(0);
  });
});

describe("a right answer during a lesson on a queued skill", () => {
  it("leaves an item that isn't due yet alone, reason and all", () => {
    const keep = item(first.id, shiftDay(TODAY, 20), { box: UPKEEP_BOX, reason: "keep" });
    save(keep);
    trackDrillResult(first.id, "flaw", 1);
    expect(stored()[drillKey(first.id, "flaw")]).toEqual(keep);
  });

  it("counts as the review when the item is due, and upkeep stays upkeep", () => {
    save(item(first.id, TODAY, { box: UPKEEP_BOX, reason: "keep" }));
    trackDrillResult(first.id, "flaw", 1);
    expect(stored()[drillKey(first.id, "flaw")]).toMatchObject({
      box: UPKEEP_BOX + 1,
      due: shiftDay(TODAY, DRILL_INTERVALS[UPKEEP_BOX + 1]!),
      reason: "keep",
    });
  });

  it("still moves a due missed item out a box and stops calling it a miss", () => {
    save(item(first.id, shiftDay(TODAY, -2), { box: 1 }));
    trackDrillResult(first.id, "flaw", 1);
    expect(stored()[drillKey(first.id, "flaw")]).toMatchObject({
      box: 2,
      due: shiftDay(TODAY, DRILL_INTERVALS[2]!),
      reason: "practice",
    });
  });
});

describe("upkeep for lessons placement marked as known", () => {
  const unit = unitProgress(new Set())[0]!;
  const done = new Set(unit.lessons.map((lesson) => LESSONS.indexOf(lesson)));

  it("puts only the lessons actually studied on the upkeep schedule", () => {
    const placed = new Set(unit.lessons.slice(0, -1).map((lesson) => lesson.id));
    enrolFinishedUnits(done, placed);
    expect(Object.values(stored()).map((i) => i.lessonId)).toEqual([unit.lessons.at(-1)!.id]);
  });

  it("enrols every lesson when none were placed", () => {
    enrolFinishedUnits(done);
    expect(Object.values(stored()).map((i) => i.lessonId)).toEqual(
      unit.lessons.map((lesson) => lesson.id),
    );
  });
});
