/**
 * Reading and showing the numbers in "work out the number" drills.
 *
 * People type numbers the way they say them: "1,000", "£1,200", "10%", "100
 * people". The learner's text is reduced to the one number in it, and text that
 * doesn't contain exactly one number is not an answer at all (it used to be read
 * as 0, which marked "about a hundred" wrong instead of asking for a number).
 */

const NUMBER = /-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|-?\.\d+/g;

/** The single number in `text`, or null if there are none or several. */
export function parseNumericAnswer(text: string): number | null {
  const found = text.match(NUMBER);
  if (!found || found.length !== 1) return null;
  const value = Number(found[0].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

const PREFIX_UNITS = new Set(["£", "$", "€"]);

/** "100 people", "10%", "£1,200": a value with its unit in the natural place. */
export function formatWithUnit(value: number, unit = ""): string {
  const shown = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  const u = unit.trim();
  if (!u) return shown;
  if (PREFIX_UNITS.has(u)) return `${u}${shown}`;
  if (u === "%") return `${shown}%`;
  return `${shown} ${u}`;
}
