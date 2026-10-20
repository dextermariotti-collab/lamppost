import { describe, expect, it } from "vitest";
import {
  BACKFILL_DAYS,
  FIRST_SYNC_DAYS,
  MAX_ACTIVITY_PER_DAY,
  MAX_DONE_LESSONS,
  MAX_FREEZE_DAYS,
  MAX_XP_PER_DAY,
  SYNC_BURST_DAYS,
  activityToStore,
  boundedTotal,
  creditedUntil,
  doneLessonsToStore,
  firstSyncCarryOver,
  freezeDaysToUse,
  growthAllowance,
  weeklyXpCredit,
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

  it("afterward only accepts the recent days, so a streak can't be back-dated", () => {
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
  it("scales with the time since the last sync, not with whole days rounded up", () => {
    const soon = growthAllowance({
      perDay: MAX_XP_PER_DAY,
      lastSyncedAt: new Date("2026-09-24T01:00:00Z"), // 30 minutes ago
      activeDays: 0,
      now,
    });
    const later = growthAllowance({
      perDay: MAX_XP_PER_DAY,
      lastSyncedAt: new Date("2026-09-14T01:30:00Z"), // exactly 10 days ago
      activeDays: 0,
      now,
    });
    expect(soon).toBe(Math.floor(MAX_XP_PER_DAY * (1 / 48 + SYNC_BURST_DAYS)));
    expect(soon).toBeLessThan(MAX_XP_PER_DAY);
    expect(later).toBe(MAX_XP_PER_DAY * (10 + SYNC_BURST_DAYS));
  });

  it("never allows more than the first sync's window, however long it has been", () => {
    const allowance = growthAllowance({
      perDay: MAX_XP_PER_DAY,
      lastSyncedAt: new Date("2025-01-01T00:00:00Z"),
      activeDays: 0,
      now,
    });
    expect(allowance).toBe(MAX_XP_PER_DAY * FIRST_SYNC_DAYS);
  });

  it("shares one burst between syncs in quick succession", () => {
    // A forged client syncing every second, each time claiming as much as it may.
    let mark: Date = new Date("2026-09-24T01:00:00Z");
    let total = 0;
    for (let i = 0; i < 200; i++) {
      const at = new Date(now.getTime() + i * 1000);
      const allowance = growthAllowance({
        perDay: MAX_XP_PER_DAY,
        lastSyncedAt: mark,
        activeDays: 0,
        now: at,
      });
      total += allowance;
      mark = creditedUntil({
        lastSyncedAt: mark,
        growth: [{ gained: allowance, perDay: MAX_XP_PER_DAY }],
        now: at,
      });
    }
    // 30 minutes and 200 seconds of time, plus one burst: nowhere near 200 bursts.
    const elapsedDays = (30 * 60 + 200) / 86_400;
    expect(total).toBeLessThanOrEqual(MAX_XP_PER_DAY * (elapsedDays + SYNC_BURST_DAYS) + 1);
    expect(total).toBeGreaterThan(MAX_XP_PER_DAY * SYNC_BURST_DAYS);
  });

  it("keeps time that went unused for the next sync", () => {
    const last = new Date("2026-09-23T01:30:00Z"); // a day ago
    const mark = creditedUntil({
      lastSyncedAt: last,
      growth: [{ gained: 1000, perDay: MAX_XP_PER_DAY }],
      now,
    });
    expect(mark.getTime()).toBe(last.getTime() + 0.25 * 86_400_000);
    expect(creditedUntil({ lastSyncedAt: null, growth: [], now })).toEqual(now);
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

describe("freezeDaysToUse", () => {
  it("keeps real past days once each, and only the most recent few", () => {
    const log = ["2026-09-20", "2026-09-20", "not-a-day", "2026-09-30", "2026-09-21"];
    expect(freezeDaysToUse(log, today)).toEqual(["2026-09-21", "2026-09-20"]);
    const many = Array.from(
      { length: 60 },
      (_, i) => `2026-07-${String((i % 28) + 1).padStart(2, "0")}`,
    ).concat(Array.from({ length: 31 }, (_, i) => `2026-08-${String(i + 1).padStart(2, "0")}`));
    const kept = freezeDaysToUse(many, today);
    expect(kept).toHaveLength(MAX_FREEZE_DAYS);
    expect(kept[0]).toBe("2026-08-31");
  });
});

describe("firstSyncCarryOver", () => {
  const isCosmetic = (id: string) => ["crown", "bow"].includes(id);
  const carry = (claim: Parameters<typeof firstSyncCarryOver>[0]["claim"], earned = 500) =>
    firstSyncCarryOver({ claim, earnedPlusGranted: earned, maxHintTokens: 5, isCosmetic });

  it("brings across what a signed-out learner spent and unlocked", () => {
    expect(carry({ gemsSpent: 160, hintTokens: 2, cosmetics: ["crown", "bow"] })).toEqual({
      gemsSpent: 160,
      hintTokens: 2,
      cosmetics: ["crown", "bow"],
    });
  });

  it("never lets someone have spent more than they earned", () => {
    expect(carry({ gemsSpent: 99_999, hintTokens: 0, cosmetics: [] }, 300).gemsSpent).toBe(300);
    expect(carry({ gemsSpent: -50, hintTokens: 0, cosmetics: [] }).gemsSpent).toBe(0);
  });

  it("caps hint tokens at the pouch", () => {
    expect(carry({ gemsSpent: 0, hintTokens: 99, cosmetics: [] }).hintTokens).toBe(5);
    expect(carry({ gemsSpent: 0, hintTokens: -3, cosmetics: [] }).hintTokens).toBe(0);
  });

  it("only unlocks things that exist, once each", () => {
    expect(
      carry({ gemsSpent: 0, hintTokens: 0, cosmetics: ["crown", "crown", "godmode", "hat"] })
        .cosmetics,
    ).toEqual(["crown"]);
  });

  it("carries nothing when nothing was claimed", () => {
    expect(carry(undefined)).toEqual({ gemsSpent: 0, hintTokens: 0, cosmetics: [] });
  });

  it("rounds a fractional claim down", () => {
    expect(carry({ gemsSpent: 60.9, hintTokens: 1.9, cosmetics: [] })).toMatchObject({
      gemsSpent: 60,
      hintTokens: 1,
    });
  });
});

describe("weeklyXpCredit", () => {
  it("credits the growth in the account's XP since the last sync", () => {
    expect(weeklyXpCredit({ firstSync: false, before: 300, after: 380 })).toBe(80);
  });

  it("credits nothing on the first sync, which imports everything from before signing in", () => {
    expect(weeklyXpCredit({ firstSync: true, before: 0, after: 4000 })).toBe(0);
  });

  it("credits nothing when XP didn't grow", () => {
    expect(weeklyXpCredit({ firstSync: false, before: 300, after: 300 })).toBe(0);
    expect(weeklyXpCredit({ firstSync: false, before: 300, after: 100 })).toBe(0);
  });
});

describe("doneLessonsToStore", () => {
  const known = new Set(["a", "b", "c"]);

  it("adds the real lessons a device reports, once each", () => {
    expect(doneLessonsToStore([], ["b", "a", "b"], known)).toEqual(["b", "a"]);
    expect(doneLessonsToStore(["a"], ["a", "c"], known)).toEqual(["a", "c"]);
  });

  it("stores nothing new for ids it doesn't know or already has", () => {
    expect(doneLessonsToStore(["a"], ["a", "made-up"], known)).toBeNull();
    expect(doneLessonsToStore([], [], known)).toBeNull();
  });

  it("never drops a stored lesson, even one the curriculum no longer has", () => {
    expect(doneLessonsToStore(["retired"], ["b"], known)).toEqual(["retired", "b"]);
  });

  it("keeps the list within the database's bound", () => {
    const many = Array.from({ length: MAX_DONE_LESSONS + 5 }, (_, i) => `l${i}`);
    const stored = doneLessonsToStore([], many, new Set(many));
    expect(stored).toHaveLength(MAX_DONE_LESSONS);
  });
});
