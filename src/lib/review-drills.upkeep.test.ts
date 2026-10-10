import { describe, expect, it } from "vitest";
import {
  DRILL_INTERVALS,
  UPKEEP_BOX,
  drillKey,
  upkeepEntries,
  type DrillItem,
} from "./review-drills";

const lessons = [
  { id: "claims-a", drills: ["claim", "flaw"] as const },
  { id: "claims-b", drills: ["judge", "rewrite"] as const },
  { id: "claims-c", drills: ["assumption"] as const },
];

describe("upkeep for a finished unit", () => {
  it("brings every lesson back after 30 days, a day apart, even when nothing was missed", () => {
    const added = upkeepEntries({}, lessons, "2026-10-10", 1);
    expect(DRILL_INTERVALS[UPKEEP_BOX]).toBe(30);
    expect(Object.values(added).map((item) => [item.lessonId, item.due, item.reason])).toEqual([
      ["claims-a", "2026-11-09", "keep"],
      ["claims-b", "2026-11-10", "keep"],
      ["claims-c", "2026-11-11", "keep"],
    ]);
    expect(Object.values(added).every((item) => item.box === UPKEEP_BOX)).toBe(true);
  });

  it("varies the drill type from lesson to lesson", () => {
    const added = upkeepEntries({}, lessons, "2026-10-10", 1);
    expect(Object.keys(added)).toEqual([
      drillKey("claims-a", "claim"),
      drillKey("claims-b", "rewrite"),
      drillKey("claims-c", "assumption"),
    ]);
  });

  it("leaves a lesson alone when it is already in the queue, so a missed drill keeps its place", () => {
    const missed: DrillItem = {
      lessonId: "claims-b",
      kind: "judge",
      box: 0,
      due: "2026-10-11",
      seen: [],
      reason: "missed",
      at: 1,
    };
    const added = upkeepEntries(
      { [drillKey("claims-b", "judge")]: missed },
      lessons,
      "2026-10-10",
      1,
    );
    expect(Object.values(added).map((item) => item.lessonId)).toEqual(["claims-a", "claims-c"]);
  });

  it("keeps to one a day when several units join at once", () => {
    const added = upkeepEntries({}, lessons, "2026-10-10", 1, 5);
    expect(Object.values(added).map((item) => item.due)).toEqual([
      "2026-11-14",
      "2026-11-15",
      "2026-11-16",
    ]);
  });

  it("adds nothing the second time, so it is safe to run on every visit", () => {
    const first = upkeepEntries({}, lessons, "2026-10-10", 1);
    expect(upkeepEntries(first, lessons, "2026-10-12", 2)).toEqual({});
  });

  it("stretches a skill that keeps coming back right out to four months", () => {
    expect(DRILL_INTERVALS.slice(UPKEEP_BOX)).toEqual([30, 60, 120]);
  });
});
