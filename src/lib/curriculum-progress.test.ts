import { describe, expect, it } from "vitest";
import {
  LESSONS_PER_UNIT,
  TOTAL_LESSONS,
  nextLessonIndex,
  unitEntryIndex,
  unitProgress,
} from "./curriculum";

const first = (n: number) => new Set(Array.from({ length: n }, (_, i) => i));

describe("nextLessonIndex", () => {
  it("suggests the first lesson to a newcomer", () => {
    expect(nextLessonIndex(new Set())).toBe(0);
  });

  it("suggests the first one not finished, wherever the gaps are", () => {
    expect(nextLessonIndex(first(4))).toBe(4);
    expect(nextLessonIndex(new Set([0, 1, 12]))).toBe(2);
    expect(nextLessonIndex(new Set([1, 2, 3]))).toBe(0);
  });

  it("stays on the last lesson once everything is done", () => {
    expect(nextLessonIndex(first(TOTAL_LESSONS))).toBe(TOTAL_LESSONS - 1);
  });
});

describe("unitProgress", () => {
  it("has no locked units: a newcomer can open any of them, and the first is where they are", () => {
    const units = unitProgress(new Set());
    expect(units).toHaveLength(7);
    expect(units.map((u) => u.state)).toEqual([
      "current",
      "open",
      "open",
      "open",
      "open",
      "open",
      "open",
    ]);
  });

  it("counts a unit's lessons by which were finished, in any order", () => {
    const units = unitProgress(new Set([0, 1, 27]));
    expect(units[0]).toMatchObject({
      completed: 2,
      total: LESSONS_PER_UNIT,
      pct: 40,
      state: "current",
    });
    expect(units[5]).toMatchObject({ completed: 1, pct: 20, state: "current" });
    expect(units[5]!.unit.id).toBe("probability");
    expect(units[2]).toMatchObject({ completed: 0, state: "open" });
  });

  it("marks a finished unit complete and moves 'current' to the one holding the next lesson", () => {
    const units = unitProgress(first(LESSONS_PER_UNIT));
    expect(units[0]).toMatchObject({ completed: LESSONS_PER_UNIT, pct: 100, state: "complete" });
    expect(units[1]!.state).toBe("current");
    expect(units[2]!.state).toBe("open");
  });

  it("leaves the learner's own lessons alone when the start of the path is skipped", () => {
    const units = unitProgress(new Set([5, 6, 7, 8, 9]));
    expect(units[1]).toMatchObject({ completed: 5, state: "complete" });
    expect(units[0]).toMatchObject({ completed: 0, state: "current" });
  });
});

describe("unitEntryIndex", () => {
  it("opens a unit on its first lesson not yet finished", () => {
    expect(unitEntryIndex(0, new Set())).toBe(0);
    expect(unitEntryIndex(0, new Set([0, 1]))).toBe(2);
    expect(unitEntryIndex(3, new Set([15, 17]))).toBe(16);
  });

  it("opens a finished unit on its first lesson, to go back over", () => {
    expect(unitEntryIndex(1, new Set([5, 6, 7, 8, 9]))).toBe(5);
  });

  it("never points outside the unit", () => {
    expect(unitEntryIndex(6, new Set([30, 31, 32, 33, 34]))).toBe(30);
  });
});
