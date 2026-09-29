import { describe, expect, it } from "vitest";
import {
  LEAGUE_MIN_XP,
  LEAGUE_TIERS,
  MAX_TIER,
  leagueMove,
  rankStandings,
  tierName,
} from "./league";

const row = (id: string, weeklyXp: number) => ({ id, weeklyXp });
const ranks = (rows: ReturnType<typeof rankStandings>) => rows.map((r) => [r.id, r.rank]);

describe("ranking a week", () => {
  it("orders by XP, highest first", () => {
    const ranked = rankStandings([row("a", 100), row("b", 300), row("c", 200)]);
    expect(ranks(ranked)).toEqual([
      ["b", 1],
      ["c", 2],
      ["a", 3],
    ]);
  });

  it("gives tied friends the same rank and skips the next", () => {
    const ranked = rankStandings([row("a", 200), row("b", 200), row("c", 100), row("d", 300)]);
    expect(ranks(ranked)).toEqual([
      ["d", 1],
      ["a", 2],
      ["b", 2],
      ["c", 4],
    ]);
  });

  it("lists, but doesn't rank, anyone under the XP minimum", () => {
    const ranked = rankStandings([row("a", 200), row("b", LEAGUE_MIN_XP - 1), row("c", 0)]);
    expect(ranks(ranked)).toEqual([
      ["a", 1],
      ["b", null],
      ["c", null],
    ]);
  });

  it("ranks someone exactly on the minimum", () => {
    expect(rankStandings([row("a", LEAGUE_MIN_XP)])[0]!.rank).toBe(1);
  });

  it("handles no one at all", () => {
    expect(rankStandings([])).toEqual([]);
  });
});

describe("how a week moves a learner", () => {
  const move = (tier: number, rank: number | null, taking: number, weeklyXp = 200) =>
    leagueMove({ tier, rank, taking, weeklyXp });

  it("promotes the top third and demotes the bottom third of those who took part", () => {
    // Six took part: two move up, two move down, two stay.
    expect(move(1, 1, 6)).toMatchObject({ tier: 2, change: "promoted" });
    expect(move(1, 2, 6)).toMatchObject({ tier: 2, change: "promoted" });
    expect(move(1, 3, 6)).toMatchObject({ tier: 1, change: "stayed" });
    expect(move(1, 4, 6)).toMatchObject({ tier: 1, change: "stayed" });
    expect(move(1, 5, 6)).toMatchObject({ tier: 0, change: "demoted" });
    expect(move(1, 6, 6)).toMatchObject({ tier: 0, change: "demoted" });
  });

  it("with the smallest group of three, first goes up, last goes down, second stays", () => {
    expect(move(2, 1, 3).change).toBe("promoted");
    expect(move(2, 2, 3).change).toBe("stayed");
    expect(move(2, 3, 3).change).toBe("demoted");
  });

  it("doesn't move anyone when fewer than three took part", () => {
    for (const rank of [1, 2])
      expect(move(2, rank, 2)).toMatchObject({ tier: 2, change: "stayed" });
    expect(move(2, 1, 1).change).toBe("stayed");
    expect(move(2, 1, 2).reason).toMatch(/3 of you/);
  });

  it("never costs anyone a tier for a quiet week", () => {
    expect(move(3, null, 5, 0)).toMatchObject({ tier: 3, change: "stayed" });
    expect(move(3, null, 5, LEAGUE_MIN_XP - 1).reason).toMatch(/nothing is lost/i);
    // Even if a rank was somehow passed for an inactive learner.
    expect(move(3, 5, 5, 10).change).toBe("stayed");
  });

  it("stops at the top and the bottom of the ladder", () => {
    expect(move(MAX_TIER, 1, 6)).toMatchObject({ tier: MAX_TIER, change: "stayed" });
    expect(move(0, 6, 6)).toMatchObject({ tier: 0, change: "stayed" });
    expect(move(MAX_TIER, 1, 6).reason).toMatch(/no tier above/);
    expect(move(0, 6, 6).reason).toMatch(/lowest/);
  });

  it("treats a tie at the edge of a zone fairly: shared ranks share the outcome", () => {
    // Four took part; zone = 1. Two share first, so both are in the top zone.
    const ranked = rankStandings([row("a", 300), row("b", 300), row("c", 200), row("d", 100)]);
    const outcome = ranked.map(
      (r) => leagueMove({ tier: 1, weeklyXp: r.weeklyXp, rank: r.rank, taking: 4 }).change,
    );
    expect(outcome).toEqual(["promoted", "promoted", "stayed", "demoted"]);
  });

  it("clamps a tier that is out of range", () => {
    expect(move(99, 3, 3).tier).toBeLessThanOrEqual(MAX_TIER);
    expect(move(-5, 1, 3).tier).toBeGreaterThanOrEqual(0);
    expect(move(Number.NaN, 2, 3).tier).toBe(0);
  });

  it("always says why, in words", () => {
    for (const rank of [1, 2, 3, null]) expect(move(1, rank, 3).reason.length).toBeGreaterThan(10);
  });
});

describe("tier names", () => {
  it("has five tiers from Bronze to Diamond", () => {
    expect(LEAGUE_TIERS).toEqual(["Bronze", "Silver", "Gold", "Sapphire", "Diamond"]);
    expect(MAX_TIER).toBe(4);
  });

  it("names any tier safely", () => {
    expect(tierName(0)).toBe("Bronze");
    expect(tierName(4)).toBe("Diamond");
    expect(tierName(9)).toBe("Diamond");
    expect(tierName(-1)).toBe("Bronze");
    expect(tierName(Number.NaN)).toBe("Bronze");
  });
});
