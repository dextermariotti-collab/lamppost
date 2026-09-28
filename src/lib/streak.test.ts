import { describe, expect, it } from "vitest";
import {
  MAX_FREEZES,
  advanceStreak,
  effectiveStreak,
  streakEndingAtLatest,
  type StreakState,
} from "./streak";

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

describe("advanceStreak across timezones", () => {
  it("does not count a day when the clock moved back behind the last active day", () => {
    // Active in Tokyo on Sep 24, then landed in New York where it's still Sep 23.
    const state = { ...base, streak: 4, lastActiveDay: "2026-09-24" };
    const next = advanceStreak(state, "2026-09-23");
    expect(next.streak).toBe(4);
    expect(next.freezes).toBe(state.freezes);
  });
});

describe("effectiveStreak — the one number every screen shows", () => {
  const held = (patch: Partial<StreakState>): StreakState => ({
    ...base,
    streak: 5,
    lastActiveDay: "2026-09-23",
    freezes: 0,
    ...patch,
  });

  it("is 0 before any activity", () => {
    expect(effectiveStreak(base, "2026-09-23")).toBe(0);
  });

  it("keeps the streak on the day it was earned and the day after", () => {
    expect(effectiveStreak(held({}), "2026-09-23")).toBe(5);
    expect(effectiveStreak(held({}), "2026-09-24")).toBe(5);
  });

  it("drops to 0 once a whole day was missed and no freeze covers it", () => {
    expect(effectiveStreak(held({}), "2026-09-25")).toBe(0);
    expect(effectiveStreak(held({}), "2026-10-20")).toBe(0);
  });

  it("holds the streak while a freeze can still cover the gap", () => {
    expect(effectiveStreak(held({ freezes: 1 }), "2026-09-25")).toBe(5);
    expect(effectiveStreak(held({ freezes: 1 }), "2026-09-26")).toBe(0);
  });

  it("is not lowered by a clock that is behind the last active day", () => {
    expect(effectiveStreak(held({ lastActiveDay: "2026-09-24" }), "2026-09-23")).toBe(5);
  });

  it("agrees with what advanceStreak will do next, so a lesson never 'resets' a shown streak", () => {
    for (const freezes of [0, 1, 2]) {
      for (const today of ["2026-09-23", "2026-09-24", "2026-09-25", "2026-09-27"]) {
        const state = held({ freezes });
        const shown = effectiveStreak(state, today);
        const after = advanceStreak(state, today).streak;
        // Either the streak survives (and grows by at most one) or it restarts at 1.
        if (shown > 0) expect(after).toBeGreaterThanOrEqual(shown);
        else expect(after).toBe(1);
      }
    }
  });
});

describe("streakEndingAtLatest (the server's streak)", () => {
  it("is 0 with no activity", () => {
    expect(streakEndingAtLatest([])).toEqual({ streak: 0, lastActiveDay: null });
  });

  it("counts the run of consecutive days ending at the latest one", () => {
    const days = ["2026-09-19", "2026-09-21", "2026-09-22", "2026-09-23"];
    expect(streakEndingAtLatest(days)).toEqual({ streak: 3, lastActiveDay: "2026-09-23" });
  });

  it("agrees with the device: the streak the client shows after each new day", () => {
    let state: StreakState = { ...base, freezes: 0 };
    const days: string[] = [];
    for (const day of ["2026-09-20", "2026-09-21", "2026-09-22", "2026-09-25", "2026-09-26"]) {
      const next = advanceStreak(state, day);
      state = { ...state, ...next, lastActiveDay: day };
      days.push(day);
      expect(streakEndingAtLatest(days).streak).toBe(state.streak);
    }
  });

  it("lets a freeze day bridge a gap without adding to the count", () => {
    const days = ["2026-09-20", "2026-09-21", "2026-09-23", "2026-09-24"];
    expect(streakEndingAtLatest(days, ["2026-09-22"]).streak).toBe(4);
    expect(streakEndingAtLatest(days).streak).toBe(2);
  });

  it("does not let a forged freeze log invent a long streak", () => {
    const active = ["2026-09-01", "2026-09-30"];
    const forged = Array.from(
      { length: 28 },
      (_, i) => `2026-09-${String(i + 2).padStart(2, "0")}`,
    );
    // Two active days can bridge at most MAX_FREEZES gaps, nowhere near 28.
    const { streak } = streakEndingAtLatest(active, forged);
    expect(streak).toBeLessThanOrEqual(1 + MAX_FREEZES);
  });

  it("ignores freeze days that touch nothing", () => {
    expect(streakEndingAtLatest(["2026-09-23"], ["2026-09-10", "2026-09-11"]).streak).toBe(1);
  });
});
