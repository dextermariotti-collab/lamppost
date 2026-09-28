import { describe, expect, it } from "vitest";
import { dayKey } from "./days";
import { migrateHistoryToLocalDays, readActivityTimes } from "./progress-migrate";
import { DEFAULT_STATE, type ProgressState } from "./progress-core";
import { EASTERN, withTimeZone } from "@/test/time";

const legacy = (patch: Partial<ProgressState>): ProgressState => ({
  ...DEFAULT_STATE,
  dayKeyVersion: 1,
  ...patch,
});

const at = (iso: string) => new Date(iso).getTime();

/** "Now" is 9:30pm Wednesday 23 Sep 2026 in US Eastern. */
const NOW = new Date("2026-09-24T01:30:00Z");

describe("migrateHistoryToLocalDays", () => {
  it("moves an evening session that was keyed by its UTC day back to the local day", () => {
    withTimeZone(EASTERN, () => {
      const state = legacy({
        streak: 2,
        lastActiveDay: "2026-09-24",
        history: { "2026-09-22": 1, "2026-09-24": 2 },
      });
      const times = [
        at("2026-09-22T15:00:00Z"), // 11am Sep 22 local — same day either way
        at("2026-09-24T01:10:00Z"), // 9:10pm Sep 23 local
        at("2026-09-24T01:25:00Z"), // 9:25pm Sep 23 local
      ];
      const next = migrateHistoryToLocalDays(state, times, NOW);
      expect(next.history).toEqual({ "2026-09-22": 1, "2026-09-23": 2 });
      expect(next.lastActiveDay).toBe("2026-09-23");
      expect(next.dayKeyVersion).toBe(2);
      expect(next.streak).toBe(2);
    });
  });

  it("splits a UTC day between the local days its activity really fell on, keeping the total", () => {
    withTimeZone(EASTERN, () => {
      const state = legacy({ history: { "2026-09-24": 3 }, lastActiveDay: "2026-09-24" });
      const times = [
        at("2026-09-24T01:30:00Z"), // Sep 23 local
        at("2026-09-24T02:00:00Z"), // Sep 23 local
        at("2026-09-24T15:00:00Z"), // Sep 24 local
        at("2026-09-24T16:00:00Z"), // Sep 24 local
      ];
      const next = migrateHistoryToLocalDays(state, times, new Date("2026-09-24T18:00:00Z"));
      const total = Object.values(next.history).reduce((a, b) => a + b, 0);
      expect(total).toBe(3);
      expect(Object.keys(next.history).sort()).toEqual(["2026-09-23", "2026-09-24"]);
      expect(next.lastActiveDay).toBe("2026-09-24");
    });
  });

  it("moves days forward for a device east of UTC", () => {
    withTimeZone("Pacific/Auckland", () => {
      const state = legacy({ history: { "2026-09-23": 1 }, lastActiveDay: "2026-09-23" });
      const times = [at("2026-09-23T20:00:00Z")]; // 8am Sep 24 in Auckland
      const next = migrateHistoryToLocalDays(state, times, new Date("2026-09-23T23:00:00Z"));
      expect(next.history).toEqual({ "2026-09-24": 1 });
      expect(next.lastActiveDay).toBe("2026-09-24");
    });
  });

  it("leaves days it has no evidence about alone", () => {
    withTimeZone(EASTERN, () => {
      const state = legacy({ history: { "2026-09-20": 2 }, lastActiveDay: "2026-09-20" });
      const next = migrateHistoryToLocalDays(state, [], NOW);
      expect(next.history).toEqual({ "2026-09-20": 2 });
      expect(next.lastActiveDay).toBe("2026-09-20");
      expect(next.dayKeyVersion).toBe(2);
    });
  });

  it("never leaves activity dated after the local today", () => {
    withTimeZone(EASTERN, () => {
      const state = legacy({
        history: { "2026-09-23": 1, "2026-09-24": 1 },
        lastActiveDay: "2026-09-24",
      });
      const next = migrateHistoryToLocalDays(state, [], NOW);
      expect(dayKey(NOW)).toBe("2026-09-23");
      expect(next.history).toEqual({ "2026-09-23": 2 });
      expect(next.lastActiveDay).toBe("2026-09-23");
    });
  });

  it("drops freeze-log days that now have real activity", () => {
    withTimeZone(EASTERN, () => {
      const state = legacy({
        history: { "2026-09-23": 1 },
        freezeLog: ["2026-09-21", "2026-09-23", "2026-09-24"],
      });
      expect(migrateHistoryToLocalDays(state, [], NOW).freezeLog).toEqual(["2026-09-21"]);
    });
  });

  it("runs once: an already migrated state comes back untouched", () => {
    const state = { ...DEFAULT_STATE, history: { "2026-09-24": 1 } };
    expect(state.dayKeyVersion).toBe(2);
    expect(migrateHistoryToLocalDays(state, [at("2026-09-24T01:30:00Z")], NOW)).toBe(state);
  });
});

describe("readActivityTimes", () => {
  it("gathers timestamps from the stores that record when things happened", () => {
    const data: Record<string, string> = {
      "lamppost-exercises-v1": JSON.stringify({
        "a#0": { answer: 1, score: 1, at: 1000 },
        "a#1": { answer: 2, score: 0, at: 2000 },
      }),
      "lamppost-written-v1": JSON.stringify([{ lessonId: "a", total: 8, max: 16, at: 3000 }]),
      "lamppost-review-drills-v1": JSON.stringify({ "a#flaw": { at: 4000 } }),
      "lamppost-challenge-v1": JSON.stringify({ day: "2026-09-23", correct: true, at: 5000 }),
      "lamppost-progress-v1": JSON.stringify({
        courses: { "critical-thinking": { lastActivityAt: 6000 } },
      }),
    };
    const storage = { getItem: (key: string) => data[key] ?? null };
    expect(readActivityTimes(storage).sort((a, b) => a - b)).toEqual([
      1000, 2000, 3000, 4000, 5000, 6000,
    ]);
  });

  it("ignores missing or corrupt stores", () => {
    const storage = { getItem: (key: string) => (key.includes("exercises") ? "{oops" : null) };
    expect(readActivityTimes(storage)).toEqual([]);
  });
});
