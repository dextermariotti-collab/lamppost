import { describe, expect, it } from "vitest";
import {
  CALIBRATION_MIN_ANSWERS,
  calendarRange,
  calibrationLine,
  calibrationSummary,
  skillNotes,
  upNextIndex,
  weekStrip,
  weekdayLetter,
} from "./progress-view";
import { LESSONS, UNITS } from "./curriculum";

const unit = (unitId: string, accuracy: number, answered: number) => ({
  unitId,
  accuracy,
  answered,
});

describe("skillNotes", () => {
  it("says nothing until a unit has enough answers to mean something", () => {
    expect(skillNotes([unit("a", 0.2, 2), unit("b", 1, 2)])).toEqual({});
  });

  it("names the strongest skill only when there is another to compare it with", () => {
    expect(skillNotes([unit("a", 0.9, 5), unit("b", 0.7, 1)])).toEqual({});
    expect(skillNotes([unit("a", 0.9, 5), unit("b", 0.75, 4)])).toEqual({ a: "strongest" });
  });

  it("points at skills under the bar in words, whatever else is going on", () => {
    expect(skillNotes([unit("a", 0.82, 6), unit("b", 0.58, 4), unit("c", 0.7, 5)])).toEqual({
      a: "strongest",
      b: "review",
    });
  });

  it("doesn't call something strongest just because it's the best of a weak lot", () => {
    expect(skillNotes([unit("a", 0.6, 5), unit("b", 0.5, 5)])).toEqual({
      a: "review",
      b: "review",
    });
  });

  it("doesn't pick between a tie", () => {
    expect(skillNotes([unit("a", 0.8, 5), unit("b", 0.8, 5)])).toEqual({});
  });
});

describe("calibrationSummary", () => {
  it("has nothing to say without predictions", () => {
    expect(calibrationSummary([])).toBeNull();
    expect(calibrationSummary([{ stated: 80, actual: 60, count: 0 }])).toBeNull();
  });

  it("weights each band by how many drills were in it", () => {
    const summary = calibrationSummary([
      { stated: 90, actual: 50, count: 1 },
      { stated: 50, actual: 50, count: 3 },
    ])!;
    expect(summary).toMatchObject({ count: 4, stated: 60, actual: 50 });
  });

  it("says which way the gap leans, with a margin before it does", () => {
    expect(calibrationSummary([{ stated: 80, actual: 64, count: 5 }])!.verdict).toBe("over");
    expect(calibrationSummary([{ stated: 50, actual: 70, count: 5 }])!.verdict).toBe("under");
    expect(calibrationSummary([{ stated: 70, actual: 65, count: 5 }])!.verdict).toBe("close");
  });

  it("puts the numbers in one plain sentence", () => {
    const line = calibrationLine(calibrationSummary([{ stated: 80, actual: 64, count: 5 }])!);
    expect(line).toContain("said 80% sure");
    expect(line).toContain("right 64% of the time");
    expect(line).toContain("over 5 answers");
    expect(line).toContain("overconfident");
  });

  it("averages the percentages actually given, not the bands' mid-points", () => {
    const summary = calibrationSummary([
      { stated: 50, said: 60, actual: 100, count: 1 },
      { stated: 90, said: 85, actual: 100, count: 3 },
    ])!;
    expect(summary.stated).toBe(Math.round((60 + 85 * 3) / 4));
  });

  it("reads a band without the real figure (as older code built it) at its mid-point", () => {
    expect(calibrationSummary([{ stated: 50, actual: 100, count: 1 }])!.stated).toBe(50);
  });

  it("gives no verdict before the minimum, and says how many it has", () => {
    expect(CALIBRATION_MIN_ANSWERS).toBe(5);
    const one = calibrationSummary([{ stated: 50, said: 60, actual: 100, count: 1 }])!;
    expect(one.verdict).toBeNull();
    const line = calibrationLine(one);
    expect(line).toBe(
      "From 1 answer so far, you said 60% sure. It needs a few more: after 5, this shows which way you lean, as a rough signal.",
    );
    expect(line).not.toMatch(/overconfident|underconfident|well matched/);

    const four = calibrationSummary([{ stated: 90, actual: 25, count: 4 }])!;
    expect(four.verdict).toBeNull();
    expect(calibrationLine(four)).toContain("From 4 answers so far, you said 90% sure on average.");
    expect(calibrationSummary([{ stated: 90, actual: 20, count: 5 }])!.verdict).toBe("over");
  });
});

describe("weekStrip", () => {
  const today = "2026-09-30"; // a Wednesday

  it("is the seven days ending today, oldest first, with weekday letters", () => {
    const days = weekStrip({ history: {}, freezeLog: [] }, today);
    expect(days.map((d) => d.key)).toEqual([
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
    ]);
    expect(days.map((d) => d.letter).join("")).toBe("TFSSMTW");
    expect(days.map((d) => d.isToday)).toEqual([false, false, false, false, false, false, true]);
  });

  it("marks practiced days, freeze days and quiet days", () => {
    const days = weekStrip(
      { history: { "2026-09-29": 2, "2026-09-30": 1 }, freezeLog: ["2026-09-28"] },
      today,
    );
    expect(days.slice(4).map((d) => d.status)).toEqual(["freeze", "done", "done"]);
    expect(days.slice(0, 4).every((d) => d.status === "quiet")).toBe(true);
  });

  it("counts a practiced day as practiced even if a freeze was also logged", () => {
    const [, , , , , yesterday] = weekStrip(
      { history: { "2026-09-29": 1 }, freezeLog: ["2026-09-29"] },
      today,
    );
    expect(yesterday!.status).toBe("done");
  });

  it("reads weekdays from the date itself, not the device's timezone", () => {
    expect(weekdayLetter("2026-09-30")).toBe("W");
    expect(weekdayLetter("2026-10-04")).toBe("S");
  });
});

describe("calendarRange", () => {
  it("names one month when the four weeks sit inside it", () => {
    expect(calendarRange("2026-09-30")).toBe("September 2026");
  });

  it("names both months when the four weeks straddle two", () => {
    expect(calendarRange("2026-09-10")).toBe("August to September 2026");
  });

  it("names both years across New Year", () => {
    expect(calendarRange("2027-01-05")).toBe("December 2026 to January 2027");
  });
});

describe("upNextIndex", () => {
  const first = (unitIndex: number) =>
    LESSONS.findIndex((lesson) => lesson.unitId === UNITS[unitIndex]!.id);
  const unitIds = (unitIndex: number) =>
    LESSONS.filter((lesson) => lesson.unitId === UNITS[unitIndex]!.id).map((l) => l.id);
  const indexOf = (id: string) => LESSONS.findIndex((lesson) => lesson.id === id);
  const done = (ids: string[]) => new Set(ids.map(indexOf));

  it("suggests the first lesson to someone who hasn't started", () => {
    expect(upNextIndex(new Set(), null)).toBe(0);
    expect(upNextIndex(new Set(), [])).toBe(0);
  });

  it("stays on the line a learner chose instead of sending them back to lesson 1", () => {
    const start = first(2);
    const ids = [LESSONS[start]!.id];
    expect(upNextIndex(done(ids), ids)).toBe(start + 1);
  });

  it("goes on to the next line once that one is finished, and comes round to the start", () => {
    const third = unitIds(2);
    expect(upNextIndex(done(third), third)).toBe(first(3));
    const last = unitIds(UNITS.length - 1);
    expect(upNextIndex(done(last), last)).toBe(0);
  });

  it("matches the suggested order for someone going in order", () => {
    const ids = LESSONS.slice(0, 7).map((lesson) => lesson.id);
    expect(upNextIndex(done(ids), ids)).toBe(7);
  });

  it("ignores ids of lessons no longer in the curriculum", () => {
    const start = first(1);
    const ids = [LESSONS[start]!.id, "retired-lesson"];
    expect(upNextIndex(done(ids), ids)).toBe(start + 1);
  });

  it("points at the last lesson once every lesson is done", () => {
    const ids = LESSONS.map((lesson) => lesson.id);
    expect(upNextIndex(done(ids), ids)).toBe(LESSONS.length - 1);
  });
});
