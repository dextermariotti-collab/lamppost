/**
 * Each unit is a line, the way a transit map gives every route its own color. The colors are
 * theme tokens (`--line-1` .. `--line-7`, with `--on-line-n` for lettering on a filled line), so
 * they work by day and at night.
 *
 * Line colors are for lines, bullets and filled panels only. Running text stays in the
 * foreground color: several line colors are bright enough to be a line but not to be read.
 */

const LINE: Record<string, number> = {
  claims: 1,
  evidence: 2,
  fallacies: 3,
  biases: 4,
  arguments: 5,
  probability: 6,
  media: 7,
};

/** The day colors, for places CSS variables can't reach, such as a canvas. */
const FIXED = ["#c8302b", "#1f6fb2", "#a87400", "#8a5a2b", "#2e7d4f", "#bf437b", "#007c85"];
const FIXED_ON = ["#ffffff", "#ffffff", "#111418", "#ffffff", "#ffffff", "#ffffff", "#ffffff"];

export type UnitAccent = {
  /** The unit's line number, 1-7, as printed on its bullet. */
  line: number;
  /** The line color: for lines, bullets and filled panels. Never for running text. */
  color: string;
  /** Lettering on a panel filled with `color`. */
  on: string;
  /** A faint tint of the line over a card, for a background. */
  wash: string;
  /** The line color as an outline. */
  border: string;
  /** Fixed day colors for a canvas. */
  fixed: string;
  fixedOn: string;
};

export function unitAccent(unitId: string): UnitAccent {
  const line = LINE[unitId] ?? 1;
  return {
    line,
    color: `var(--line-${line})`,
    on: `var(--on-line-${line})`,
    wash: `color-mix(in oklab, var(--line-${line}) 9%, var(--card))`,
    border: `var(--line-${line})`,
    fixed: FIXED[line - 1]!,
    fixedOn: FIXED_ON[line - 1]!,
  };
}
