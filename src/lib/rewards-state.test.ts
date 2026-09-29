import { describe, expect, it } from "vitest";
import { DEFAULT_STATE, adoptWallet, gemsEarned, type ProgressState } from "./progress-core";
import {
  adoptRewards,
  applyBuyHint,
  applyOpenChest,
  applyUnlockCosmetic,
  applyUseHint,
  canBuyHint,
  canUnlockCosmetic,
  chestsLeft,
  chestsOpenedOn,
  withWeeklyXp,
} from "./rewards-state";
import { CHEST_PRIZES, HINT_COST, HINT_OVERFLOW_GEMS, MAX_HINT_TOKENS } from "./rewards";

const DAY = "2026-09-28";
const gems5 = CHEST_PRIZES.find((p) => p.id === "gems-5")!;
const gems40 = CHEST_PRIZES.find((p) => p.id === "gems-40")!;
const hint = CHEST_PRIZES.find((p) => p.kind === "hint")!;
const done = (n: number, patch: Partial<ProgressState> = {}): ProgressState => ({
  ...DEFAULT_STATE,
  history: { [DAY]: n },
  ...patch,
});
const open = (
  state: ProgressState,
  prize = gems5,
  source: "lesson" | "review" | "challenge" = "lesson",
) => applyOpenChest(state, { day: DAY, source, prize });

describe("opening a chest on this device", () => {
  it("needs something done today: no activity, no chest", () => {
    expect(chestsLeft(done(0), DAY)).toBe(0);
    expect(open(done(0))).toBeNull();
  });

  it("pays the gems, counts the day, and writes the history", () => {
    const result = open(done(1))!;
    expect(result.state.gems).toBe(5);
    expect(result.state.chests).toEqual({ day: DAY, opened: 1 });
    expect(result.record).toEqual({
      day: DAY,
      source: "lesson",
      kind: "gems",
      amount: 5,
      converted: false,
    });
    expect(result.state.chestHistory).toEqual([result.record]);
  });

  it("keeps lifetime earnings the way a sync reports them: chest gems count as earned on a device", () => {
    const state = open(done(1))!.state;
    expect(gemsEarned(state)).toBe(5);
    expect(state.gemsGranted).toBe(0);
  });

  it("gives one chest per thing done, and never more than three a day", () => {
    let state = done(5);
    for (let i = 0; i < 3; i++) state = open(state)!.state;
    expect(chestsOpenedOn(state, DAY)).toBe(3);
    expect(open(state)).toBeNull();
    expect(chestsLeft(state, DAY)).toBe(0);
    // Two things done, two chests.
    let two = done(2);
    two = open(two)!.state;
    two = open(two)!.state;
    expect(open(two)).toBeNull();
  });

  it("starts the count again on a new day", () => {
    const yesterday = {
      ...done(5),
      history: { [DAY]: 5, "2026-09-29": 1 },
      chests: { day: DAY, opened: 3 },
    };
    expect(chestsOpenedOn(yesterday, "2026-09-29")).toBe(0);
    expect(
      applyOpenChest(yesterday, { day: "2026-09-29", source: "review", prize: gems5 })?.state
        .chests,
    ).toEqual({
      day: "2026-09-29",
      opened: 1,
    });
  });

  it("holds a hint token, and pays gems instead when the pouch is full, saying so", () => {
    const held = open(done(2), hint)!;
    expect(held.state.hintTokens).toBe(1);
    expect(held.record).toMatchObject({ kind: "hint", amount: 1, converted: false });

    const full = open(done(2, { hintTokens: MAX_HINT_TOKENS }), hint)!;
    expect(full.state.hintTokens).toBe(MAX_HINT_TOKENS);
    expect(full.state.gems).toBe(HINT_OVERFLOW_GEMS);
    expect(full.record).toMatchObject({
      kind: "gems",
      amount: HINT_OVERFLOW_GEMS,
      converted: true,
    });
  });

  it("keeps only the latest thirty in the history, newest first", () => {
    let state = done(3);
    state = {
      ...state,
      chestHistory: Array.from({ length: 30 }, (_, i) => ({
        day: `2026-08-${10 + (i % 18)}`,
        source: "lesson" as const,
        kind: "gems" as const,
        amount: 5,
        converted: false,
      })),
    };
    const next = open(state, gems40)!.state;
    expect(next.chestHistory).toHaveLength(30);
    expect(next.chestHistory[0]).toMatchObject({ amount: 40, day: DAY });
  });
});

describe("hint tokens on this device", () => {
  it("cost gems, up to the size of the pouch", () => {
    const rich = { ...DEFAULT_STATE, gems: 100 };
    expect(canBuyHint(rich)).toBe(true);
    const bought = applyBuyHint(rich);
    expect(bought).toMatchObject({ gems: 100 - HINT_COST, gemsSpent: HINT_COST, hintTokens: 1 });
    expect(applyBuyHint({ ...rich, hintTokens: MAX_HINT_TOKENS })).toEqual({
      ...rich,
      hintTokens: MAX_HINT_TOKENS,
    });
    expect(applyBuyHint({ ...DEFAULT_STATE, gems: HINT_COST - 1 })).toEqual({
      ...DEFAULT_STATE,
      gems: HINT_COST - 1,
    });
  });

  it("are used one at a time and never below zero", () => {
    const one = { ...DEFAULT_STATE, hintTokens: 1 };
    expect(applyUseHint(one).hintTokens).toBe(0);
    const none = applyUseHint(applyUseHint(one));
    expect(none.hintTokens).toBe(0);
  });
});

describe("cosmetics on this device", () => {
  const rich = { ...DEFAULT_STATE, gems: 500 };

  it("cost their price and are unlocked once", () => {
    const next = applyUnlockCosmetic(rich, "crown");
    expect(next).toMatchObject({ gems: 300, gemsSpent: 200, cosmetics: ["crown"] });
    expect(applyUnlockCosmetic(next, "crown")).toBe(next);
    expect(canUnlockCosmetic(next, "crown")).toBe(false);
  });

  it("need the gems, and need to be a real cosmetic", () => {
    expect(applyUnlockCosmetic({ ...DEFAULT_STATE, gems: 10 }, "crown").cosmetics).toEqual([]);
    expect(applyUnlockCosmetic(rich, "not-a-thing")).toBe(rich);
    expect(applyUnlockCosmetic(rich, "hat")).toBe(rich); // already free, nothing to buy
  });
});

describe("taking the account's answer (signed in)", () => {
  const snapshot = {
    spent: 60,
    granted: 25,
    hintTokens: 2,
    cosmetics: ["bow"],
    chests: { day: DAY, opened: 2 },
    history: [
      { day: DAY, source: "lesson" as const, kind: "gems" as const, amount: 20, converted: false },
    ],
  };

  it("takes grants, spend, tokens, cosmetics, today's chests and the history", () => {
    const local = { ...DEFAULT_STATE, gems: 100 };
    const next = adoptRewards(local, snapshot);
    expect(next).toMatchObject({
      gemsSpent: 60,
      gemsGranted: 25,
      hintTokens: 2,
      cosmetics: ["bow"],
      chests: { day: DAY, opened: 2 },
    });
    // Earned here stays earned; the balance is earned + granted - spent.
    expect(next.gems).toBe(100 + 25 - 60);
    expect(gemsEarned(next)).toBe(gemsEarned(local));
    expect(next.chestHistory).toEqual(snapshot.history);
  });

  it("takes hint tokens exactly as the server holds them, down as well as up", () => {
    const local = { ...DEFAULT_STATE, hintTokens: 5 };
    expect(adoptRewards(local, { ...snapshot, hintTokens: 1 }).hintTokens).toBe(1);
  });

  it("never removes a cosmetic, never refunds spend, never takes a grant back", () => {
    const local = {
      ...DEFAULT_STATE,
      gems: 10,
      gemsSpent: 100,
      gemsGranted: 50,
      cosmetics: ["crown"],
    };
    const next = adoptRewards(local, { ...snapshot, spent: 10, granted: 5, cosmetics: ["bow"] });
    expect(next.cosmetics.sort()).toEqual(["bow", "crown"]);
    expect(next.gemsSpent).toBe(100);
    expect(next.gemsGranted).toBe(50);
  });

  it("returns the same object when there is nothing new", () => {
    const once = adoptRewards({ ...DEFAULT_STATE, gems: 100 }, snapshot);
    expect(adoptRewards(once, snapshot)).toBe(once);
  });
});

describe("wallet adoption with grants", () => {
  it("adds grants to the balance and leaves lifetime earned alone", () => {
    const local = { ...DEFAULT_STATE, gems: 50, gemsSpent: 10 };
    const next = adoptWallet(local, { spent: 10, granted: 30 });
    expect(next.gems).toBe(80);
    expect(gemsEarned(next)).toBe(gemsEarned(local));
  });

  it("works with a reply that has no grants in it", () => {
    const local = { ...DEFAULT_STATE, gems: 50, gemsGranted: 20 };
    expect(adoptWallet(local, { spent: 0 })).toBe(local);
    expect(adoptWallet(local, { spent: 5 }).gems).toBe(45);
  });
});

describe("weekly XP on this device", () => {
  const earn = (prev: ProgressState, xp: number, day = DAY) =>
    withWeeklyXp(prev, { ...prev, xp: prev.xp + xp }, day);

  it("adds the XP a transition earned to that day's week", () => {
    const next = earn(DEFAULT_STATE, 50);
    expect(next.weeklyXp).toEqual({ "2026-09-28": 50 });
    expect(earn(next, 25, "2026-10-02").weeklyXp).toEqual({ "2026-09-28": 75 });
    expect(earn(next, 25, "2026-10-05").weeklyXp).toEqual({ "2026-09-28": 50, "2026-10-05": 25 });
  });

  it("counts nothing when no XP was earned, or when XP went down", () => {
    expect(withWeeklyXp(DEFAULT_STATE, DEFAULT_STATE, DAY)).toBe(DEFAULT_STATE);
    const higher = { ...DEFAULT_STATE, xp: 100 };
    expect(withWeeklyXp(higher, { ...higher, xp: 40 }, DAY).weeklyXp).toEqual({});
  });

  it("keeps the last twelve weeks", () => {
    let state = DEFAULT_STATE;
    for (let week = 0; week < 15; week++) {
      const day = new Date(Date.UTC(2026, 0, 5 + week * 7)).toISOString().slice(0, 10);
      state = earn(state, 10, day);
    }
    const weeks = Object.keys(state.weeklyXp).sort();
    expect(weeks).toHaveLength(12);
    expect(weeks[0]).toBe("2026-01-26");
  });
});
