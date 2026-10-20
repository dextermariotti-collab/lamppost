// @vitest-environment jsdom
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { StreakCalendar } from "@/components/StreakCalendar";
import { EASTERN } from "@/test/time";
import { dayKey } from "./days";
import { DEFAULT_STATE, applyLessonComplete, applyReview, deriveInsights } from "./progress-core";
import { advanceStreak } from "./streak";

vi.mock("./companion-store", () => ({ useSessionUser: () => ({ userId: null, ready: true }) }));
vi.mock("./profile.functions", () => ({ getMyProfile: vi.fn(), syncProgress: vi.fn() }));

/**
 * Regression: at 9:30pm US Eastern on Sep 23 the app stored lastActiveDay as
 * "2026-09-24" and keyed history by UTC days. Every scenario below is set at the
 * moments around 9pm Eastern, when the UTC date is already tomorrow's.
 */
const PROGRESS = "lamppost-progress-v1";
const LESSON = ["critical-thinking", "Critical thinking"] as const;
const LESSON_REF = { slug: LESSON[0], topic: LESSON[1] };

const at = (iso: string) => {
  vi.setSystemTime(new Date(iso));
};
/** 9:30pm Wed 23 Sep 2026 Eastern (EDT = UTC-4). */
const NINE_THIRTY_PM = "2026-09-24T01:30:00Z";
/** 8:05pm Eastern: 00:05 UTC — the moment the UTC date flips. */
const EIGHT_OH_FIVE_PM = "2026-09-24T00:05:00Z";
/** 12:05am Thu 24 Sep Eastern. */
const PAST_MIDNIGHT = "2026-09-24T04:05:00Z";

let previousTz: string | undefined;
beforeAll(() => {
  previousTz = process.env["TZ"];
  process.env["TZ"] = EASTERN;
});
afterAll(() => {
  if (previousTz === undefined) delete process.env["TZ"];
  else process.env["TZ"] = previousTz;
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function freshStore() {
  vi.resetModules();
  return await import("./progress");
}

describe("streaks and the daily goal", () => {
  it("files a 9:30pm lesson under the local day, not tomorrow's UTC date", async () => {
    at(NINE_THIRTY_PM);
    const { useProgress } = await freshStore();
    const { result } = renderHook(() => useProgress());
    act(() => result.current.completeLesson(...LESSON, 0, 35));
    expect(result.current.state.lastActiveDay).toBe("2026-09-23");
    expect(result.current.state.history).toEqual({ "2026-09-23": 1 });
    const saved = JSON.parse(window.localStorage.getItem(PROGRESS) ?? "{}");
    expect(saved.lastActiveDay).toBe("2026-09-23");
    expect(Object.keys(saved.history)).toEqual(["2026-09-23"]);
  });

  it("does not roll the day over at 8pm Eastern, when UTC does", async () => {
    at(EIGHT_OH_FIVE_PM);
    const { useProgress } = await freshStore();
    const { result } = renderHook(() => useProgress());
    act(() => result.current.completeLesson(...LESSON, 0, 35));
    expect(result.current.state.lastActiveDay).toBe("2026-09-23");
  });

  it("makes the lesson after local midnight day two of the streak, not a duplicate", async () => {
    at(NINE_THIRTY_PM);
    const { useProgress } = await freshStore();
    const { result } = renderHook(() => useProgress());
    act(() => result.current.completeLesson(...LESSON, 0, 35));
    // A second lesson later the same evening is still the same day.
    act(() => result.current.completeLesson(...LESSON, 1, 35));
    expect(result.current.state.streak).toBe(1);
    expect(result.current.state.history["2026-09-23"]).toBe(2);

    at(PAST_MIDNIGHT);
    act(() => result.current.completeLesson(...LESSON, 2, 35));
    expect(result.current.state.streak).toBe(2);
    expect(result.current.state.lastActiveDay).toBe("2026-09-24");
    expect(result.current.state.history).toEqual({ "2026-09-23": 2, "2026-09-24": 1 });
  });

  it("counts the goal on the local day and warns near local midnight", () => {
    const state = {
      ...DEFAULT_STATE,
      streak: 3,
      dailyGoal: 2,
      lastActiveDay: "2026-09-22",
      history: { "2026-09-22": 1 },
    };
    at(NINE_THIRTY_PM);
    const evening = deriveInsights(state, new Date());
    expect(evening.doneToday).toBe(0);
    expect(evening.hoursLeft).toBe(3);
    expect(evening.atRisk).toBe(true);

    // A review keeps the streak safe; only a finished lesson counts toward the goal.
    const reviewed = applyReview(state, true, dayKey());
    expect(deriveInsights(reviewed, new Date()).atRisk).toBe(false);
    expect(deriveInsights(reviewed, new Date()).doneToday).toBe(0);
    const done = applyLessonComplete(reviewed, { ...LESSON_REF, index: 0, total: 35 }, dayKey());
    expect(deriveInsights(done, new Date()).doneToday).toBe(1);
    at(PAST_MIDNIGHT);
    expect(deriveInsights(done, new Date()).doneToday).toBe(0);
  });
});

describe("freezes", () => {
  it("log the missed days by local date", () => {
    at(NINE_THIRTY_PM);
    const next = advanceStreak(
      { streak: 5, lastActiveDay: "2026-09-21", freezes: 1, freezeLog: [], freezeSaved: null },
      dayKey(),
    );
    expect(next.streak).toBe(6);
    expect(next.freezeLog).toEqual(["2026-09-22"]);
    expect(next.freezeSaved).toEqual({ days: 1, day: "2026-09-23" });
  });
});

describe("history saved by older builds (UTC day keys)", () => {
  it("is moved back onto the local day once, and saved", async () => {
    at(NINE_THIRTY_PM);
    // What the tester had: an evening lesson keyed and stamped as Sep 24 (UTC).
    window.localStorage.setItem(
      PROGRESS,
      JSON.stringify({
        streak: 2,
        longestStreak: 2,
        xp: 100,
        lastActiveDay: "2026-09-24",
        history: { "2026-09-22": 1, "2026-09-24": 1 },
        courses: { "critical-thinking": { topic: "Critical thinking", completed: 2, total: 35 } },
      }),
    );
    window.localStorage.setItem(
      "lamppost-exercises-v1",
      JSON.stringify({
        "claims-the-actual-claim#0": {
          answer: 0,
          score: 1,
          at: Date.parse("2026-09-22T15:00:00Z"),
        },
        "claims-the-actual-claim#1": {
          answer: 0,
          score: 1,
          at: Date.parse("2026-09-24T01:10:00Z"),
        },
      }),
    );
    const { useProgress } = await freshStore();
    const { result } = renderHook(() => useProgress());
    expect(result.current.state.history).toEqual({ "2026-09-22": 1, "2026-09-23": 1 });
    expect(result.current.state.lastActiveDay).toBe("2026-09-23");
    expect(result.current.state.streak).toBe(2);
    expect(JSON.parse(window.localStorage.getItem(PROGRESS) ?? "{}").dayKeyVersion).toBe(2);

    // Finishing another lesson tonight adds to Sep 23 instead of starting a new day.
    act(() => result.current.completeLesson(...LESSON, 2, 35));
    expect(result.current.state.history["2026-09-23"]).toBe(2);
    expect(result.current.state.streak).toBe(2);
  });
});

describe("an evening lesson from an earlier day, saved by an older build", () => {
  it("goes back to the day it was earned, not the UTC day after", async () => {
    at("2026-09-23T14:00:00Z");
    // Lesson 1: 10am Sep 21. Lesson 2: 9:20pm Sep 21 — stored under UTC Sep 22.
    window.localStorage.setItem(
      PROGRESS,
      JSON.stringify({
        streak: 2,
        lastActiveDay: "2026-09-22",
        history: { "2026-09-21": 1, "2026-09-22": 1 },
      }),
    );
    window.localStorage.setItem(
      "lamppost-exercises-v1",
      JSON.stringify({
        "a#0": { answer: 0, score: 1, at: Date.parse("2026-09-21T14:00:00Z") },
        "a#1": { answer: 0, score: 1, at: Date.parse("2026-09-22T01:20:00Z") },
      }),
    );
    const { useProgress } = await freshStore();
    const { result } = renderHook(() => useProgress());
    expect(result.current.state.history).toEqual({ "2026-09-21": 2 });
    expect(result.current.state.lastActiveDay).toBe("2026-09-21");
  });
});

describe("review due dates", () => {
  it("come due at local midnight, not 8pm", async () => {
    at(NINE_THIRTY_PM);
    const { trackDrillResult, useDueDrills } = await import("./review-drills");
    trackDrillResult("claims-the-actual-claim", "flaw", 0);
    const store = JSON.parse(window.localStorage.getItem("lamppost-review-drills-v1") ?? "{}");
    expect(store["claims-the-actual-claim#flaw"].due).toBe("2026-09-24");

    const evening = renderHook(() => useDueDrills());
    expect(evening.result.current.total).toBe(0);
    cleanup();

    at(PAST_MIDNIGHT);
    const morning = renderHook(() => useDueDrills());
    expect(morning.result.current.total).toBe(1);
  });
});

describe("daily case", () => {
  it("resets at local midnight", async () => {
    at(NINE_THIRTY_PM);
    const { recordCase, useDailyCase } = await import("./daily-case");
    const { DAILY_CASES } = await import("@/content/cases");
    const done = new Set([0, 1, 2, 3, 4]);
    const evening = renderHook(() => useDailyCase(DAILY_CASES, done));
    const first = evening.result.current.pick!.case.id;
    act(() => {
      recordCase(first, 2, 3);
    });
    const saved = JSON.parse(window.localStorage.getItem("lamppost-case-v1") ?? "{}");
    expect(saved.history[first]).toBe("2026-09-23");
    expect(evening.result.current.pick?.done).toBe(true);
    cleanup();

    at(PAST_MIDNIGHT);
    const morning = renderHook(() => useDailyCase(DAILY_CASES, done));
    expect(morning.result.current.pick?.done).toBe(false);
    expect(morning.result.current.pick?.case.id).not.toBe(first);
  });
});

describe("four-week calendar", () => {
  it("ends on the local today and marks the 9:30pm lesson on it", () => {
    at(NINE_THIRTY_PM);
    const state = {
      ...DEFAULT_STATE,
      history: { "2026-09-23": 1 },
      lessonsByDay: { "2026-09-23": 1 },
    };
    const { container } = render(<StreakCalendar state={state} />);
    const cells = [...container.querySelectorAll("[title]")];
    expect(cells).toHaveLength(28);
    const last = cells[27]!;
    expect(last.getAttribute("title")).toBe("2026-09-23: 1 lesson");
    expect(last.textContent).toBe("23");
    expect(last.className).toContain("ring-2");
    expect(last.className).toContain("bg-primary");
    expect(cells[0]!.getAttribute("title")).toContain("2026-08-27");
  });
});
