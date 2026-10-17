import { shiftDay } from "./days";

/**
 * Small, pure decisions behind the Progress screen, kept out of the components so they can be
 * tested without a browser: which skills to point out, one line for calibration, and the last
 * seven days as a strip of dots.
 */

// ---------- Skills ----------

/** Fewer answered drills than this and a unit's accuracy is too thin to compare. */
export const MIN_ANSWERED = 3;
/** Below this share right, a unit is worth another look. */
export const REVIEW_BELOW = 0.65;

export type SkillNote = "strongest" | "review";

type UnitAccuracy = { unitId: string; accuracy: number; answered: number };

/**
 * Names the strongest skill and any that deserve another look, in words. Says nothing until a
 * unit has enough answers, calls one "strongest" only when there is something to compare it
 * with and it clears the bar, and never picks between a tie.
 */
export function skillNotes(units: readonly UnitAccuracy[]): Record<string, SkillNote> {
  const notes: Record<string, SkillNote> = {};
  const eligible = units.filter((u) => u.answered >= MIN_ANSWERED);
  for (const unit of eligible) if (unit.accuracy < REVIEW_BELOW) notes[unit.unitId] = "review";
  if (eligible.length >= 2) {
    const top = Math.max(...eligible.map((u) => u.accuracy));
    const leaders = eligible.filter((u) => u.accuracy === top);
    const [leader] = leaders;
    if (leaders.length === 1 && leader && top >= REVIEW_BELOW) notes[leader.unitId] = "strongest";
  }
  return notes;
}

// ---------- Calibration ----------

type Band = { stated: number; actual: number; count: number };

export type CalibrationSummary = {
  count: number;
  /** Average stated confidence, 0..100, weighted by how many drills were in each band. */
  stated: number;
  /** Share actually right, 0..100, on the same weighting. */
  actual: number;
  verdict: "close" | "over" | "under";
};

/** Ten points or more apart counts as leaning one way. */
const CALIBRATION_GAP = 10;

export function calibrationSummary(bands: readonly Band[]): CalibrationSummary | null {
  const count = bands.reduce((n, b) => n + b.count, 0);
  if (count === 0) return null;
  const stated = Math.round(bands.reduce((n, b) => n + b.stated * b.count, 0) / count);
  const actual = Math.round(bands.reduce((n, b) => n + b.actual * b.count, 0) / count);
  const gap = stated - actual;
  return {
    count,
    stated,
    actual,
    verdict: gap >= CALIBRATION_GAP ? "over" : gap <= -CALIBRATION_GAP ? "under" : "close",
  };
}

export function calibrationLine(summary: CalibrationSummary): string {
  const ending = {
    close: "That is well matched.",
    over: "You lean a little overconfident.",
    under: "You lean a little underconfident.",
  }[summary.verdict];
  return `On average you said ${summary.stated}% sure and were right ${summary.actual}% of the time. ${ending}`;
}

// ---------- The last seven days ----------

export type StripDay = {
  key: string;
  /** One letter for the weekday. */
  letter: string;
  status: "done" | "freeze" | "quiet";
  isToday: boolean;
};

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const;

/** The weekday (0 = Sunday) of a YYYY-MM-DD key, read as that calendar date wherever you are. */
export function weekdayOf(key: string): number {
  return new Date(`${key}T00:00:00Z`).getUTCDay();
}

export function weekdayLetter(key: string): string {
  return WEEKDAY_LETTERS[weekdayOf(key)]!;
}

/** Seven days ending today: practiced, covered by a freeze, or quiet. */
export function weekStrip(
  state: { history: Record<string, number>; freezeLog: readonly string[] },
  today: string,
): StripDay[] {
  const frozen = new Set(state.freezeLog);
  return Array.from({ length: 7 }, (_, i) => {
    const key = shiftDay(today, i - 6);
    const practiced = (state.history[key] ?? 0) > 0;
    return {
      key,
      letter: weekdayLetter(key),
      status: practiced ? "done" : frozen.has(key) ? "freeze" : "quiet",
      isToday: key === today,
    };
  });
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** "September 2026", or "August to September 2026" when the four weeks straddle a month. */
export function calendarRange(today: string, days = 28): string {
  const first = shiftDay(today, -(days - 1));
  const month = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1]!;
  const year = today.slice(0, 4);
  if (first.slice(0, 7) === today.slice(0, 7)) return `${month(today)} ${year}`;
  if (first.slice(0, 4) === year) return `${month(first)} to ${month(today)} ${year}`;
  return `${month(first)} ${first.slice(0, 4)} to ${month(today)} ${year}`;
}
