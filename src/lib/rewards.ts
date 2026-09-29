import { FREEZE_COST, MAX_FREEZES } from "./streak";

/**
 * What gems can buy and what a reward chest can hold, in one place, so the server
 * that rolls and charges and the screen that shows the odds and prices cannot
 * disagree. The rules are meant to be plain:
 *
 * - the odds are fixed and shown before a chest is opened;
 * - at most three chests a day, and a chest is never for sale (no real money);
 * - nothing counts down, nothing is "limited time", and a chest you don't open is
 *   simply not there tomorrow rather than piling up as a debt.
 */

export const CHEST_DAILY_CAP = 3;

export type ChestSource = "lesson" | "review" | "challenge";

export type ChestPrize = { id: string; kind: "gems" | "hint"; amount: number; weight: number };

/** Weights add up to 100, so each is also the percentage chance. */
export const CHEST_PRIZES: readonly ChestPrize[] = [
  { id: "gems-5", kind: "gems", amount: 5, weight: 55 },
  { id: "gems-10", kind: "gems", amount: 10, weight: 25 },
  { id: "gems-20", kind: "gems", amount: 20, weight: 10 },
  { id: "hint-1", kind: "hint", amount: 1, weight: 7 },
  { id: "gems-40", kind: "gems", amount: 40, weight: 3 },
];

export const MAX_HINT_TOKENS = 5;
/** What a hint token is worth when the pouch is full. */
export const HINT_OVERFLOW_GEMS = 5;
export const HINT_COST = 20;

/** Picks a prize by weight from a uniform number in [0, 1). */
export function rollChest(random: () => number = Math.random): ChestPrize {
  const total = CHEST_PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
  let point = Math.min(Math.max(random(), 0), 0.999999999) * total;
  for (const prize of CHEST_PRIZES) {
    if (point < prize.weight) return prize;
    point -= prize.weight;
  }
  return CHEST_PRIZES[0]!;
}

/** Average gems per chest, counting a hint token as its overflow value. Shown to the learner. */
export const expectedChestGems = () =>
  CHEST_PRIZES.reduce(
    (sum, prize) =>
      sum + (prize.weight / 100) * (prize.kind === "gems" ? prize.amount : HINT_OVERFLOW_GEMS),
    0,
  );

/**
 * How many chests can still be opened today: a chest is for something actually
 * done today (one per lesson, review or challenge completed), never more than the
 * daily cap, and never more than are left after the ones already opened.
 */
export function chestsAvailable(input: { doneToday: number; openedToday: number }): number {
  const allowed = Math.min(CHEST_DAILY_CAP, Math.max(0, Math.floor(input.doneToday)));
  return Math.max(0, allowed - Math.max(0, input.openedToday));
}

export type Cosmetic = {
  id: string;
  kind: "accessory" | "palette";
  name: string;
  cost: number;
};

/**
 * Companion cosmetics that cost gems. What a companion could already wear (no
 * accessory, hat, glasses, scarf) stays free, so nobody loses something they had.
 */
export const COSMETICS: readonly Cosmetic[] = [
  { id: "headphones", kind: "accessory", name: "Headphones", cost: 80 },
  { id: "bow", kind: "accessory", name: "Bow", cost: 100 },
  { id: "crown", kind: "accessory", name: "Little crown", cost: 200 },
  { id: "ocean", kind: "palette", name: "Ocean", cost: 100 },
  { id: "rose", kind: "palette", name: "Rose", cost: 100 },
];

export const cosmeticById = (id: string) => COSMETICS.find((item) => item.id === id);

/** Whether a companion part needs unlocking before it can be worn. */
export const isCosmetic = (id: string) => COSMETICS.some((item) => item.id === id);

export type StoreItem =
  | { kind: "freeze"; cost: number }
  | { kind: "hint"; cost: number }
  | { kind: "cosmetic"; id: string; cost: number };

export const PRICES = { freeze: FREEZE_COST, hint: HINT_COST, maxFreezes: MAX_FREEZES } as const;

/** One chest opening as kept in history. */
export type ChestRecord = {
  day: string;
  source: ChestSource;
  kind: "gems" | "hint";
  amount: number;
  /** A hint token that would not fit the pouch and was paid as gems. */
  converted: boolean;
};

/** A uniform random number in [0, 1) from the platform's secure generator. */
export function secureRandom(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0]! / 2 ** 32;
}
