import { ADULT_AGE, MIN_ACCOUNT_AGE } from "./legal-config";

/**
 * The signup age check. It takes what the person typed, decides which of four things
 * happens, and keeps nothing: the date is used once and only the resulting age band is
 * ever stored (and only for people who are old enough to have an account).
 */

export type BirthInput = { year: string; month: string; day: string };

export type AgeDecision =
  /** A field is still empty or the year is still being typed. */
  | { kind: "incomplete" }
  /** All filled in, but not a real date (30 February, next year, 1850). */
  | { kind: "invalid" }
  /** Too young for an account. Nothing is stored. */
  | { kind: "blocked" }
  /** Old enough with a parent or guardian's permission. */
  | { kind: "teen" }
  | { kind: "adult" };

export type AgeBand = "13-17" | "18+";

const MIN_YEAR = 1900;

const whole = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN);

/** Whole years between a birth date and `today` (the birthday counts on the day itself). */
export function ageOn(year: number, month: number, day: number, today: Date): number {
  let age = today.getFullYear() - year;
  const notYet =
    today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  if (notYet) age -= 1;
  return age;
}

export function decideAge(input: BirthInput, today: Date = new Date()): AgeDecision {
  const { year, month, day } = input;
  if (!year.trim() || !month.trim() || !day.trim() || year.trim().length < 4) {
    return { kind: "incomplete" };
  }
  const y = whole(year);
  const m = whole(month);
  const d = whole(day);
  if (![y, m, d].every(Number.isInteger)) return { kind: "invalid" };
  if (y < MIN_YEAR || m < 1 || m > 12 || d < 1) return { kind: "invalid" };

  // A real calendar date: round-trip through Date so 31 April and 29 February in a
  // non-leap year are refused.
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return { kind: "invalid" };
  }
  const age = ageOn(y, m, d, today);
  if (age < 0) return { kind: "invalid" };
  if (age > 120) return { kind: "invalid" };

  if (age < MIN_ACCOUNT_AGE) return { kind: "blocked" };
  if (age < ADULT_AGE) return { kind: "teen" };
  return { kind: "adult" };
}

export const ageBandFor = (decision: AgeDecision): AgeBand | null =>
  decision.kind === "teen" ? "13-17" : decision.kind === "adult" ? "18+" : null;
