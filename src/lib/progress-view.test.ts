import { describe, expect, it } from "vitest";
import {
  calendarRange,
  calibrationLine,
  calibrationSummary,
  skillNotes,
  weekStrip,
  weekdayLetter,
} from "./progress-view";

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
    expect(line).toContain("overconfident");
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
