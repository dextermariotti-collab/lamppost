/**
 * Compares two secrets without stopping at the first difference, so response
 * time doesn't reveal how much of a guessed token was right. (Length is not
 * secret here: tokens are fixed-format.)
 */
export function secretsMatch(given: string | null | undefined, expected: string): boolean {
  if (typeof given !== "string" || expected.length === 0) return false;
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
