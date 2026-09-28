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
