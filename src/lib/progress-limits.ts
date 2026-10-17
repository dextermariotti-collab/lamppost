import { acceptableHistory } from "./client-day";
import { shiftDay } from "./days";

/**
 * What the server is willing to record when a device syncs its progress.
 *
 * Lessons are completed in the browser, so the server cannot prove one was done.
 * What it can do is refuse impossible claims and bound the rest: nobody finishes
 * 400 lessons in a day, earns a year of XP in an afternoon, or back-dates a
 * month-long streak after the fact. These limits are deliberately generous — a
 * real learner never meets them — and exist to cap what a forged request can do.
 */

/** Most lesson-or-review completions counted for one day. */
export const MAX_ACTIVITY_PER_DAY = 40;
/** Most XP / gems that can arrive per day since the last sync (plus one day of slack). */
export const MAX_XP_PER_DAY = 4000;
export const MAX_GEMS_PER_DAY = 800;
/** After an account's first sync, activity can only be added for this many recent days. */
export const BACKFILL_DAYS = 7;
/** The first sync imports what a device did before signing in, up to this many days. */
export const FIRST_SYNC_DAYS = 60;

const DAY_MS = 86_400_000;

/**
 * Activity days to store: valid, not from the future, capped per day, and — once
 * the account has synced before — only recent ones.
 */
export function activityToStore(
  history: Record<string, number>,
  opts: { today: string; firstSync: boolean; now?: Date },
): [day: string, count: number][] {
  const earliest = opts.firstSync ? null : shiftDay(opts.today, -BACKFILL_DAYS);
  return acceptableHistory(history, opts.now, FIRST_SYNC_DAYS)
    .filter(([day]) => earliest === null || day >= earliest)
    .map(([day, count]): [string, number] => [day, Math.min(count, MAX_ACTIVITY_PER_DAY)]);
}

/**
 * How much a counter (XP or gems) may grow in one sync: a day's worth for every
 * day since the last sync, plus one; for the first sync, for every day of
 * activity being imported, plus one.
 */
export function growthAllowance(opts: {
  perDay: number;
  lastSyncedAt: Date | null;
  activeDays: number;
  now?: Date;
}): number {
  const now = opts.now ?? new Date();
  const days = opts.lastSyncedAt
    ? Math.min(FIRST_SYNC_DAYS, Math.ceil((now.getTime() - opts.lastSyncedAt.getTime()) / DAY_MS))
    : Math.min(FIRST_SYNC_DAYS, opts.activeDays);
  return opts.perDay * (Math.max(days, 0) + 1);
}

/** The stored total after a sync: never lower than before, never above the allowance. */
export function boundedTotal(existing: number, claimed: number, allowance: number): number {
  return Math.max(existing, Math.min(Math.max(claimed, 0), existing + allowance));
}

/**
 * What a device's first sync may carry over from before it had an account.
 *
 * A signed-out learner spends gems and unlocks things on the device, where the
 * account cannot see it. Without this, signing in would give those gems back (the
 * account has never heard of the spend) and the things would vanish. So the FIRST
 * sync, and only the first, accepts the device's word for it, bounded by what the
 * account can bear: nobody spends more than they earned, holds more hint tokens
 * than the pouch, or unlocks anything outside the catalog. All of it is low-stakes
 * (cosmetics and hints), which is why the device's word is enough.
 */
export function firstSyncCarryOver(input: {
  claim: { gemsSpent: number; hintTokens: number; cosmetics: string[] } | undefined;
  earnedPlusGranted: number;
  maxHintTokens: number;
  isCosmetic: (id: string) => boolean;
}): { gemsSpent: number; hintTokens: number; cosmetics: string[] } {
  const claim = input.claim ?? { gemsSpent: 0, hintTokens: 0, cosmetics: [] };
  return {
    gemsSpent: Math.max(0, Math.min(Math.floor(claim.gemsSpent), input.earnedPlusGranted)),
    hintTokens: Math.max(0, Math.min(Math.floor(claim.hintTokens), input.maxHintTokens)),
    cosmetics: Array.from(new Set(claim.cosmetics.filter(input.isCosmetic))),
  };
}

/**
 * The XP to credit to this week's league total for a sync. It is the growth in the
 * account's bounded XP total since the last sync, so it can never exceed what the
 * account was allowed to gain; and the first sync credits nothing, because that one
 * imports everything done before signing in, which is not this week's.
 */
export function weeklyXpCredit(input: {
  firstSync: boolean;
  before: number;
  after: number;
}): number {
  if (input.firstSync) return 0;
  return Math.max(0, input.after - input.before);
}

/** Most finished lessons an account keeps (the database holds the same bound). */
export const MAX_DONE_LESSONS = 200;

/**
 * The account's finished lessons after a sync: what it already had, plus the ids the device
 * reports that are real lessons. Nothing is ever removed, and an id the curriculum no longer has
 * stays once stored. Returns null when nothing new would be stored.
 */
export function doneLessonsToStore(
  stored: readonly string[],
  claimed: readonly string[],
  known: ReadonlySet<string>,
): string[] | null {
  const have = new Set(stored);
  const added = [...new Set(claimed)].filter((id) => known.has(id) && !have.has(id));
  if (added.length === 0) return null;
  return [...stored, ...added].slice(0, MAX_DONE_LESSONS);
}
