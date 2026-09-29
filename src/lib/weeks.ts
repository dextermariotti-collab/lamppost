import { daysBetween, isDayKey, shiftDay } from "./days";

/**
 * Weeks start on Monday and are counted in the learner's own calendar days, like
 * everything else (see days.ts), so "this week" is the week they are living in.
 */

/** 0 = Monday … 6 = Sunday, for a YYYY-MM-DD day key. */
export function weekdayIndex(day: string): number {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** The Monday on or before `day`. */
export function weekStartOf(day: string): string {
  return shiftDay(day, -weekdayIndex(day));
}

export const isMonday = (day: string) => weekdayIndex(day) === 0;

/** The Monday of the week before the one `day` is in. */
export const previousWeekStart = (day: string) => shiftDay(weekStartOf(day), -7);

/** The seven day keys of the week starting on `start`. */
export const daysOfWeek = (start: string): string[] =>
  Array.from({ length: 7 }, (_, i) => shiftDay(start, i));

/** True for a Monday-start week key. */
export const isWeekStart = (value: unknown): value is string =>
  isDayKey(value) && weekdayIndex(value) === 0;

/** Whole weeks between two week starts (positive when `to` is later). */
export const weeksBetween = (from: string, to: string) => Math.round(daysBetween(from, to) / 7);
