import { describe, expect, it } from "vitest";
import { nextReviewLine } from "./review-drills";

describe("nextReviewLine", () => {
  it("says what reviews are when none are scheduled", () => {
    expect(nextReviewLine([])).toBe("Drills you miss come back here as new scenarios.");
  });

  it("names tomorrow, or the number of days, for the soonest one that isn't due yet", () => {
    expect(nextReviewLine([{ dueInDays: 3 }, { dueInDays: 1 }])).toBe(
      "Your next review is tomorrow.",
    );
    expect(nextReviewLine([{ dueInDays: 7 }, { dueInDays: 3 }])).toBe(
      "Your next review is in 3 days.",
    );
  });

  it("ignores what is already due", () => {
    expect(nextReviewLine([{ dueInDays: 0 }, { dueInDays: -2 }, { dueInDays: 7 }])).toBe(
      "Your next review is in 7 days.",
    );
  });
});
