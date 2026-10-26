/**
 * Calendar-day helpers shared by client stores and server functions.
 *
 * A "day key" is a YYYY-MM-DD string naming a calendar date. Every user-facing
 * notion of "today" (streaks, daily goal, review due dates, the calendar, the
 * daily case) is the device's LOCAL calendar date, so it rolls over at the
 * learner's midnight and not at 8pm Eastern / 5pm Pacific like the UTC date.
 */

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date written as YYYY-MM-DD. */
export function isDayKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = DAY_KEY.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return (
    date.getUTCFullYear() === Number(y) &&
    date.getUTCMonth() === Number(m) - 1 &&
    date.getUTCDate() === Number(d)
  );
}

/** The LOCAL calendar day of `date` (the device's timezone) as YYYY-MM-DD. */
export function dayKey(date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Pure calendar arithmetic on a day key; independent of any timezone. */
export function shiftDay(key: string, days: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string) {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** The UTC calendar day of `date`. Server sanity checks only — never shown to a learner. */
export function utcDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Whether a client-supplied "today" could be a real local date right now.
 * Every timezone on Earth (UTC-12 … UTC+14) is within one calendar day of the
 * UTC date, so anything further out is a bad clock or a forged request.
 */
export function isPlausibleLocalDay(key: unknown, now = new Date()): key is string {
  if (!isDayKey(key)) return false;
  return Math.abs(daysBetween(utcDay(now), key)) <= 1;
}

export function monthYear(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
