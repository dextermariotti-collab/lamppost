/**
 * Per-unit accent hues. Every one is a hue rotation of the brand purple at the
 * same lightness and chroma, so the seven units read as one family rather than
 * seven unrelated colours.
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
  /** Strong accent, for text and filled surfaces. */
  color: string;
  /** Faint wash, for card backgrounds. */
  wash: string;
  /** Hairline border tint. */
  border: string;
};

export function unitAccent(unitId: string): UnitAccent {
  const hue = HUES[unitId] ?? 292;
  return {
    color: `oklch(0.68 0.14 ${hue})`,
    wash: `oklch(0.68 0.14 ${hue} / 0.12)`,
    border: `oklch(0.68 0.14 ${hue} / 0.32)`,
  };
}
