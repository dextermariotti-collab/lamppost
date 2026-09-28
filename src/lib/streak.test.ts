import { describe, expect, it } from "vitest";
import { MAX_FREEZES, advanceStreak, type StreakState } from "./streak";

const base: StreakState = {
  streak: 0,
  lastActiveDay: null,
  freezes: 1,
  freezeLog: [],
  freezeSaved: null,
};

describe("advanceStreak", () => {
  it("starts a streak at 1 on the first ever active day", () => {
    expect(advanceStreak(base, "2026-09-23").streak).toBe(1);
  });

  it("does not count a second activity on the same day", () => {
    const state = { ...base, streak: 4, lastActiveDay: "2026-09-23" };
    expect(advanceStreak(state, "2026-09-23").streak).toBe(4);
  });

  it("extends on the next consecutive day", () => {
    const state = { ...base, streak: 4, lastActiveDay: "2026-09-22" };
    expect(advanceStreak(state, "2026-09-23").streak).toBe(5);
  });

  it("spends one freeze per missed day and records the covered days", () => {
    const state = { ...base, streak: 4, lastActiveDay: "2026-09-20", freezes: 2 };
    const next = advanceStreak(state, "2026-09-23");
    expect(next.streak).toBe(5);
    expect(next.freezes).toBe(0);
    expect(next.freezeLog).toEqual(["2026-09-22", "2026-09-21"]);
    expect(next.freezeSaved).toEqual({ days: 2, day: "2026-09-23" });
  });

  it("resets to 1 when the gap is bigger than the freezes held", () => {
    const state = { ...base, streak: 9, lastActiveDay: "2026-09-19", freezes: 1 };
    const next = advanceStreak(state, "2026-09-23");
    expect(next.streak).toBe(1);
    expect(next.freezes).toBe(1);
    expect(next.freezeLog).toEqual([]);
  });

  it("earns a freeze back on every 7th day, up to the cap", () => {
    const state = { ...base, streak: 6, lastActiveDay: "2026-09-22", freezes: 0 };
    expect(advanceStreak(state, "2026-09-23").freezes).toBe(1);
    const full = { ...state, freezes: MAX_FREEZES };
    expect(advanceStreak(full, "2026-09-23").freezes).toBe(MAX_FREEZES);
  });
});
