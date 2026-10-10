import { describe, expect, it } from "vitest";
import {
  DEFAULT_STATE,
  adoptWallet,
  applyLessonComplete,
  applyUnlockLessons,
  doneLessonIndexes,
  applyReview,
  applyCase,
  deriveInsights,
  gemsEarned,
  mergeAccountProgress,
  type ProgressState,
} from "./progress-core";

const lesson = { slug: "critical-thinking", topic: "Critical thinking", index: 0, total: 35 };
const never = () => 0.99; // no bonus-XP roll

describe("applyLessonComplete", () => {
  it("pays XP (and no gems, which are retired), records the day and starts the streak", () => {
    const next = applyLessonComplete(DEFAULT_STATE, lesson, "2026-09-23", 1, never);
    expect(next.xp).toBe(50);
    expect(next.gems).toBe(0);
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

describe("finishing lessons in any order", () => {
  const slug = lesson.slug;

  it("records the lesson that was done, not everything before it", () => {
    const next = applyLessonComplete(
      DEFAULT_STATE,
      { ...lesson, index: 12 },
      "2026-09-23",
      1,
      never,
    );
    expect(doneLessonIndexes(next, slug)).toEqual([12]);
    expect(next.courses[slug]?.completed).toBe(1);
    expect(next.xp).toBe(50);
  });

  it("keeps the count equal to the number of lessons done", () => {
    let state: ProgressState = DEFAULT_STATE;
    for (const index of [20, 0, 7, 20]) {
      state = applyLessonComplete(state, { ...lesson, index }, "2026-09-23", 1, never);
    }
    expect(doneLessonIndexes(state, slug)).toEqual([0, 7, 20]);
    expect(state.courses[slug]?.completed).toBe(3);
  });

  it("pays nothing for a lesson that was already done, even out of order", () => {
    const once = applyLessonComplete(
      DEFAULT_STATE,
      { ...lesson, index: 9 },
      "2026-09-23",
      1,
      never,
    );
    expect(applyLessonComplete(once, { ...lesson, index: 9 }, "2026-09-24", 2, never)).toBe(once);
  });

  it("reads a save from before lessons were tracked as the first lessons", () => {
    const legacy: ProgressState = {
      ...DEFAULT_STATE,
      courses: { [slug]: { topic: "Critical thinking", completed: 3, total: 35 } },
    };
    expect(doneLessonIndexes(legacy, slug)).toEqual([0, 1, 2]);
    const next = applyLessonComplete(legacy, { ...lesson, index: 10 }, "2026-09-23", 1, never);
    expect(doneLessonIndexes(next, slug)).toEqual([0, 1, 2, 10]);
    expect(next.courses[slug]?.completed).toBe(4);
  });

  it("still counts the next lesson in order the way it always did", () => {
    let state: ProgressState = DEFAULT_STATE;
    for (let index = 0; index < 3; index++) {
      state = applyLessonComplete(state, { ...lesson, index }, "2026-09-23", 1, never);
    }
    expect(doneLessonIndexes(state, slug)).toEqual([0, 1, 2]);
    expect(state.courses[slug]?.completed).toBe(3);
  });
});

describe("applyUnlockLessons", () => {
  const args = ["critical-thinking", "Critical thinking"] as const;

  it("marks the first lessons as known without paying anything", () => {
    const next = applyUnlockLessons(DEFAULT_STATE, ...args, 4, 35);
    expect(doneLessonIndexes(next, args[0])).toEqual([0, 1, 2, 3]);
    expect(next.courses[args[0]]?.completed).toBe(4);
    expect(next.xp).toBe(0);
    expect(next.streak).toBe(0);
  });

  it("adds to lessons already done elsewhere instead of replacing them", () => {
    const done = applyLessonComplete(
      DEFAULT_STATE,
      { ...lesson, index: 12 },
      "2026-09-23",
      1,
      never,
    );
    const next = applyUnlockLessons(done, ...args, 2, 35);
    expect(doneLessonIndexes(next, args[0])).toEqual([0, 1, 12]);
    expect(next.courses[args[0]]?.completed).toBe(3);
  });

  it("changes nothing when those lessons are already known", () => {
    const once = applyUnlockLessons(DEFAULT_STATE, ...args, 4, 35);
    expect(applyUnlockLessons(once, ...args, 3, 35)).toBe(once);
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

describe("applyCase", () => {
  it("counts once for the day and the streak, and pays for each question right", () => {
    const all = applyCase(DEFAULT_STATE, 3, "2026-09-23");
    const none = applyCase(DEFAULT_STATE, 0, "2026-09-23");
    expect([all.xp, none.xp]).toEqual([35, 5]);
    expect(all.streak).toBe(1);
    expect(all.history["2026-09-23"]).toBe(1);
    expect(applyCase(DEFAULT_STATE, 9, "2026-09-23").xp).toBe(35);
  });
});

describe("taking the account's wallet", () => {
  const rich = { ...DEFAULT_STATE, gems: 100, gemsSpent: 20 };

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

describe("wallet adoption with grants", () => {
  it("adds grants to the balance and leaves lifetime earned alone", () => {
    const local = { ...DEFAULT_STATE, gems: 50, gemsSpent: 10 };
    const next = adoptWallet(local, { spent: 10, granted: 30 });
    expect(next.gems).toBe(80);
    expect(gemsEarned(next)).toBe(gemsEarned(local));
  });

  it("works with a reply that has no grants in it", () => {
    const local = { ...DEFAULT_STATE, gems: 50, gemsGranted: 20 };
    expect(adoptWallet(local, { spent: 0 })).toBe(local);
    expect(adoptWallet(local, { spent: 5 }).gems).toBe(45);
  });
});
