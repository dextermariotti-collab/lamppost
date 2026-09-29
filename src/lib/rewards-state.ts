import { adoptWallet, type ProgressState } from "./progress-core";
import { weekStartOf } from "./weeks";
import {
  HINT_COST,
  HINT_OVERFLOW_GEMS,
  MAX_HINT_TOKENS,
  chestsAvailable,
  cosmeticById,
  type ChestPrize,
  type ChestRecord,
  type ChestSource,
} from "./rewards";

/**
 * The learner's rewards as they live on a device, as pure state transitions.
 *
 * Signed out, the device is the only place gems, hint tokens and cosmetics can
 * exist, so these functions do the buying and opening. Signed in, the account owns
 * them: the server buys and opens, and the device only takes its answer with
 * `adoptRewards`. Either way the same rules apply, from rewards.ts.
 */

/** How many chests have been opened on `day` (the count belongs to one local day). */
export const chestsOpenedOn = (state: Pick<ProgressState, "chests">, day: string) =>
  state.chests.day === day ? state.chests.opened : 0;

/** Chests that can still be opened today: one per thing done today, three at most. */
export const chestsLeft = (state: Pick<ProgressState, "chests" | "history">, day: string): number =>
  chestsAvailable({ doneToday: state.history[day] ?? 0, openedToday: chestsOpenedOn(state, day) });

const HISTORY_LENGTH = 30;

/**
 * Opens a chest on this device (the signed-out path). Returns null when there is
 * no chest to open. A hint token that would overflow the pouch is paid as gems
 * instead, and the record says so.
 */
export function applyOpenChest(
  prev: ProgressState,
  input: { day: string; source: ChestSource; prize: ChestPrize },
): { state: ProgressState; record: ChestRecord } | null {
  if (chestsLeft(prev, input.day) <= 0) return null;
  const { prize } = input;
  const overflow = prize.kind === "hint" && prev.hintTokens + prize.amount > MAX_HINT_TOKENS;
  const record: ChestRecord = {
    day: input.day,
    source: input.source,
    kind: overflow ? "gems" : prize.kind,
    amount: overflow ? HINT_OVERFLOW_GEMS : prize.amount,
    converted: overflow,
  };
  const state: ProgressState = {
    ...prev,
    gems: prev.gems + (record.kind === "gems" ? record.amount : 0),
    hintTokens: prev.hintTokens + (record.kind === "hint" ? record.amount : 0),
    chests: { day: input.day, opened: chestsOpenedOn(prev, input.day) + 1 },
    chestHistory: [record, ...prev.chestHistory].slice(0, HISTORY_LENGTH),
  };
  return { state, record };
}

/** Whether a hint token can be bought right now. */
export const canBuyHint = (state: Pick<ProgressState, "gems" | "hintTokens">) =>
  state.gems >= HINT_COST && state.hintTokens < MAX_HINT_TOKENS;

/** Buys a hint token with gems on this device (the signed-out path). */
export function applyBuyHint(prev: ProgressState): ProgressState {
  return canBuyHint(prev)
    ? {
        ...prev,
        gems: prev.gems - HINT_COST,
        gemsSpent: prev.gemsSpent + HINT_COST,
        hintTokens: prev.hintTokens + 1,
      }
    : prev;
}

/** Uses one hint token, if there is one. */
export function applyUseHint(prev: ProgressState): ProgressState {
  return prev.hintTokens > 0 ? { ...prev, hintTokens: prev.hintTokens - 1 } : prev;
}

/** Whether a cosmetic can be unlocked right now. */
export function canUnlockCosmetic(
  state: Pick<ProgressState, "gems" | "cosmetics">,
  id: string,
): boolean {
  const item = cosmeticById(id);
  return !!item && !state.cosmetics.includes(id) && state.gems >= item.cost;
}

/** Unlocks a cosmetic with gems on this device (the signed-out path). */
export function applyUnlockCosmetic(prev: ProgressState, id: string): ProgressState {
  const item = cosmeticById(id);
  if (!item || !canUnlockCosmetic(prev, id)) return prev;
  return {
    ...prev,
    gems: prev.gems - item.cost,
    gemsSpent: prev.gemsSpent + item.cost,
    cosmetics: [...prev.cosmetics, id],
  };
}

/** What the server says the account holds, as returned by getRewards and the buy calls. */
export type RewardsSnapshot = {
  spent: number;
  granted: number;
  hintTokens: number;
  cosmetics: string[];
  /** The chests opened on `today`, the day the snapshot was asked for. */
  chests: { day: string; opened: number };
  history: ChestRecord[];
};

/**
 * Takes the account's rewards as the truth (the signed-in path). Spend and grants
 * only move up, hint tokens are exactly what the server holds, and cosmetics are
 * added to, never removed.
 */
export function adoptRewards(prev: ProgressState, snapshot: RewardsSnapshot): ProgressState {
  const wallet = adoptWallet(prev, { spent: snapshot.spent, granted: snapshot.granted });
  const cosmetics = Array.from(new Set([...wallet.cosmetics, ...snapshot.cosmetics]));
  const same =
    wallet.hintTokens === snapshot.hintTokens &&
    cosmetics.length === wallet.cosmetics.length &&
    wallet.chests.day === snapshot.chests.day &&
    wallet.chests.opened === snapshot.chests.opened &&
    JSON.stringify(wallet.chestHistory) === JSON.stringify(snapshot.history);
  if (same) return wallet;
  return {
    ...wallet,
    hintTokens: snapshot.hintTokens,
    cosmetics,
    chests: { ...snapshot.chests },
    chestHistory: snapshot.history.slice(0, HISTORY_LENGTH),
  };
}

const WEEKS_KEPT = 12;

/**
 * Adds the XP a transition earned to the week it was earned in. Only XP the
 * learner earned counts: it is applied to their own actions, not to numbers folded
 * in from the account.
 */
export function withWeeklyXp(
  prev: ProgressState,
  next: ProgressState,
  today: string,
): ProgressState {
  const gained = next.xp - prev.xp;
  if (gained <= 0) return next;
  const week = weekStartOf(today);
  const weeks = { ...next.weeklyXp, [week]: (next.weeklyXp[week] ?? 0) + gained };
  const keep = Object.keys(weeks).sort().slice(-WEEKS_KEPT);
  return { ...next, weeklyXp: Object.fromEntries(keep.map((key) => [key, weeks[key]!])) };
}
