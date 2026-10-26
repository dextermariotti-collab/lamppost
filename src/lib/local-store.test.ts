// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { LESSONS } from "./curriculum";
import { readDrillStore } from "./review-drills";
import { readIntent } from "./onboarding";
import { DEFAULT_STATE, readProgressState } from "./progress-core";
import { readRatingStore } from "./rating";
import { readChecks } from "./unit-checks";

/**
 * A save from an older build, half-written or edited by hand must never break a screen: each
 * store keeps what it can read and drops or defaults the rest.
 */
const A = LESSONS[0]!.id;
beforeEach(() => localStorage.clear());

describe("readProgressState", () => {
  it("reads a good save as it is", () => {
    const save = { ...DEFAULT_STATE, xp: 120, history: { "2026-10-20": 2 }, doneLessonIds: [A] };
    expect(readProgressState(save)).toEqual(save);
  });

  it("gives each damaged field its default and keeps the rest", () => {
    const state = readProgressState({
      xp: 300,
      history: null,
      lessonsByDay: { "2026-10-20": "two", "2026-10-21": 1 },
      freezeLog: "2026-10-20",
      doneLessonIds: [A, 7, null],
      dailyGoal: 400,
      streak: -5,
      celebration: { kind: "party" },
      courses: { "critical-thinking": { topic: "Critical thinking", completed: 3 }, x: 5 },
    });
    expect(state.xp).toBe(300);
    expect(state.history).toEqual({});
    expect(state.lessonsByDay).toEqual({ "2026-10-21": 1 });
    expect(state.freezeLog).toEqual([]);
    expect(state.doneLessonIds).toEqual([A]);
    expect(state.dailyGoal).toBe(10);
    expect(state.streak).toBe(0);
    expect(state.celebration).toBeNull();
    expect(state.courses).toEqual({
      "critical-thinking": { topic: "Critical thinking", completed: 3, total: 0 },
    });
  });

  it("reads an older save without a day-key version as version 1, so its days are upgraded", () => {
    expect(readProgressState({ xp: 1 }).dayKeyVersion).toBe(1);
  });

  it("refuses something that isn't a save at all, so it is kept aside, not written over", () => {
    for (const raw of [null, [], "progress", 3]) expect(() => readProgressState(raw)).toThrow();
  });
});

describe("the other stores", () => {
  it("drop a damaged review and keep the good ones", () => {
    localStorage.setItem(
      "lamppost-review-drills-v1",
      JSON.stringify({
        [`${A}#claim`]: {
          lessonId: A,
          kind: "claim",
          box: 1,
          due: "2026-11-02",
          seen: [],
          reason: "missed",
          at: 1,
        },
        [`${A}#flaw`]: { lessonId: A, kind: "flaw", box: "one" },
        junk: 4,
      }),
    );
    expect(Object.keys(readDrillStore())).toEqual([`${A}#claim`]);
  });

  it("read a ratings save that isn't an object as empty", () => {
    localStorage.setItem("lamppost-rating-v1", "[1,2,3]");
    expect(readRatingStore()).toEqual({});
    localStorage.setItem("lamppost-rating-v1", "{not json");
    expect(readRatingStore()).toEqual({});
  });

  it("keep only well-formed unit check results", () => {
    localStorage.setItem(
      "lamppost-unit-checks-v1",
      JSON.stringify({
        claims: { before: { right: 2, total: 3, day: "2026-10-01" }, after: { right: "2" } },
        evidence: { someday: { right: 1, total: 3, day: "2026-10-01" } },
        biases: null,
      }),
    );
    expect(readChecks()).toEqual({ claims: { before: { right: 2, total: 3, day: "2026-10-01" } } });
  });

  it("read onboarding answers field by field", () => {
    localStorage.setItem(
      "lamppost-intent-v1",
      JSON.stringify({ motivation: "astrology", minutesPerDay: 15, placementSkipped: "yes" }),
    );
    expect(readIntent()).toEqual({
      motivation: null,
      minutesPerDay: 15,
      placementScore: null,
      placementSkipped: false,
    });
  });
});
