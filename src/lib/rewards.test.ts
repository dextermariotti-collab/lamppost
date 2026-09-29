import { describe, expect, it } from "vitest";
import {
  CHEST_DAILY_CAP,
  CHEST_PRIZES,
  COSMETICS,
  HINT_OVERFLOW_GEMS,
  cosmeticById,
  chestsAvailable,
  expectedChestGems,
  isCosmetic,
  rollChest,
  secureRandom,
} from "./rewards";
import { COMPANION_ACCESSORIES, COMPANION_PALETTES } from "./companions";

describe("the chest odds", () => {
  it("add up to exactly 100, so each weight is also a percentage", () => {
    expect(CHEST_PRIZES.reduce((sum, prize) => sum + prize.weight, 0)).toBe(100);
  });

  it("never pay out nothing, and only in gems or a hint token", () => {
    for (const prize of CHEST_PRIZES) {
      expect(prize.amount).toBeGreaterThan(0);
      expect(["gems", "hint"]).toContain(prize.kind);
    }
  });

  it("have unique ids", () => {
    expect(new Set(CHEST_PRIZES.map((p) => p.id)).size).toBe(CHEST_PRIZES.length);
  });

  it("are modest: a chest is worth a few gems, well under a streak freeze", () => {
    expect(expectedChestGems()).toBeGreaterThan(5);
    expect(expectedChestGems()).toBeLessThan(15);
    // Even three chests a day take days to add up to one freeze.
    expect(expectedChestGems() * CHEST_DAILY_CAP).toBeLessThan(60);
  });
});

describe("rolling a chest", () => {
  it("picks by weight from the whole range, in order", () => {
    // Boundaries: 0-55 gems-5, 55-80 gems-10, 80-90 gems-20, 90-97 hint, 97-100 gems-40.
    const at = (point: number) => rollChest(() => point / 100).id;
    expect(at(0)).toBe("gems-5");
    expect(at(54.9)).toBe("gems-5");
    expect(at(55)).toBe("gems-10");
    expect(at(79.9)).toBe("gems-10");
    expect(at(80)).toBe("gems-20");
    expect(at(89.9)).toBe("gems-20");
    expect(at(90)).toBe("hint-1");
    expect(at(96.9)).toBe("hint-1");
    expect(at(97)).toBe("gems-40");
    expect(at(99.999)).toBe("gems-40");
  });

  it("copes with a random source at or beyond the edges", () => {
    expect(rollChest(() => 1).id).toBe("gems-40");
    expect(rollChest(() => 5).id).toBe("gems-40");
    expect(rollChest(() => -1).id).toBe("gems-5");
    expect(rollChest(() => Number.NaN).id).toBe(CHEST_PRIZES[0]!.id);
  });

  it("gives every prize its advertised share over many rolls", () => {
    const counts = new Map<string, number>();
    // A fixed, evenly spread sequence: the share of each prize must match its weight.
    const n = 10_000;
    for (let i = 0; i < n; i++) {
      const id = rollChest(() => (i + 0.5) / n).id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const prize of CHEST_PRIZES) {
      expect((counts.get(prize.id) ?? 0) / n).toBeCloseTo(prize.weight / 100, 2);
    }
  });

  it("the secure random source stays inside [0, 1)", () => {
    for (let i = 0; i < 200; i++) {
      const value = secureRandom();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("a hint token overflowing the pouch is worth a modest, stated number of gems", () => {
    expect(HINT_OVERFLOW_GEMS).toBeGreaterThan(0);
    expect(HINT_OVERFLOW_GEMS).toBeLessThanOrEqual(CHEST_PRIZES[0]!.amount);
  });
});

describe("how many chests can be opened today", () => {
  it("is one for each thing done today, up to the daily cap", () => {
    expect(chestsAvailable({ doneToday: 0, openedToday: 0 })).toBe(0);
    expect(chestsAvailable({ doneToday: 1, openedToday: 0 })).toBe(1);
    expect(chestsAvailable({ doneToday: 2, openedToday: 0 })).toBe(2);
    expect(chestsAvailable({ doneToday: 3, openedToday: 0 })).toBe(3);
    expect(chestsAvailable({ doneToday: 40, openedToday: 0 })).toBe(CHEST_DAILY_CAP);
  });

  it("counts the ones already opened, and never goes negative", () => {
    expect(chestsAvailable({ doneToday: 5, openedToday: 1 })).toBe(2);
    expect(chestsAvailable({ doneToday: 5, openedToday: 3 })).toBe(0);
    expect(chestsAvailable({ doneToday: 1, openedToday: 3 })).toBe(0);
    expect(chestsAvailable({ doneToday: 5, openedToday: 9 })).toBe(0);
  });

  it("ignores nonsense", () => {
    expect(chestsAvailable({ doneToday: -4, openedToday: 0 })).toBe(0);
    expect(chestsAvailable({ doneToday: 2.9, openedToday: -3 })).toBe(2);
  });
});

describe("cosmetics", () => {
  it("each has a price, a name and a unique id", () => {
    expect(new Set(COSMETICS.map((c) => c.id)).size).toBe(COSMETICS.length);
    for (const item of COSMETICS) {
      expect(item.cost).toBeGreaterThan(0);
      expect(item.name.length).toBeGreaterThan(0);
    }
  });

  it("the companion can actually wear every one, and what it could already wear is free", () => {
    for (const item of COSMETICS) {
      const list = item.kind === "accessory" ? COMPANION_ACCESSORIES : COMPANION_PALETTES;
      expect(
        list.some((entry) => entry.id === item.id),
        item.id,
      ).toBe(true);
    }
    for (const free of [
      "none",
      "hat",
      "glasses",
      "scarf",
      "lavender",
      "ember",
      "mint",
      "sky",
      "plum",
      "sun",
    ]) {
      expect(isCosmetic(free), free).toBe(false);
    }
  });

  it("can be looked up", () => {
    expect(cosmeticById("crown")).toMatchObject({ kind: "accessory", cost: 200 });
    expect(cosmeticById("nope")).toBeUndefined();
  });
});
