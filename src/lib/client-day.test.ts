import { describe, expect, it } from "vitest";
import { TodayInput, acceptableHistory, resolveToday } from "./client-day";

// 9:30pm Wednesday 23 Sep 2026 in US Eastern is already Thursday 24 Sep in UTC.
const now = new Date("2026-09-24T01:30:00Z");

describe("resolveToday", () => {
  it("uses the caller's local day, even when it is behind the UTC day", () => {
    expect(resolveToday({ today: "2026-09-23" }, now)).toBe("2026-09-23");
  });

  it("falls back to the UTC day when nothing (or nothing believable) is sent", () => {
    expect(resolveToday(undefined, now)).toBe("2026-09-24");
    expect(resolveToday({}, now)).toBe("2026-09-24");
    expect(resolveToday({ today: "2030-01-01" }, now)).toBe("2026-09-24");
    expect(resolveToday({ today: "garbage" }, now)).toBe("2026-09-24");
  });
});

describe("TodayInput", () => {
  it("accepts no argument at all, for callers that predate it", () => {
    expect(TodayInput.parse(undefined)).toBeUndefined();
    expect(TodayInput.parse({ today: "2026-09-23" })).toEqual({ today: "2026-09-23" });
  });
});

describe("acceptableHistory", () => {
  it("keeps a device's own today, whichever side of UTC it is on", () => {
    // Eastern at 9:30pm: local today is behind the UTC date.
    expect(acceptableHistory({ "2026-09-23": 1 }, now)).toEqual([["2026-09-23", 1]]);
    // Auckland at 8am Sep 24 while UTC is still Sep 23: local today is AHEAD of UTC,
    // which the old `day <= utcDay()` filter silently dropped.
    const utcEvening = new Date("2026-09-23T20:00:00Z");
    expect(acceptableHistory({ "2026-09-24": 2, "2026-09-23": 1 }, utcEvening)).toEqual([
      ["2026-09-24", 2],
      ["2026-09-23", 1],
    ]);
  });

  it("drops junk, empty days and days no timezone could be in yet", () => {
    const history = {
      "2026-09-26": 1,
      nope: 4,
      "2026-09-22": 0,
      "2026-09-21": -3,
      "2026-09-20": 2.4,
    };
    expect(acceptableHistory(history, now)).toEqual([["2026-09-20", 2]]);
  });

  it("returns newest first and honors the limit", () => {
    const history = { "2026-09-21": 1, "2026-09-23": 1, "2026-09-22": 1 };
    expect(acceptableHistory(history, now, 2).map(([day]) => day)).toEqual([
      "2026-09-23",
      "2026-09-22",
    ]);
  });
});
