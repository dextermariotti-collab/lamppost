import { describe, expect, it } from "vitest";
import {
  DEFAULT_STATE,
  applyBuyFreeze,
  applyLessonComplete,
  applyReview,
  deriveInsights,
  type ProgressState,
} from "./progress-core";

const lesson = { slug: "critical-thinking", topic: "Critical thinking", index: 0, total: 35 };
const never = () => 0.99; // no bonus-XP roll

describe("applyLessonComplete", () => {
  it("pays XP and gems, records the day and starts the streak", () => {
    const next = applyLessonComplete(DEFAULT_STATE, lesson, "2026-09-23", 1, never);
    expect(next.xp).toBe(50);
    expect(next.gems).toBe(10);
    expect(next.streak).toBe(1);
    expect(next.lastActiveDay).toBe("2026-09-23");
    expect(next.history).toEqual({ "2026-09-23": 1 });
    expect(next.courses[lesson.slug]?.completed).toBe(1);
  });

  it("pays nothing when the lesson was already completed", () => {
    const once = applyLessonComplete(DEFAULT_STATE, lesson, "2026-09-23", 1, never);
    expect(applyLessonComplete(once, lesson, "2026-09-23", 2, never)).toBe(once);
  });

  it("counts several lessons on one day once for the streak", () => {
    let state: ProgressState = DEFAULT_STATE;
    for (let index = 0; index < 3; index++) {
      state = applyLessonComplete(state, { ...lesson, index }, "2026-09-23", 1, never);
    }
    expect(state.history["2026-09-23"]).toBe(3);
    expect(state.streak).toBe(1);
  });
});

describe("applyReview", () => {
  it("keeps the streak alive and pays less for a miss", () => {
    const right = applyReview(DEFAULT_STATE, true, "2026-09-23");
    const wrong = applyReview(DEFAULT_STATE, false, "2026-09-23");
    expect([right.xp, wrong.xp]).toEqual([20, 5]);
    expect(right.streak).toBe(1);
    expect(right.history["2026-09-23"]).toBe(1);
  });
});

describe("applyBuyFreeze", () => {
  it("needs enough gems and stops at the cap", () => {
    const poor = { ...DEFAULT_STATE, gems: 59 };
    expect(applyBuyFreeze(poor)).toBe(poor);
    const rich = { ...DEFAULT_STATE, gems: 100 };
    expect(applyBuyFreeze(rich)).toMatchObject({ gems: 40, freezes: 2 });
    const full = { ...DEFAULT_STATE, gems: 100, freezes: 2 };
    expect(applyBuyFreeze(full)).toBe(full);
  });
});

describe("deriveInsights", () => {
  it("reads today's count from the history for the given moment", () => {
    const state = { ...DEFAULT_STATE, history: { "2026-09-23": 2, "2026-09-22": 1 } };
    const insights = deriveInsights(state, new Date(2026, 8, 23, 12, 0));
    expect(insights.doneToday).toBe(2);
    expect(insights.thisWeek).toBe(3);
  });

  it("flags the streak as at risk late in a day with nothing done", () => {
    const state = { ...DEFAULT_STATE, streak: 3, lastActiveDay: "2026-09-22" };
    expect(deriveInsights(state, new Date(2026, 8, 23, 20, 0)).atRisk).toBe(true);
    expect(deriveInsights(state, new Date(2026, 8, 23, 9, 0)).atRisk).toBe(false);
  });
});
