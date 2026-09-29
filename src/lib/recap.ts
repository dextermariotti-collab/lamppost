import type { ProgressState } from "./progress-core";
import { daysOfWeek, isMonday, previousWeekStart } from "./weeks";

/**
 * The Monday recap: what last week looked like, from the learner's own history on
 * this device. It says what happened and nothing else. A week with nothing in it
 * gets no card at all (there is nothing to look back on, and an empty week is not
 * something to point at), and it is shown on Mondays only.
 */

export type WeeklyRecap = {
  /** The Monday that started the week being looked back on. */
  weekStart: string;
  /** Lessons, reviews and challenges finished that week. */
  completed: number;
  activeDays: number;
  bestDay: { day: string; count: number } | null;
  /** XP earned on this device that week, or null if this device didn't track it. */
  xp: number | null;
};

export function weeklyRecap(
  state: Pick<ProgressState, "history" | "weeklyXp">,
  today: string,
): WeeklyRecap | null {
  if (!isMonday(today)) return null;
  const weekStart = previousWeekStart(today);
  const days = daysOfWeek(weekStart).map((day) => ({ day, count: state.history[day] ?? 0 }));
  const completed = days.reduce((sum, d) => sum + d.count, 0);
  if (completed === 0) return null;
  const active = days.filter((d) => d.count > 0);
  const best = active.reduce((top, d) => (d.count > top.count ? d : top), active[0]!);
  const xp = state.weeklyXp[weekStart];
  return {
    weekStart,
    completed,
    activeDays: active.length,
    bestDay: active.length > 1 ? best : null,
    xp: typeof xp === "number" && xp > 0 ? xp : null,
  };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The sentence at the top of the card. */
export function recapHeadline(recap: WeeklyRecap): string {
  return `Last week you finished ${plural(recap.completed, "thing")} across ${plural(recap.activeDays, "day")}.`;
}

/** The small facts under it, each one true and countable. */
export function recapFacts(recap: WeeklyRecap): string[] {
  const facts: string[] = [];
  if (recap.xp !== null) facts.push(`${recap.xp.toLocaleString("en-GB")} XP earned`);
  if (recap.bestDay) {
    const weekday = new Date(`${recap.bestDay.day}T12:00:00Z`).toLocaleDateString("en-GB", {
      weekday: "long",
      timeZone: "UTC",
    });
    facts.push(`Busiest day: ${weekday}, ${recap.bestDay.count}`);
  }
  return facts;
}

/** Local key for "the recap for this week has been put away". */
export const RECAP_DISMISSED_KEY = "lamppost-recap-dismissed";
