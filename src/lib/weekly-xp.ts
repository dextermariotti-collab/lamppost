import type { ProgressState } from "./progress-core";
import { weekStartOf } from "./weeks";

/** Weeks of XP kept on the device, for the league and the Monday recap. */
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
