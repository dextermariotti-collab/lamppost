import { describe, expect, it } from "vitest";
import {
  BACKFILL_DAYS,
  MAX_ACTIVITY_PER_DAY,
  MAX_XP_PER_DAY,
  activityToStore,
  boundedTotal,
  growthAllowance,
} from "./progress-limits";

const now = new Date("2026-09-24T01:30:00Z"); // 9:30pm Sep 23 in Eastern
const today = "2026-09-23";

describe("activityToStore", () => {
  const history = {
    "2026-09-23": 3,
    "2026-09-22": 2,
    "2026-09-10": 4,
    "2026-08-01": 1,
    "2026-09-26": 5,
  };

  it("imports the whole history on the first sync, minus days that can't exist yet", () => {
    const days = activityToStore(history, { today, firstSync: true, now }).map(([d]) => d);
    expect(days).toEqual(["2026-09-23", "2026-09-22", "2026-09-10", "2026-08-01"]);
  });

  it("afterwards only accepts the recent days, so a streak can't be back-dated", () => {
    const days = activityToStore(history, { today, firstSync: false, now }).map(([d]) => d);
    expect(days).toEqual(["2026-09-23", "2026-09-22"]);
    expect(BACKFILL_DAYS).toBe(7);
  });

  it("caps what one day can count for", () => {
    const stored = activityToStore({ [today]: 5000 }, { today, firstSync: false, now });
    expect(stored).toEqual([[today, MAX_ACTIVITY_PER_DAY]]);
  });
});

describe("growthAllowance / boundedTotal", () => {
  it("scales with the time since the last sync", () => {
    const soon = growthAllowance({
      perDay: MAX_XP_PER_DAY,
      lastSyncedAt: new Date("2026-09-24T01:00:00Z"),
      activeDays: 0,
      now,
    });
    const later = growthAllowance({
      perDay: MAX_XP_PER_DAY,
      lastSyncedAt: new Date("2026-09-14T01:00:00Z"),
      activeDays: 0,
      now,
    });
    expect(soon).toBe(MAX_XP_PER_DAY * 2);
    expect(later).toBe(MAX_XP_PER_DAY * 12); // 11 days elapsed (rounded up) + 1 of slack
  });

  it("sizes the first sync by the days of activity being imported", () => {
    expect(growthAllowance({ perDay: 100, lastSyncedAt: null, activeDays: 9, now })).toBe(1000);
  });

  it("lets a real learner's numbers through unchanged", () => {
    const allowance = growthAllowance({
      perDay: MAX_XP_PER_DAY,
      lastSyncedAt: null,
      activeDays: 3,
      now,
    });
    expect(boundedTotal(0, 379, allowance)).toBe(379);
  });

  it("clamps a forged jump to the allowance, and never lowers a total", () => {
    const allowance = growthAllowance({
      perDay: MAX_XP_PER_DAY,
      lastSyncedAt: new Date("2026-09-24T01:00:00Z"),
      activeDays: 0,
      now,
    });
    expect(boundedTotal(500, 9_999_999, allowance)).toBe(500 + allowance);
    expect(boundedTotal(500, 100, allowance)).toBe(500);
    expect(boundedTotal(500, -50, allowance)).toBe(500);
  });
});
