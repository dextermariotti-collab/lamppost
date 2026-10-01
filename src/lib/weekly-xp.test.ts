import { describe, expect, it } from "vitest";
import { DEFAULT_STATE, type ProgressState } from "./progress-core";
import { withWeeklyXp } from "./weekly-xp";

const DAY = "2026-09-28";

describe("weekly XP on this device", () => {
  const earn = (prev: ProgressState, xp: number, day = DAY) =>
    withWeeklyXp(prev, { ...prev, xp: prev.xp + xp }, day);

  it("adds the XP a transition earned to that day's week", () => {
    const next = earn(DEFAULT_STATE, 50);
    expect(next.weeklyXp).toEqual({ "2026-09-28": 50 });
    expect(earn(next, 25, "2026-10-02").weeklyXp).toEqual({ "2026-09-28": 75 });
    expect(earn(next, 25, "2026-10-05").weeklyXp).toEqual({ "2026-09-28": 50, "2026-10-05": 25 });
  });

  it("counts nothing when no XP was earned, or when XP went down", () => {
    expect(withWeeklyXp(DEFAULT_STATE, DEFAULT_STATE, DAY)).toBe(DEFAULT_STATE);
    const higher = { ...DEFAULT_STATE, xp: 100 };
    expect(withWeeklyXp(higher, { ...higher, xp: 40 }, DAY).weeklyXp).toEqual({});
  });

  it("keeps the last twelve weeks", () => {
    let state = DEFAULT_STATE;
    for (let week = 0; week < 15; week++) {
      const day = new Date(Date.UTC(2026, 0, 5 + week * 7)).toISOString().slice(0, 10);
      state = earn(state, 10, day);
    }
    const weeks = Object.keys(state.weeklyXp).sort();
    expect(weeks).toHaveLength(12);
    expect(weeks[0]).toBe("2026-01-26");
  });
});
