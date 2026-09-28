import { dayKey, isDayKey, utcDay } from "./days";
import { DAY_KEY_VERSION, type ProgressState } from "./progress-core";

/**
 * One-time upgrade of progress saved by older builds, which keyed every day by
 * its UTC date. At 9:30pm US Eastern on Sep 23 that is already "2026-09-24", so
 * an evening lesson landed on tomorrow: streaks, the daily goal and the
 * four-week calendar were all off by a day for anyone west of Greenwich in the
 * evening (and east of it in the morning).
 *
 * A bare day key can't say which local day it really was, but the app also
 * stored *when* things happened (drill attempts, written scores, review and
 * challenge records). Those timestamps are used to put each UTC-keyed count back
 * on the local day it was earned. Days with no such evidence are left as they
 * are, and anything dated after the local today is folded onto today.
 */

/** Every moment, in ms, the app recorded the learner doing something. */
export function readActivityTimes(storage: Pick<Storage, "getItem">): number[] {
  const times: number[] = [];
  const read = (key: string): unknown => {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const push = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) times.push(value);
  };
  const atOf = (value: unknown) =>
    value && typeof value === "object" ? (value as { at?: unknown }).at : undefined;

  const exercises = read("lamppost-exercises-v1");
  if (exercises && typeof exercises === "object") {
    for (const attempt of Object.values(exercises)) push(atOf(attempt));
  }
  const written = read("lamppost-written-v1");
  if (Array.isArray(written)) for (const entry of written) push(atOf(entry));
  const reviews = read("lamppost-review-drills-v1");
  if (reviews && typeof reviews === "object") {
    for (const item of Object.values(reviews)) push(atOf(item));
  }
  push(atOf(read("lamppost-challenge-v1")));
  const progress = read("lamppost-progress-v1") as ProgressState | null;
  if (progress?.courses && typeof progress.courses === "object") {
    for (const course of Object.values(progress.courses)) push(course?.lastActivityAt);
  }
  return times;
}

/** Splits `total` across `weights` so the parts are whole numbers that sum to `total`. */
function allocate(total: number, weights: Map<string, number>): Map<string, number> {
  const sum = [...weights.values()].reduce((a, b) => a + b, 0);
  const parts = [...weights.entries()].map(([key, weight]) => {
    const exact = (total * weight) / sum;
    return { key, whole: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = total - parts.reduce((a, p) => a + p.whole, 0);
  for (const part of [...parts].sort((a, b) => b.rest - a.rest)) {
    if (left <= 0) break;
    part.whole += 1;
    left -= 1;
  }
  return new Map(parts.map((p) => [p.key, p.whole]));
}

export function migrateHistoryToLocalDays(
  state: ProgressState,
  activityTimes: number[],
  now = new Date(),
): ProgressState {
  if (state.dayKeyVersion >= DAY_KEY_VERSION) return state;
  const today = dayKey(now);

  // For each UTC day: how much recorded activity fell on each local day, and the latest.
  const evidence = new Map<
    string,
    { byLocal: Map<string, number>; latestLocal: string; latestAt: number }
  >();
  for (const time of activityTimes) {
    const moment = new Date(time);
    const utc = utcDay(moment);
    const local = dayKey(moment);
    const entry = evidence.get(utc) ?? { byLocal: new Map(), latestLocal: local, latestAt: 0 };
    entry.byLocal.set(local, (entry.byLocal.get(local) ?? 0) + 1);
    if (time >= entry.latestAt) {
      entry.latestAt = time;
      entry.latestLocal = local;
    }
    evidence.set(utc, entry);
  }

  const capped = (key: string) => (key > today ? today : key);
  const history: Record<string, number> = {};
  const add = (key: string, count: number) => {
    if (count > 0) history[capped(key)] = (history[capped(key)] ?? 0) + count;
  };
  for (const [key, count] of Object.entries(state.history ?? {})) {
    if (!isDayKey(key) || !(count > 0)) continue;
    const seen = evidence.get(key);
    if (!seen) {
      add(key, count);
      continue;
    }
    for (const [local, share] of allocate(count, seen.byLocal)) add(local, share);
  }

  const last = state.lastActiveDay;
  const remappedLast =
    last && isDayKey(last) ? capped(evidence.get(last)?.latestLocal ?? last) : null;
  const newestActive = Object.keys(history).sort().pop() ?? null;
  const lastActiveDay =
    remappedLast && newestActive
      ? remappedLast > newestActive
        ? remappedLast
        : newestActive
      : (remappedLast ?? newestActive);

  const freezeLog = (state.freezeLog ?? [])
    .filter((key) => isDayKey(key) && key <= today && !history[key])
    .slice(-30);

  return { ...state, history, lastActiveDay, freezeLog, dayKeyVersion: DAY_KEY_VERSION };
}
