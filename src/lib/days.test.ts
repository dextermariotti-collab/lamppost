import { describe, expect, it } from "vitest";
import { daysBetween, dayKey, isDayKey, isPlausibleLocalDay, shiftDay, utcDay } from "./days";
import { EASTERN, NINE_THIRTY_PM_EASTERN, withTimeZone } from "@/test/time";

describe("shiftDay / daysBetween", () => {
  it("does calendar arithmetic across month and year ends", () => {
    expect(shiftDay("2026-09-30", 1)).toBe("2026-10-01");
    expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDay("2028-02-28", 1)).toBe("2028-02-29");
    expect(daysBetween("2026-09-23", "2026-09-24")).toBe(1);
    expect(daysBetween("2026-09-24", "2026-09-23")).toBe(-1);
    expect(daysBetween("2026-03-01", "2026-04-01")).toBe(31);
  });

  it("is unaffected by the device timezone or a DST change", () => {
    for (const zone of [EASTERN, "Pacific/Auckland", "Asia/Kolkata", "UTC"]) {
      withTimeZone(zone, () => {
        // US DST ends on 2026-11-01, so that local day is 25 hours long.
        expect(shiftDay("2026-11-01", 1)).toBe("2026-11-02");
        expect(daysBetween("2026-10-31", "2026-11-02")).toBe(2);
      });
    }
  });
});

describe("dayKey", () => {
  it("is the LOCAL calendar day, not the UTC day", () => {
    withTimeZone(EASTERN, () => {
      expect(utcDay(NINE_THIRTY_PM_EASTERN)).toBe("2026-09-24");
      expect(dayKey(NINE_THIRTY_PM_EASTERN)).toBe("2026-09-23");
    });
  });

  it("rolls over at local midnight", () => {
    withTimeZone(EASTERN, () => {
      expect(dayKey(new Date(2026, 8, 23, 23, 59, 59))).toBe("2026-09-23");
      expect(dayKey(new Date(2026, 8, 24, 0, 0, 0))).toBe("2026-09-24");
    });
  });

  it("is ahead of UTC east of Greenwich", () => {
    withTimeZone("Pacific/Auckland", () => {
      const morning = new Date("2026-09-23T20:00:00Z");
      expect(utcDay(morning)).toBe("2026-09-23");
      expect(dayKey(morning)).toBe("2026-09-24");
    });
  });
});

describe("isDayKey", () => {
  it("accepts real dates only", () => {
    expect(isDayKey("2026-09-23")).toBe(true);
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(isDayKey("2026-9-3")).toBe(false);
    expect(isDayKey("tomorrow")).toBe(false);
    expect(isDayKey(20260923)).toBe(false);
  });
});

describe("isPlausibleLocalDay", () => {
  const now = new Date("2026-09-24T01:30:00Z");

  it("allows the UTC day and its neighbors, for every real timezone", () => {
    expect(isPlausibleLocalDay("2026-09-23", now)).toBe(true);
    expect(isPlausibleLocalDay("2026-09-24", now)).toBe(true);
    expect(isPlausibleLocalDay("2026-09-25", now)).toBe(true);
  });

  it("rejects a clock (or a forged request) further out than that", () => {
    expect(isPlausibleLocalDay("2026-09-26", now)).toBe(false);
    expect(isPlausibleLocalDay("2026-09-22", now)).toBe(false);
    expect(isPlausibleLocalDay("nonsense", now)).toBe(false);
  });
});
