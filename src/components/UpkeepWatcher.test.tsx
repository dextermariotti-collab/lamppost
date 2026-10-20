// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LESSONS, unitProgress } from "@/lib/curriculum";
import type { DrillItem } from "@/lib/review-drills";

const h = vi.hoisted(() => ({
  doneLessons: new Set<number>(),
  placedLessonIds: [] as string[],
}));

vi.mock("@/lib/progress", () => ({
  useProgress: () => ({
    state: { placedLessonIds: h.placedLessonIds },
    doneLessons: h.doneLessons,
    hydrated: true,
  }),
}));

import { UpkeepWatcher } from "./UpkeepWatcher";

const queued = () =>
  Object.values(
    JSON.parse(window.localStorage.getItem("lamppost-review-drills-v1") ?? "{}") as Record<
      string,
      DrillItem
    >,
  ).map((item) => item.lessonId);

const unit = unitProgress(new Set())[0]!;

beforeEach(() => {
  window.localStorage.clear();
  h.doneLessons = new Set(unit.lessons.map((lesson) => LESSONS.indexOf(lesson)));
  h.placedLessonIds = [];
});
afterEach(cleanup);

describe("UpkeepWatcher", () => {
  it("keeps up only the lessons of a finished unit that were studied", () => {
    h.placedLessonIds = unit.lessons.slice(0, 4).map((lesson) => lesson.id);
    render(<UpkeepWatcher />);
    expect(queued()).toEqual([unit.lessons[4]!.id]);
  });

  it("schedules nothing for a unit placement marked as known from end to end", () => {
    h.placedLessonIds = unit.lessons.map((lesson) => lesson.id);
    render(<UpkeepWatcher />);
    expect(queued()).toEqual([]);
  });

  it("keeps up every lesson of a unit that was studied", () => {
    render(<UpkeepWatcher />);
    expect(queued()).toEqual(unit.lessons.map((lesson) => lesson.id));
  });
});
