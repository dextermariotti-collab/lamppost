import { afterAll, describe, expect, it } from "vitest";
import { nextPracticeReset, practiceWeekStart } from "./practice";

// The rule must not move with the device's timezone, so run it somewhere that isn't UTC.
const zone = process.env["TZ"];
process.env["TZ"] = "America/New_York";
afterAll(() => {
  if (zone === undefined) delete process.env["TZ"];
  else process.env["TZ"] = zone;
});

const at = (iso: string) => new Date(iso);
const DAY = 24 * 60 * 60 * 1000;

describe("the free practice week", () => {
  it("starts on Monday 00:00 UTC, which is Sunday evening in the US", () => {
    expect(practiceWeekStart(at("2026-10-21T15:00:00Z")).toISOString()).toBe(
      "2026-10-19T00:00:00.000Z",
    );
    // 8:30pm Sunday in New York is already the new week.
    expect(practiceWeekStart(at("2026-10-19T00:30:00Z")).toISOString()).toBe(
      "2026-10-19T00:00:00.000Z",
    );
    // 7:59pm Sunday in New York is still the old one.
    expect(practiceWeekStart(at("2026-10-18T23:59:59.999Z")).toISOString()).toBe(
      "2026-10-12T00:00:00.000Z",
    );
  });

  it("begins at the very instant of Monday midnight", () => {
    const monday = at("2026-10-19T00:00:00.000Z");
    expect(practiceWeekStart(monday)).toEqual(monday);
    expect(nextPracticeReset(monday).toISOString()).toBe("2026-10-26T00:00:00.000Z");
  });

  it("comes back the next Monday 00:00 UTC, always after now", () => {
    expect(nextPracticeReset(at("2026-10-21T15:00:00Z")).toISOString()).toBe(
      "2026-10-26T00:00:00.000Z",
    );
    expect(nextPracticeReset(at("2026-10-18T23:59:59.999Z")).toISOString()).toBe(
      "2026-10-19T00:00:00.000Z",
    );
    for (let hour = 0; hour < 24 * 14; hour += 5) {
      const now = new Date(Date.UTC(2026, 9, 12) + hour * 60 * 60 * 1000);
      const start = practiceWeekStart(now);
      const reset = nextPracticeReset(now);
      expect(start.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(reset.getTime()).toBeGreaterThan(now.getTime());
      expect(reset.getTime() - start.getTime()).toBe(7 * DAY);
      expect(start.getUTCDay()).toBe(1);
      expect(start.getUTCHours()).toBe(0);
    }
  });

  it("crosses months, years and the US clock change", () => {
    // New Year's Day 2026 is a Thursday.
    expect(practiceWeekStart(at("2026-01-01T12:00:00Z")).toISOString()).toBe(
      "2025-12-29T00:00:00.000Z",
    );
    expect(nextPracticeReset(at("2026-01-01T12:00:00Z")).toISOString()).toBe(
      "2026-01-05T00:00:00.000Z",
    );
    // US clocks go back on Sunday, November 1, 2026.
    expect(nextPracticeReset(at("2026-10-31T12:00:00Z")).toISOString()).toBe(
      "2026-11-02T00:00:00.000Z",
    );
  });

  it("defaults to the current time", () => {
    const before = practiceWeekStart(new Date());
    expect(practiceWeekStart()).toEqual(before);
    expect(nextPracticeReset().getTime()).toBe(before.getTime() + 7 * DAY);
  });
});
