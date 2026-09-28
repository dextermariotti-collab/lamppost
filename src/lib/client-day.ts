import { z } from "zod";
import { isDayKey, isPlausibleLocalDay, shiftDay, utcDay } from "./days";

/**
 * Server functions that need "today" take the caller's LOCAL calendar day as an
 * argument, because the server cannot know the learner's timezone and the client
 * keys every activity by its own local day. The value is only trusted if it could
 * be a real local date right now; otherwise the UTC day is used as a fallback.
 */
export const TodayInput = z.object({ today: z.string().optional() }).optional();

export function resolveToday(input: { today?: string | undefined } | undefined, now = new Date()) {
  return isPlausibleLocalDay(input?.today, now) ? input!.today! : utcDay(now);
}

/**
 * The days of a client-sent activity history that the server will store: real
 * dates, with a positive count, no further ahead than any timezone could be right
 * now (so a device in Auckland can sync "today" while the UTC date is still
 * yesterday), newest first and capped.
 */
export function acceptableHistory(
  history: Record<string, number>,
  now = new Date(),
  limit = 60,
): [day: string, count: number][] {
  const latest = shiftDay(utcDay(now), 1);
  return Object.entries(history)
    .filter(([day, count]) => isDayKey(day) && day <= latest && count > 0)
    .map(([day, count]): [string, number] => [day, Math.min(Math.round(count), 1000)])
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, limit);
}
