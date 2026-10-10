// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  LATER_CHECK_DAYS,
  checkAvailability,
  checkLine,
  laterCheckDue,
  overallChange,
  readChecks,
  recordCheck,
} from "./unit-checks";

beforeEach(() => window.localStorage.clear());

describe("recording a check", () => {
  it("keeps the first result and never overwrites it, so before and after stay comparable", () => {
    expect(recordCheck("claims", "before", 1, 3, "2026-10-01")).toBe(true);
    expect(recordCheck("claims", "before", 3, 3, "2026-10-02")).toBe(false);
    expect(readChecks()["claims"]?.before).toEqual({ right: 1, total: 3, day: "2026-10-01" });
  });

  it("keeps a unit's before and after side by side", () => {
    recordCheck("claims", "before", 1, 3, "2026-10-01");
    recordCheck("claims", "after", 3, 3, "2026-10-09");
    expect(readChecks()["claims"]).toEqual({
      before: { right: 1, total: 3, day: "2026-10-01" },
      after: { right: 3, total: 3, day: "2026-10-09" },
    });
  });

  it("reads a broken store as empty", () => {
    window.localStorage.setItem("lamppost-unit-checks-v1", "not json");
    expect(readChecks()).toEqual({});
  });
});

describe("checkAvailability", () => {
  const fresh = { completed: 0, total: 5 };
  const half = { completed: 2, total: 5 };
  const done = { completed: 5, total: 5 };
  const taken = { right: 2, total: 3, day: "2026-10-01" };

  it("offers the before-check only before any of the unit is studied", () => {
    expect(checkAvailability("before", fresh, undefined)).toBe("open");
    expect(checkAvailability("before", half, undefined)).toBe("too-late");
  });

  it("opens the after-check once every lesson in the unit is done", () => {
    expect(checkAvailability("after", half, undefined)).toBe("not-yet");
    expect(checkAvailability("after", done, undefined)).toBe("open");
  });

  it("never offers a check twice", () => {
    expect(checkAvailability("before", fresh, { before: taken })).toBe("taken");
    expect(checkAvailability("after", done, { after: taken })).toBe("taken");
    expect(checkAvailability("later", done, { after: taken, later: taken })).toBe("taken");
  });

  it("opens the three-months-later check 90 days after the after-check, and not before", () => {
    expect(LATER_CHECK_DAYS).toBe(90);
    const after = { right: 3, total: 3, day: "2026-10-01" };
    expect(checkAvailability("later", done, undefined, "2027-06-01")).toBe("not-yet");
    expect(checkAvailability("later", done, { after }, "2026-12-29")).toBe("not-yet");
    expect(checkAvailability("later", done, { after }, "2026-12-30")).toBe("open");
  });
});

describe("laterCheckDue", () => {
  const after = (day: string) => ({ after: { right: 2, total: 3, day } });

  it("lists the units whose three-months-later check is open, in curriculum order", () => {
    const store = {
      evidence: after("2026-07-01"),
      claims: after("2026-06-01"),
      fallacies: after("2026-10-01"),
      biases: { ...after("2026-06-01"), later: { right: 3, total: 3, day: "2026-09-01" } },
    };
    expect(
      laterCheckDue(store, ["claims", "evidence", "fallacies", "biases"], "2026-10-05"),
    ).toEqual(["claims", "evidence"]);
  });
});

describe("what the results say", () => {
  it("says nothing before a check is taken", () => {
    expect(checkLine(undefined)).toBeNull();
    expect(checkLine({})).toBeNull();
  });

  it("puts before and after side by side", () => {
    expect(
      checkLine({
        before: { right: 1, total: 3, day: "d" },
        after: { right: 3, total: 3, day: "d" },
      }),
    ).toBe("Before 1 of 3 · after 3 of 3");
    expect(checkLine({ before: { right: 2, total: 3, day: "d" } })).toBe(
      "Before 2 of 3 · after-check still to come",
    );
  });

  it("adds the three-months-later result when there is one", () => {
    expect(
      checkLine({
        before: { right: 1, total: 3, day: "d" },
        after: { right: 3, total: 3, day: "d" },
        later: { right: 2, total: 3, day: "d" },
      }),
    ).toBe("Before 1 of 3 · after 3 of 3 · 3 months on 2 of 3");
  });

  it("totals only the units checked both times", () => {
    const r = (right: number) => ({ right, total: 3, day: "d" });
    expect(
      overallChange({
        claims: { before: r(1), after: r(3) },
        evidence: { before: r(2), after: r(2) },
        fallacies: { before: r(0) },
      }),
    ).toEqual({ units: 2, before: 3, after: 5, total: 6 });
  });
});
