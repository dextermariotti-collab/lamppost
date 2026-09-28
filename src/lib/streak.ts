import { daysBetween, shiftDay } from "./days";

/** Most freezes that can be held at once, and the gem price of one. */
export const MAX_FREEZES = 2;
export const FREEZE_COST = 60;

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
  if (prev.lastActiveDay === today) {
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
