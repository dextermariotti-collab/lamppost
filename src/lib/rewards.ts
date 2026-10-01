/**
 * What is left of the reward economy (gems, chests, hint tokens and companion cosmetics),
 * which is no longer part of the app. Its tables and SQL functions are still in the database,
 * so nothing anyone earned is lost, and a device saved before the change still carries these
 * fields. The account sync still checks them on a first sign-in (`firstSyncCarryOver`), so the
 * shapes and limits it checks against stay here.
 */

export type ChestSource = "lesson" | "review" | "challenge";

/** One chest opening as kept in an older save's history. */
export type ChestRecord = {
  day: string;
  source: ChestSource;
  kind: "gems" | "hint";
  amount: number;
  /** A hint token that would not fit the pouch and was paid as gems. */
  converted: boolean;
};

/** The most hint tokens an account could hold, for checking what a device carries over. */
export const MAX_HINT_TOKENS = 5;

/** The companion parts that used to be unlocked with gems. Every one is free to wear now. */
const FORMER_COSMETICS = ["headphones", "bow", "crown", "ocean", "rose"] as const;

/** Whether an id names one of those parts, for checking what a device carries over. */
export const isCosmetic = (id: string) => (FORMER_COSMETICS as readonly string[]).includes(id);
