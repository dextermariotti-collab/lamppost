import { describe, expect, it } from "vitest";
import {
  DEFAULT_STATE,
  adoptWallet,
  applyBuyFreeze,
  applyLessonComplete,
  applyReview,
  applyServerPurchase,
  canBuyFreeze,
  deriveInsights,
  gemsEarned,
  mergeAccountProgress,
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
    expect(applyBuyFreeze(rich)).toMatchObject({ gems: 40, gemsSpent: 60, freezes: 2 });
    const full = { ...DEFAULT_STATE, gems: 100, freezes: 2 };
    expect(applyBuyFreeze(full)).toBe(full);
  });

  it("moves gems from the balance to lifetime spent without changing lifetime earned", () => {
    const rich = { ...DEFAULT_STATE, gems: 100, gemsSpent: 20 };
    const bought = applyBuyFreeze(rich);
    expect(gemsEarned(rich)).toBe(120);
    expect(gemsEarned(bought)).toBe(120);
    expect(canBuyFreeze(bought)).toBe(false);
  });
});

describe("a purchase the server made", () => {
  const rich = { ...DEFAULT_STATE, gems: 100, gemsSpent: 20 };

  it("takes the account's lifetime spend and holds the freeze", () => {
    const next = applyServerPurchase(rich, { spent: 80 });
    expect(next).toMatchObject({ gems: 40, gemsSpent: 80, freezes: 2 });
    expect(gemsEarned(next)).toBe(gemsEarned(rich));
  });

  it("also reflects gems another device spent, so the balance is what can really be spent", () => {
    // 20 spent here, the account says 200: two other purchases happened elsewhere.
    const next = applyServerPurchase({ ...rich, gems: 300 }, { spent: 200 });
    expect(next.gems).toBe(300 + 20 - 200);
  });

  it("never holds more freezes than the cap", () => {
    const full = { ...rich, freezes: 2 };
    expect(applyServerPurchase(full, { spent: 80 }).freezes).toBe(2);
  });

  it("can't refund gems from an older reply, or go below zero", () => {
    expect(adoptWallet(rich, { spent: 0 })).toBe(rich);
    expect(adoptWallet(rich, { spent: 20 })).toBe(rich);
    expect(adoptWallet({ ...DEFAULT_STATE, gems: 10 }, { spent: 500 }).gems).toBe(0);
    // A reply without a usable number changes nothing.
    expect(adoptWallet(rich, { spent: Number.NaN })).toBe(rich);
    expect(adoptWallet(rich, {} as { spent: number })).toBe(rich);
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

describe("mergeAccountProgress", () => {
  const account = {
    totalXp: 500,
    gems: 30,
    gemsEarned: 30,
    gemsGranted: 0,
    gemsSpent: 0,
    currentStreak: 5,
    longestStreak: 9,
    lastActiveDay: "2026-09-23",
  };

  it("fills a brand new device from the account", () => {
    const next = mergeAccountProgress(DEFAULT_STATE, account, "2026-09-23");
    expect(next).toMatchObject({
      xp: 500,
      gems: 30,
      streak: 5,
      longestStreak: 9,
      lastActiveDay: "2026-09-23",
    });
  });

  it("never lowers what this device has earned", () => {
    const local = { ...DEFAULT_STATE, xp: 900, gems: 80, longestStreak: 12 };
    const next = mergeAccountProgress(local, account, "2026-09-23");
    expect([next.xp, next.gems, next.longestStreak]).toEqual([900, 80, 12]);
  });

  it("brings a new device the account's balance: what it earned less what it spent", () => {
    const spent = { ...account, gems: 140, gemsEarned: 200, gemsSpent: 60 };
    expect(mergeAccountProgress(DEFAULT_STATE, spent, "2026-09-23")).toMatchObject({
      gems: 140,
      gemsSpent: 60,
    });
  });

  it("keeps the larger earned and the larger spent from each side", () => {
    const local = { ...DEFAULT_STATE, gems: 180, gemsSpent: 120 };
    const next = mergeAccountProgress(
      local,
      { ...account, gems: 140, gemsEarned: 200, gemsSpent: 60 },
      "2026-09-23",
    );
    expect(gemsEarned(next)).toBe(300);
    expect(next).toMatchObject({ gems: 180, gemsSpent: 120 });
  });

  it("does not let a stale account streak overrule a fresher local one", () => {
    // Local: 1-day streak earned today. Account: a 9-day streak that ended on Sep 10.
    const local = { ...DEFAULT_STATE, streak: 1, lastActiveDay: "2026-09-23" };
    const stale = { ...account, currentStreak: 9, lastActiveDay: "2026-09-10" };
    const next = mergeAccountProgress(local, stale, "2026-09-23");
    expect(next.streak).toBe(1);
    expect(next.lastActiveDay).toBe("2026-09-23");
  });

  it("takes the higher streak when both sides were last active the same day", () => {
    const local = { ...DEFAULT_STATE, streak: 1, lastActiveDay: "2026-09-23" };
    expect(mergeAccountProgress(local, account, "2026-09-23").streak).toBe(5);
  });

  it("takes the account's streak when the account was active more recently", () => {
    const local = { ...DEFAULT_STATE, streak: 3, lastActiveDay: "2026-09-21" };
    const next = mergeAccountProgress(local, account, "2026-09-23");
    expect(next.streak).toBe(5);
    expect(next.lastActiveDay).toBe("2026-09-23");
  });

  it("ignores an account day that is later than any timezone could be on", () => {
    const local = { ...DEFAULT_STATE, streak: 1, lastActiveDay: "2026-09-22" };
    const odd = { ...account, currentStreak: 40, lastActiveDay: "2026-12-01" };
    const next = mergeAccountProgress(local, odd, "2026-09-23");
    expect(next.streak).toBe(1);
    expect(next.lastActiveDay).toBe("2026-09-22");
  });

  it("returns the same object when there is nothing to change", () => {
    const local = { ...DEFAULT_STATE, ...{ xp: 500, gems: 30, streak: 5, longestStreak: 9 } };
    const same = { ...local, lastActiveDay: "2026-09-23" };
    expect(mergeAccountProgress(same, account, "2026-09-23")).toBe(same);
  });
});
