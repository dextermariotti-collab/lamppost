import { describe, expect, it } from "vitest";
import {
  daysOfWeek,
  isMonday,
  isWeekStart,
  previousWeekStart,
  weekStartOf,
  weekdayIndex,
  weeksBetween,
} from "./weeks";

describe("weeks start on Monday", () => {
  it("numbers the days of a known week", () => {
    // 2026-09-21 is a Monday.
    expect(
      [
        "2026-09-21",
        "2026-09-22",
        "2026-09-23",
        "2026-09-24",
        "2026-09-25",
        "2026-09-26",
        "2026-09-27",
      ].map(weekdayIndex),
    ).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("finds the Monday on or before any day", () => {
    expect(weekStartOf("2026-09-21")).toBe("2026-09-21");
    expect(weekStartOf("2026-09-24")).toBe("2026-09-21");
    expect(weekStartOf("2026-09-27")).toBe("2026-09-21");
    expect(weekStartOf("2026-09-28")).toBe("2026-09-28");
  });

  it("crosses month and year boundaries", () => {
    expect(weekStartOf("2026-10-01")).toBe("2026-09-28");
    expect(weekStartOf("2027-01-01")).toBe("2026-12-28");
    expect(weekStartOf("2028-03-01")).toBe("2028-02-28"); // a leap year
  });

  it("knows a Monday", () => {
    expect(isMonday("2026-09-28")).toBe(true);
    expect(isMonday("2026-09-29")).toBe(false);
  });

  it("finds last week's Monday", () => {
    expect(previousWeekStart("2026-09-28")).toBe("2026-09-21");
    expect(previousWeekStart("2026-09-27")).toBe("2026-09-14");
  });

  it("lists a week's seven days", () => {
    const days = daysOfWeek("2026-09-28");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-09-28");
    expect(days[6]).toBe("2026-10-04");
  });

  it("recognizes a week key, and counts weeks between two", () => {
    expect(isWeekStart("2026-09-21")).toBe(true);
    expect(isWeekStart("2026-09-22")).toBe(false);
    expect(isWeekStart("not a day")).toBe(false);
    expect(weeksBetween("2026-09-07", "2026-09-28")).toBe(3);
    expect(weeksBetween("2026-09-28", "2026-09-21")).toBe(-1);
  });

  it("does not depend on the machine's timezone", () => {
    const original = process.env["TZ"];
    for (const tz of ["Pacific/Auckland", "America/Los_Angeles", "UTC"]) {
      process.env["TZ"] = tz;
      expect(weekStartOf("2026-09-27")).toBe("2026-09-21");
      expect(weekdayIndex("2026-09-28")).toBe(0);
    }
    if (original === undefined) delete process.env["TZ"];
    else process.env["TZ"] = original;
  });
});
