import { useEffect, useState } from "react";
import { dayKey, daysBetween } from "./days";

/**
 * Results of the three-question checks taken before and after each unit (content in
 * `content/unit-checks.ts`). They live on this device only. A result is kept the first time a
 * check is finished and never overwritten, so the before and after stay a fair comparison.
 * Three months after the after-check, the same three questions come back once more ("later"),
 * to see what stuck.
 */

const KEY = "lamppost-unit-checks-v1";
const EVENT = "lamppost-unit-checks-change";

export type CheckPhase = "before" | "after" | "later";
/** Days from the after-check to the check that asks its questions again. */
export const LATER_CHECK_DAYS = 90;
export type CheckResult = { right: number; total: number; day: string };
export type UnitCheckResults = Partial<Record<CheckPhase, CheckResult>>;
export type CheckStore = Record<string, UnitCheckResults>;

export const isCheckPhase = (value: string): value is CheckPhase =>
  value === "before" || value === "after" || value === "later";

export function readChecks(): CheckStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" ? (parsed as CheckStore) : {};
  } catch {
    return {};
  }
}

/** Saves a finished check. Returns false, and changes nothing, if that check was already taken. */
export function recordCheck(
  unitId: string,
  phase: CheckPhase,
  right: number,
  total: number,
  day = dayKey(),
): boolean {
  if (typeof window === "undefined") return false;
  const store = readChecks();
  if (store[unitId]?.[phase]) return false;
  const next: CheckStore = {
    ...store,
    [unitId]: { ...store[unitId], [phase]: { right, total, day } },
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

export function useUnitChecks() {
  const [checks, setChecks] = useState<CheckStore>({});
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const sync = () => setChecks(readChecks());
    sync();
    setHydrated(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { checks, hydrated };
}

export type CheckAvailability = "open" | "taken" | "not-yet" | "too-late";

/**
 * Whether a check can be taken now. The before-check only means something before the unit is
 * studied, so it closes once any of its lessons is done; the after-check opens when all are, and
 * the later one 90 days after the after-check.
 */
export function checkAvailability(
  phase: CheckPhase,
  unit: { completed: number; total: number },
  results: UnitCheckResults | undefined,
  today = dayKey(),
): CheckAvailability {
  if (results?.[phase]) return "taken";
  if (phase === "before") return unit.completed === 0 ? "open" : "too-late";
  if (phase === "later") {
    const after = results?.after;
    return after && daysBetween(after.day, today) >= LATER_CHECK_DAYS ? "open" : "not-yet";
  }
  return unit.completed >= unit.total ? "open" : "not-yet";
}

/** Units whose three-months-later check is open, in the order given. */
export function laterCheckDue(store: CheckStore, unitIds: readonly string[], today = dayKey()) {
  return unitIds.filter(
    (id) => checkAvailability("later", { completed: 0, total: 0 }, store[id], today) === "open",
  );
}

/** One line for a unit's results, or null before any check is taken. */
export function checkLine(results: UnitCheckResults | undefined): string | null {
  const before = results?.before;
  const after = results?.after;
  const later = results?.later;
  const tail = later ? ` · 3 months on ${later.right} of ${later.total}` : "";
  if (before && after)
    return `Before ${before.right} of ${before.total} · after ${after.right} of ${after.total}${tail}`;
  if (before) return `Before ${before.right} of ${before.total} · after-check still to come`;
  if (after) return `After ${after.right} of ${after.total}${tail}`;
  return null;
}

/** Totals across the units checked both before and after. */
export function overallChange(store: CheckStore) {
  const paired = Object.values(store).filter((r) => r.before && r.after);
  return {
    units: paired.length,
    before: paired.reduce((n, r) => n + r.before!.right, 0),
    after: paired.reduce((n, r) => n + r.after!.right, 0),
    total: paired.reduce((n, r) => n + r.after!.total, 0),
  };
}
