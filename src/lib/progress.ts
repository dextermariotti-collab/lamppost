import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useSessionUser } from "./companion-store";
import { getMyProfile, syncProgress } from "./profile.functions";
import { dayKey, shiftDay } from "./days";
import { migrateHistoryToLocalDays, readActivityTimes } from "./progress-migrate";
import {
  DAY_KEY_VERSION,
  DEFAULT_STATE,
  applyArgument,
  applyBuyFreeze,
  applyExercise,
  applyLessonComplete,
  applyPractice,
  applyReview,
  applyUnlockLessons,
  type ProgressState,
} from "./progress-core";

export {
  DEFAULT_STATE,
  FREEZE_COST,
  LEAGUES,
  MAX_FREEZES,
  TIERS,
  deriveInsights,
  leagueFor,
  tierFor,
  type Celebration,
  type ProgressState,
  type Tier,
} from "./progress-core";
export { dayKey, shiftDay };

const KEY = "lamppost-progress-v1";
const PROGRESS_EVENT = "lamppost-progress-change";

/**
 * Loads the saved state. Progress written by older builds keyed days by their
 * UTC date; it is upgraded to local days here, once, and saved straight back.
 */
function read(): ProgressState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    const loaded: ProgressState = {
      ...DEFAULT_STATE,
      ...parsed,
      dayKeyVersion: typeof parsed.dayKeyVersion === "number" ? parsed.dayKeyVersion : 1,
    };
    if (loaded.dayKeyVersion >= DAY_KEY_VERSION) return loaded;
    const migrated = migrateHistoryToLocalDays(loaded, readActivityTimes(window.localStorage));
    try {
      window.localStorage.setItem(KEY, JSON.stringify(migrated));
    } catch {
      /* the in-memory copy is still correct */
    }
    return migrated;
  } catch {
    return DEFAULT_STATE;
  }
}

// One module-level snapshot shared by every screen, signed in or not: each hook
// instance subscribes to the same cached state instead of keeping its own copy,
// so XP, gems, lessons and the streak can never differ between screens.
let snapshot: ProgressState | null = null;

function getSnapshot(): ProgressState {
  if (!snapshot) snapshot = read();
  return snapshot;
}

function getServerSnapshot(): ProgressState {
  return DEFAULT_STATE;
}

const listeners = new Set<() => void>();

function emit() {
  snapshot = read();
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener(PROGRESS_EVENT, emit);
    window.addEventListener("storage", emit);
  }
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener(PROGRESS_EVENT, emit);
      window.removeEventListener("storage", emit);
    }
  };
}

function writeState(next: ProgressState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  snapshot = next;
  listeners.forEach((fn) => fn());
  // Also notify anything listening on the DOM event (other tabs, non-hook code).
  queueMicrotask(() => window.dispatchEvent(new Event(PROGRESS_EVENT)));
}

export function useProgress() {
  // Every screen reads the same shared snapshot, so guests and signed-in users
  // see identical XP, gems, lessons and streak on every screen.
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const { userId } = useSessionUser();
  const lastSynced = useRef("");
  const pulled = useRef<string | null>(null);

  const update = useCallback((fn: (prev: ProgressState) => ProgressState) => {
    writeState(fn(getSnapshot()));
  }, []);

  // On sign-in, pull the account's numbers down so a new device isn't blank.
  useEffect(() => {
    if (!hydrated || !userId || pulled.current === userId) return;
    pulled.current = userId;
    void getMyProfile()
      .then((profile) => {
        if (!profile) return;
        update((prev) => ({
          ...prev,
          xp: Math.max(prev.xp, profile.totalXp),
          gems: Math.max(prev.gems, profile.gems),
          streak: Math.max(prev.streak, profile.currentStreak),
          longestStreak: Math.max(prev.longestStreak, profile.longestStreak),
          lastActiveDay:
            [prev.lastActiveDay, profile.lastActiveDay].filter(Boolean).sort().pop() ?? null,
        }));
      })
      .catch(() => undefined);
  }, [hydrated, userId, update]);

  // Write-through sync: the account is the source of truth friends can see.
  useEffect(() => {
    if (!hydrated || !userId) return;
    const payload = {
      streak: state.streak,
      longestStreak: state.longestStreak,
      totalXp: state.xp,
      gems: state.gems,
      lastActiveDay: state.lastActiveDay,
      history: state.history,
      dayKeyVersion: state.dayKeyVersion,
    };
    const signature = JSON.stringify(payload);
    if (signature === lastSynced.current) return;
    lastSynced.current = signature;
    void syncProgress({ data: payload }).catch(() => undefined);
  }, [hydrated, userId, state]);

  const registerCourse = useCallback(
    (slug: string, topic: string, total: number) =>
      update((prev) =>
        prev.courses[slug]
          ? prev
          : { ...prev, courses: { ...prev.courses, [slug]: { topic, completed: 0, total } } },
      ),
    [update],
  );

  /**
   * Marks the first `count` lessons as already known — used by the optional
   * onboarding placement check. No XP, no streak: nothing was practised.
   */
  const unlockLessons = useCallback(
    (slug: string, topic: string, count: number, total: number) =>
      update((prev) => applyUnlockLessons(prev, slug, topic, count, total)),
    [update],
  );

  const completeLesson = useCallback(
    (slug: string, topic: string, index: number, total: number) =>
      update((prev) => applyLessonComplete(prev, { slug, topic, index, total }, dayKey())),
    [update],
  );

  /** A graded spaced-repetition answer: keeps the streak alive and pays out. */
  const recordReview = useCallback(
    (correct: boolean) => update((prev) => applyReview(prev, correct, dayKey())),
    [update],
  );

  const recordPractice = useCallback(
    (verdict: "solid" | "shaky" | "revisit", connectionMade: boolean) =>
      update((prev) => applyPractice(prev, verdict, connectionMade)),
    [update],
  );

  const recordExercise = useCallback(
    (score: number, bonus = 0) => update((prev) => applyExercise(prev, score, bonus)),
    [update],
  );

  const recordArgument = useCallback(
    (total: number, max: number) => update((prev) => applyArgument(prev, total, max)),
    [update],
  );

  const buyFreeze = useCallback(() => update((prev) => applyBuyFreeze(prev)), [update]);

  const clearFreezeSaved = useCallback(
    () => update((prev) => (prev.freezeSaved ? { ...prev, freezeSaved: null } : prev)),
    [update],
  );

  const clearCelebration = useCallback(
    () => update((prev) => (prev.celebration ? { ...prev, celebration: null } : prev)),
    [update],
  );

  const setDailyGoal = useCallback(
    (goal: number) => update((prev) => ({ ...prev, dailyGoal: Math.min(10, Math.max(1, goal)) })),
    [update],
  );

  return {
    state,
    hydrated,
    registerCourse,
    unlockLessons,
    completeLesson,
    recordReview,
    recordPractice,
    recordExercise,
    recordArgument,

    buyFreeze,
    clearFreezeSaved,
    clearCelebration,
    setDailyGoal,
  };
}
