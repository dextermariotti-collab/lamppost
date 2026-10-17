import { daysBetween, shiftDay } from "./days";

/** Most freezes that can be held at once, and the gem price of one. */
export const MAX_FREEZES = 2;

export type StreakState = {
  streak: number;
  /** YYYY-MM-DD of the last day a lesson/review was completed */
  lastActiveDay: string | null;
  /** unused streak freezes held */
  freezes: number;
  /** YYYY-MM-DD days a freeze covered, so they're only spent once */
  freezeLog: string[];
  /** set when the last visit was rescued by a freeze, consumed by the UI */
  freezeSaved: { days: number; day: string } | null;
};

/**
 * Streak forgiveness. A gap of missed days is covered by held freezes (one per
 * missed day) so the streak continues instead of resetting — loss aversion only
 * motivates while there's an escape valve. Every 7th day earns a freeze back.
 */
export function advanceStreak(prev: StreakState, today: string) {
  // Same day — or a clock that is behind the last active day (traveled west):
  // either way no new day has been earned.
  if (prev.lastActiveDay !== null && prev.lastActiveDay >= today) {
    return {
      streak: prev.streak,
      freezes: prev.freezes,
      freezeLog: prev.freezeLog,
      freezeSaved: prev.freezeSaved,
    };
  }
  const gap = prev.lastActiveDay ? daysBetween(prev.lastActiveDay, today) - 1 : 0;
  let streak = 1;
  let freezes = prev.freezes;
  let freezeLog = prev.freezeLog;
  let freezeSaved: StreakState["freezeSaved"] = null;

  if (prev.lastActiveDay && gap <= 0) {
    streak = prev.streak + 1;
  } else if (prev.lastActiveDay && gap > 0 && gap <= freezes) {
    const covered = Array.from({ length: gap }, (_, i) => shiftDay(today, -(i + 1)));
    freezes -= gap;
    freezeLog = [...prev.freezeLog, ...covered].slice(-30);
    freezeSaved = { days: gap, day: today };
    streak = prev.streak + 1;
  }

  if (streak > 0 && streak % 7 === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
  return { streak, freezes, freezeLog, freezeSaved };
}

/**
 * The streak to show right now. The stored counter only changes when a lesson,
 * review or challenge is finished, so on its own it goes stale: after a missed
 * day it would keep showing the old number until the next activity reset it.
 * Every screen shows this instead, so the lesson-complete screen, Home, Progress,
 * Profile and the course page cannot disagree.
 *
 * A streak is alive if the last active day is today or yesterday, or if the
 * missed days in between are all covered by freezes still held.
 */
export function effectiveStreak(
  state: Pick<StreakState, "streak" | "lastActiveDay" | "freezes">,
  today: string,
) {
  if (state.lastActiveDay === null) return 0;
  const missed = daysBetween(state.lastActiveDay, today) - 1;
  return missed <= 0 || missed <= state.freezes ? state.streak : 0;
}

/**
 * The server's twin of the client's streak rules: the current streak recomputed
 * from the days the account really has activity on, instead of trusting the
 * number a browser sends. It is the run of consecutive active days ending at the
 * most recent active day; a gap may be bridged by a freeze day the client logged,
 * but only up to a plausible number of freezes (2, plus one per 3 active days),
 * so a forged freeze log can't paper over a broken run. Frozen days keep the run
 * alive without counting toward it, exactly as on the device.
 */
export function streakEndingAtLatest(
  activeDays: Iterable<string>,
  freezeDays: Iterable<string> = [],
): { streak: number; lastActiveDay: string | null } {
  const active = new Set(activeDays);
  if (active.size === 0) return { streak: 0, lastActiveDay: null };
  const frozen = new Set(freezeDays);
  const lastActiveDay = [...active].sort().pop()!;
  let budget = Math.min(frozen.size, MAX_FREEZES + Math.floor(active.size / 3));

  let streak = 0;
  let cursor = lastActiveDay;
  // A run cannot be longer than the days we have been told about.
  for (let guard = 0; guard < active.size + frozen.size + 1; guard++) {
    if (active.has(cursor)) streak += 1;
    else if (frozen.has(cursor) && budget > 0) budget -= 1;
    else break;
    cursor = shiftDay(cursor, -1);
  }
  return { streak, lastActiveDay };
}
