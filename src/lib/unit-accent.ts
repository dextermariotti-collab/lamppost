/**
 * Per-unit accent hues. Every one is a hue rotation of the brand purple at the
 * same lightness and chroma, so the seven units read as one family rather than
 * seven unrelated colours.
 *
 * Lightness comes from the `--unit-accent-l` theme token: dark enough to be
 * readable text (and to carry a light button label) on light pages, light enough
 * on dark ones.
 */

const HUES: Record<string, number> = {
  claims: 292,
  evidence: 250,
  fallacies: 20,
  biases: 320,
  arguments: 200,
  probability: 150,
  media: 60,
};

export type UnitAccent = {
  /** Strong accent, for text and filled surfaces. Theme-aware CSS colour. */
  color: string;
  /** Faint wash, for card backgrounds. */
  wash: string;
  /** Hairline border tint. */
  border: string;
  /** A fixed colour for places CSS variables can't reach, such as a canvas. */
  fixed: string;
};

export function unitAccent(unitId: string): UnitAccent {
  const hue = HUES[unitId] ?? 292;
  const base = `oklch(var(--unit-accent-l) 0.15 ${hue}`;
  return {
    color: `${base})`,
    wash: `${base} / 0.12)`,
    border: `${base} / 0.32)`,
    fixed: `oklch(0.68 0.14 ${hue})`,
  };
}
