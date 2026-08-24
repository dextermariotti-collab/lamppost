/** Pure evaluation of a shared streak, used by the server on every read. */

export const SHARED_STREAK_MILESTONES = [7, 30, 100, 365];
export const MAX_SHARED_STREAKS = 5;

export function evaluateSharedStreak(input: {
  count: number;
  lastExtendedDay: string | null;
  bothActiveToday: boolean;
  today: string;
  yesterday: string;
}): { count: number; lastExtendedDay: string | null; changed: boolean; milestone: number | null } {
  const { count, lastExtendedDay, bothActiveToday, today, yesterday } = input;

  if (lastExtendedDay === today) {
    return { count, lastExtendedDay, changed: false, milestone: null };
  }

  if (bothActiveToday) {
    const next = lastExtendedDay === yesterday ? count + 1 : 1;
    return {
      count: next,
      lastExtendedDay: today,
      changed: true,
      milestone: SHARED_STREAK_MILESTONES.includes(next) ? next : null,
    };
  }

  if (lastExtendedDay !== null && lastExtendedDay < yesterday && count !== 0) {
    return { count: 0, lastExtendedDay, changed: true, milestone: null };
  }

  return { count, lastExtendedDay, changed: false, milestone: null };
}
