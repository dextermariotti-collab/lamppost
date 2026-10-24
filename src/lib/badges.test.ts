// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BADGES,
  computeBadges,
  drainNewUnlocks,
  earnedFirst,
  type BadgeState,
  type BadgeTier,
} from "./badges";
import { LESSONS } from "./curriculum";
import { DEFAULT_STATE } from "./progress-core";

const attempts = (lessonId: string, scores: number[]) =>
  Object.fromEntries(
    scores.map((score, i) => [
      `${lessonId}#${i}`,
      { answer: 0, score, at: Date.UTC(2026, 9, 1, 15) },
    ]),
  );
const flawless = (state = DEFAULT_STATE) =>
  computeBadges(state).find((badge) => badge.code === "flawless")!.value;

beforeEach(() => window.localStorage.clear());

describe("Flawless", () => {
  const [a, b] = [LESSONS[0]!, LESSONS[1]!];

  beforeEach(() => {
    window.localStorage.setItem(
      "lamppost-exercises-v1",
      JSON.stringify({ ...attempts(a.id, [1, 1, 1]), ...attempts(b.id, [1, 1, 1]) }),
    );
  });

  it("counts only lessons that were finished", () => {
    expect(flawless({ ...DEFAULT_STATE, doneLessonIds: [a.id], doneLessons: [0] })).toBe(1);
  });

  it("counts nothing for a lesson started but not finished", () => {
    expect(flawless({ ...DEFAULT_STATE, doneLessonIds: [], doneLessons: [] })).toBe(0);
  });

  it("reads an older save that kept only positions", () => {
    expect(flawless({ ...DEFAULT_STATE, doneLessonIds: null, doneLessons: [0, 1] })).toBe(2);
  });

  it("still needs every drill right", () => {
    window.localStorage.setItem("lamppost-exercises-v1", JSON.stringify(attempts(a.id, [1, 0, 1])));
    expect(flawless({ ...DEFAULT_STATE, doneLessonIds: [a.id], doneLessons: [0] })).toBe(0);
  });
});

describe("Early Bird", () => {
  const EASTERN = "America/New_York";
  let previousTz: string | undefined;
  beforeEach(() => {
    previousTz = process.env["TZ"];
    process.env["TZ"] = EASTERN;
  });
  afterEach(() => {
    if (previousTz === undefined) delete process.env["TZ"];
    else process.env["TZ"] = previousTz;
  });

  /** One drill answered at this local time in New York (EDT, UTC-4, in October 2026). */
  const answeredAt = (hour: number, minute: number, day = 21) =>
    window.localStorage.setItem(
      "lamppost-exercises-v1",
      JSON.stringify({
        [`${LESSONS[0]!.id}#0`]: {
          answer: 0,
          score: 1,
          at: Date.UTC(2026, 9, day, hour + 4, minute),
        },
      }),
    );
  const earlyDays = () => computeBadges(DEFAULT_STATE).find((b) => b.code === "early_bird")!;

  it("isn't earned at 1:40 a.m.: that's late, not early", () => {
    answeredAt(1, 40);
    expect(new Date(Date.UTC(2026, 9, 21, 5, 40)).getHours()).toBe(1);
    expect(earlyDays().value).toBe(0);
    expect(earlyDays().tier).toBeNull();
  });

  it("is earned at 7:30 a.m.", () => {
    answeredAt(7, 30);
    expect(earlyDays().value).toBe(1);
    expect(earlyDays().tier).toBe("bronze");
  });

  it("runs from 5:00 up to, not including, 9:00", () => {
    for (const [hour, minute, early] of [
      [4, 59, 0],
      [5, 0, 1],
      [8, 59, 1],
      [9, 0, 0],
    ] as const) {
      answeredAt(hour, minute);
      expect(earlyDays().value, `${hour}:${minute}`).toBe(early);
    }
  });

  it("says the window it counts", () => {
    expect(earlyDays().description).toBe("Days you practiced between 5 and 9 a.m.");
  });
});

describe("the badge shelf order", () => {
  const SEEN = "lamppost-badges-v1";
  const at = (code: string, tier: BadgeTier | null) =>
    ({
      ...BADGES.find((b) => b.code === code)!,
      value: 0,
      tier,
      nextAt: null,
      pct: 0,
    }) as BadgeState;
  const codes = (badges: BadgeState[]) => badges.map((b) => b.code);

  it("records when each tier was earned, and fires each unlock once", () => {
    const badges = [at("iron_streak", "bronze")];
    expect(codes(drainNewUnlocks(badges, 1000))).toEqual(["iron_streak"]);
    expect(drainNewUnlocks(badges, 2000)).toEqual([]);
    expect(JSON.parse(window.localStorage.getItem(SEEN)!)).toEqual({
      iron_streak: { tier: "bronze", at: 1000 },
    });
    expect(codes(drainNewUnlocks([at("iron_streak", "silver")], 3000))).toEqual(["iron_streak"]);
    expect(JSON.parse(window.localStorage.getItem(SEEN)!).iron_streak).toEqual({
      tier: "silver",
      at: 3000,
    });
  });

  it("reads a save that kept only the tier, without firing it again", () => {
    window.localStorage.setItem(SEEN, JSON.stringify({ comeback: "silver" }));
    expect(drainNewUnlocks([at("comeback", "silver")])).toEqual([]);
    expect(codes(drainNewUnlocks([at("comeback", "gold")], 5))).toEqual(["comeback"]);
  });

  it("puts earned badges first, newest first, then the rest in their usual order", () => {
    window.localStorage.setItem(
      SEEN,
      JSON.stringify({
        flawless: "bronze", // saved before times were kept: the oldest
        iron_streak: { tier: "bronze", at: 100 },
        early_bird: { tier: "bronze", at: 300 },
      }),
    );
    const shelf = earnedFirst([
      at("flawless", "bronze"),
      at("calibrated", null),
      at("iron_streak", "bronze"),
      at("steelman", "bronze"), // earned since the last unlock was recorded: the newest
      at("early_bird", "bronze"),
      at("comeback", null),
    ]);
    expect(codes(shelf)).toEqual([
      "steelman",
      "early_bird",
      "iron_streak",
      "flawless",
      "calibrated",
      "comeback",
    ]);
  });
});
