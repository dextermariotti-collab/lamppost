import { describe, expect, it } from "vitest";
import { recapFacts, recapHeadline, weeklyRecap } from "./recap";

const MONDAY = "2026-09-28"; // last week: 2026-09-21 .. 2026-09-27

describe("the Monday recap", () => {
  it("only exists on a Monday", () => {
    const history = { "2026-09-22": 2 };
    expect(weeklyRecap({ history, weeklyXp: {} }, MONDAY)).not.toBeNull();
    for (const day of ["2026-09-29", "2026-09-30", "2026-10-03", "2026-10-04"]) {
      expect(weeklyRecap({ history, weeklyXp: {} }, day), day).toBeNull();
    }
  });

  it("adds up last week and only last week", () => {
    const recap = weeklyRecap(
      {
        history: {
          "2026-09-20": 9, // the Sunday before: not last week
          "2026-09-21": 1,
          "2026-09-23": 3,
          "2026-09-27": 2,
          "2026-09-28": 5, // today: not last week
        },
        weeklyXp: {},
      },
      MONDAY,
    );
    expect(recap).toMatchObject({ weekStart: "2026-09-21", completed: 6, activeDays: 3 });
  });

  it("names the busiest day only when there was more than one active day", () => {
    const busy = weeklyRecap(
      { history: { "2026-09-21": 1, "2026-09-23": 3 }, weeklyXp: {} },
      MONDAY,
    );
    expect(busy?.bestDay).toEqual({ day: "2026-09-23", count: 3 });
    const single = weeklyRecap({ history: { "2026-09-23": 3 }, weeklyXp: {} }, MONDAY);
    expect(single?.bestDay).toBeNull();
  });

  it("says nothing about a week with nothing in it", () => {
    expect(weeklyRecap({ history: {}, weeklyXp: {} }, MONDAY)).toBeNull();
    expect(weeklyRecap({ history: { "2026-09-21": 0 }, weeklyXp: {} }, MONDAY)).toBeNull();
  });

  it("reports XP only when this device tracked it for that week", () => {
    const history = { "2026-09-22": 1 };
    expect(weeklyRecap({ history, weeklyXp: { "2026-09-21": 340 } }, MONDAY)?.xp).toBe(340);
    expect(weeklyRecap({ history, weeklyXp: {} }, MONDAY)?.xp).toBeNull();
    expect(weeklyRecap({ history, weeklyXp: { "2026-09-21": 0 } }, MONDAY)?.xp).toBeNull();
  });

  it("spans a month boundary", () => {
    const recap = weeklyRecap(
      { history: { "2026-09-30": 2, "2026-10-01": 1 }, weeklyXp: {} },
      "2026-10-05",
    );
    expect(recap).toMatchObject({ weekStart: "2026-09-28", completed: 3, activeDays: 2 });
  });
});

describe("what the card says", () => {
  const recap = {
    weekStart: "2026-09-21",
    completed: 6,
    activeDays: 3,
    bestDay: { day: "2026-09-23", count: 3 },
    xp: 1240,
  };

  it("states what happened, in plain counts", () => {
    expect(recapHeadline(recap)).toBe("Last week you finished 6 things across 3 days.");
    expect(recapHeadline({ ...recap, completed: 1, activeDays: 1 })).toBe(
      "Last week you finished 1 thing across 1 day.",
    );
  });

  it("lists only facts it has", () => {
    expect(recapFacts(recap)).toEqual(["1,240 XP earned", "Busiest day: Wednesday, 3"]);
    expect(recapFacts({ ...recap, xp: null, bestDay: null })).toEqual([]);
  });

  it("uses no pressure: nothing about losing, missing, streaks at risk or catching up", () => {
    const text = [recapHeadline(recap), ...recapFacts(recap)].join(" ");
    expect(text).not.toMatch(/lose|lost|miss|risk|behind|catch up|don't|hurry|last chance/i);
  });
});
