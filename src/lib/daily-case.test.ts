// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  caseForDay,
  caseProblems,
  caseXp,
  readCaseStore,
  recordCase,
  saveGeneratedCase,
  studiedUnits,
  useDailyCase,
  type DailyCase,
} from "./daily-case";
import { dayKey, shiftDay } from "./days";

beforeEach(() => window.localStorage.clear());
// A hook left mounted would keep the day's midnight timer on the clock it was mounted under.
afterEach(cleanup);

const q = (id: string, lessonId: string, correct = 0): DailyCase["questions"][number] => ({
  lessonId,
  step: {
    id,
    kind: "choice",
    prompt: "Which is it?",
    options: [{ text: "This one" }, { text: "That one", whyNot: "No." }],
    correct,
    why: "Because.",
  },
});

const text =
  "Our new kettle boils in half the time, according to a survey of our happiest customers. Nine out of ten people who wrote in said they would never go back. Order today, because stock is running low and prices go up next week for everyone who waits.";

const make = (id: string, lessons: [string, string, string]): DailyCase => ({
  id,
  source: "advert",
  title: "A kettle",
  text,
  questions: [q("a", lessons[0]), q("b", lessons[1]), q("c", lessons[2])],
  takeaway: "Ask who was asked.",
});

const mixed = make("case-001", [
  "claims-the-actual-claim",
  "evidence-types",
  "probability-base-rates",
]);
const early = make("case-002", [
  "claims-hidden-assumptions",
  "evidence-anecdote-vs-data",
  "fallacies-adhominem-strawman",
]);
const late = make("case-003", [
  "media-ai-answers",
  "probability-expected-value",
  "biases-anchoring",
]);
const library = [mixed, early, late];

describe("today's case", () => {
  it("takes the next unread case in order once the learner has studied its units", () => {
    const all = new Set([
      "claims",
      "evidence",
      "fallacies",
      "biases",
      "arguments",
      "probability",
      "media",
    ]);
    expect(caseForDay(library, {}, all, "2026-10-10")).toEqual({
      case: mixed,
      done: false,
      repeat: false,
    });
    expect(caseForDay(library, { "case-001": "2026-10-09" }, all, "2026-10-10")?.case.id).toBe(
      "case-002",
    );
  });

  it("prefers the case with fewest questions from units the learner hasn't started", () => {
    const studied = new Set(["claims", "evidence", "fallacies"]);
    expect(caseForDay(library, {}, studied, "2026-10-10")?.case.id).toBe("case-002");
  });

  it("keeps a case finished today as today's case, marked done", () => {
    const pick = caseForDay(library, { "case-003": "2026-10-10" }, new Set(), "2026-10-10");
    expect(pick).toEqual({ case: late, done: true, repeat: false });
  });

  it("brings back the case read longest ago once every case has been read", () => {
    const history = {
      "case-001": "2026-09-20",
      "case-002": "2026-09-01",
      "case-003": "2026-10-01",
    };
    expect(caseForDay(library, history, new Set(), "2026-10-10")).toEqual({
      case: early,
      done: false,
      repeat: true,
    });
  });

  it("has nothing to offer from an empty library", () => {
    expect(caseForDay([], {}, new Set(), "2026-10-10")).toBeNull();
  });
});

describe("the case format", () => {
  it("accepts a well-formed case", () => {
    expect(caseProblems(mixed)).toEqual([]);
  });

  it("wants three different units and a lesson that exists", () => {
    const sameUnit = make("case-004", [
      "claims-the-actual-claim",
      "claims-hidden-assumptions",
      "evidence-types",
    ]);
    expect(caseProblems(sameUnit)).toContain("two questions share a unit");
    const unknown = make("case-005", ["nope", "evidence-types", "media-ai-answers"]);
    expect(caseProblems(unknown)).toContain("a question names a lesson that doesn't exist");
  });

  it("keeps the case text to a phone-sized read", () => {
    expect(caseProblems({ ...mixed, text: "Too short." })[0]).toMatch(/text is 2 words/);
  });
});

describe("AI-written cases on this device", () => {
  const ai = (day: string): DailyCase => ({ ...mixed, id: `ai-${day}` });

  it("keeps a valid AI case, and ignores anything else", () => {
    expect(saveGeneratedCase(ai("2026-11-02"))).toBe(true);
    expect(saveGeneratedCase({ ...ai("2026-11-03"), text: "short" })).toBe(false);
    expect(saveGeneratedCase(mixed)).toBe(false);
    expect(Object.keys(readCaseStore().generated)).toEqual(["ai-2026-11-02"]);
  });

  it("keeps only the newest thirty", () => {
    for (let i = 0; i < 35; i++) saveGeneratedCase(ai(shiftDay("2026-11-01", i)));
    const kept = Object.keys(readCaseStore().generated).sort();
    expect(kept).toHaveLength(30);
    expect([kept[0], kept.at(-1)]).toEqual(["ai-2026-11-06", "ai-2026-12-05"]);
  });

  it("asks for a new case only once every case has been read, and then serves it", () => {
    const all = new Set(Array.from({ length: 35 }, (_, i) => i));
    const library = [mixed, early];
    recordCase("case-001", 3, 3, "2026-01-01");
    const hook = renderHook(() => useDailyCase(library, all));
    expect(hook.result.current.pick?.case.id).toBe("case-002");
    expect(hook.result.current.wantsNew).toBe(false);

    act(() => {
      recordCase("case-002", 3, 3, "2026-01-02");
    });
    expect(hook.result.current.pick?.repeat).toBe(true);
    expect(hook.result.current.wantsNew).toBe(true);

    act(() => {
      saveGeneratedCase(ai(dayKey()));
    });
    expect(hook.result.current.pick?.case.id).toBe(`ai-${dayKey()}`);
    expect(hook.result.current.wantsNew).toBe(false);
  });
});

describe("recording a case", () => {
  it("saves it once a day, keeping the result", () => {
    expect(recordCase("case-001", 2, 3, "2026-10-10")).toBe(true);
    expect(recordCase("case-001", 3, 3, "2026-10-10")).toBe(false);
    expect(readCaseStore()).toEqual({
      history: { "case-001": "2026-10-10" },
      results: [{ day: "2026-10-10", caseId: "case-001", right: 2, total: 3 }],
      generated: {},
    });
  });

  it("reads a broken store as empty", () => {
    window.localStorage.setItem("lamppost-case-v1", "{nope");
    expect(readCaseStore()).toEqual({ history: {}, results: [], generated: {} });
  });

  it("pays something for reading and more for each question right", () => {
    expect([0, 1, 2, 3].map(caseXp)).toEqual([5, 15, 25, 35]);
  });

  it("counts a unit as studied once one of its lessons is done", () => {
    expect([...studiedUnits(new Set([0, 6]))].sort()).toEqual(["claims", "evidence"]);
  });
});

describe("today's case across midnight", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const all = new Set(Array.from({ length: 35 }, (_, i) => i));

  it("moves on to the next case at local midnight, with the screen still open", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 23, 58));
    const hook = renderHook(() => useDailyCase(library, all));
    act(() => {
      recordCase(hook.result.current.pick!.case.id, 3, 3);
    });
    expect(hook.result.current.pick).toMatchObject({ case: { id: "case-001" }, done: true });

    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });
    expect(hook.result.current.pick).toMatchObject({ case: { id: "case-002" }, done: false });
    expect(hook.result.current.result).toBeUndefined();
  });

  it("catches up when the app comes back after a night asleep", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 22));
    const hook = renderHook(() => useDailyCase(library, all));
    act(() => {
      recordCase(hook.result.current.pick!.case.id, 2, 3);
    });
    // The midnight timer never fired while the device slept.
    vi.setSystemTime(new Date(2026, 9, 18, 7));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(hook.result.current.pick).toMatchObject({ case: { id: "case-002" }, done: false });
  });
});
