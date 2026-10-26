/**
 * Reading what a device saved. A save can be from an older build, half-written, or edited by
 * hand, so stores never trust its shape: each reads it through these checks and keeps only the
 * parts of the type it expects, falling back to a default for the rest. That way one bad field
 * can't break every screen that reads the store.
 */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A finite number, or the fallback. */
export const finite = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** A string, or the fallback. */
export const text = <T extends string | null>(value: unknown, fallback: T): string | T =>
  typeof value === "string" ? value : fallback;

/** The entries of a record whose values pass the check. */
export function recordOf<T>(
  value: unknown,
  read: (entry: unknown, key: string) => T | null,
): Record<string, T> {
  if (!isRecord(value)) return {};
  const out: Record<string, T> = {};
  for (const [key, entry] of Object.entries(value)) {
    const kept = read(entry, key);
    if (kept !== null) out[key] = kept;
  }
  return out;
}

/** The items of an array that pass the check. */
export function arrayOf<T>(value: unknown, read: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const kept = read(item);
    return kept === null ? [] : [kept];
  });
}

export const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const stringOrNull = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

/** What is saved under `key`, parsed, or undefined when there is nothing there or it isn't JSON. */
export function readJson(key: string): unknown {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}
