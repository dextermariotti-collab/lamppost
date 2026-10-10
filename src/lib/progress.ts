import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useSessionUser } from "./companion-store";
import { getMyProfile, syncProgress } from "./profile.functions";
import { CURRICULUM_SLUG } from "./curriculum";
import { dayKey, shiftDay } from "./days";
import { migrateHistoryToLocalDays, readActivityTimes } from "./progress-migrate";
import { withWeeklyXp } from "./weekly-xp";
import {
  DAY_KEY_VERSION,
  DEFAULT_STATE,
  applyArgument,
  adoptWallet,
  applyExercise,
  applyLessonComplete,
  applyPractice,
  applyReview,
  applyCase,
  applyUnlockLessons,
  doneLessonIndexes,
  effectiveStreak,
  gemsEarned,
  mergeAccountProgress,
  type ProgressState,
} from "./progress-core";

export {
  DEFAULT_STATE,
  gemsEarned,
  effectiveStreak,
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

/** Accounts whose numbers were already folded in this page load (one pull, not one per screen). */
const pulledAccounts = new Set<string>();

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

/**
 * What a sync tells the account about this device. Gems are lifetime earnings;
 * spending and grants are the account's own. `carryOver` is read only on the
 * account's very first sync (what was spent and unlocked before it existed).
 */
function syncPayload(state: ProgressState) {
  return {
    totalXp: state.xp,
    gemsEarned: gemsEarned(state),
    history: state.history,
    freezeLog: state.freezeLog,
    today: dayKey(),
    dayKeyVersion: state.dayKeyVersion,
    carryOver: {
      gemsSpent: state.gemsSpent,
      hintTokens: state.hintTokens,
      cosmetics: state.cosmetics,
    },
  };
}

/** Whether a sync would say anything new: `carryOver` is one-time and doesn't count. */
const signatureOf = (payload: ReturnType<typeof syncPayload>) =>
  JSON.stringify({ ...payload, carryOver: undefined });

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

  /**
   * Applies a change and saves it. XP a transition earns is also counted towards
   * the week it was earned in, unless `earned` is false (numbers folded in from the
   * account were not earned just now).
   */
  const update = useCallback(
    (fn: (prev: ProgressState) => ProgressState, opts: { earned?: boolean } = {}) => {
      const prev = getSnapshot();
      const next = fn(prev);
      writeState(opts.earned === false ? next : withWeeklyXp(prev, next, dayKey()));
    },
    [],
  );

  // On sign-in, pull the account's numbers down so a new device isn't blank.
  // Once per account per page load, not once per screen that mounts this hook.
  useEffect(() => {
    if (!hydrated || !userId || pulledAccounts.has(userId)) return;
    pulledAccounts.add(userId);
    void getMyProfile()
      .then((profile) => {
        if (profile) {
          update((prev) => mergeAccountProgress(prev, profile, dayKey()), { earned: false });
        }
      })
      .catch(() => pulledAccounts.delete(userId));
  }, [hydrated, userId, update]);

  // Write-through sync: the account is the source of truth friends can see.
  useEffect(() => {
    if (!hydrated || !userId) return;
    const payload = syncPayload(state);
    const signature = signatureOf(payload);
    if (signature === lastSynced.current) return;
    lastSynced.current = signature;
    void syncProgress({ data: payload })
      // The account is the truth for what has been spent and granted, wherever that happened.
      .then((account) =>
        update(
          (prev) => adoptWallet(prev, { spent: account.gemsSpent, granted: account.gemsGranted }),
          {
            earned: false,
          },
        ),
      )
      .catch(() => undefined);
  }, [hydrated, userId, state, update]);

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

  /** A finished daily case: one activity for the day, paid by how many questions were right. */
  const completeCase = useCallback(
    (right: number) => update((prev) => applyCase(prev, right, dayKey())),
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

  /** The lessons finished, by 0-based index. Any lesson can be started; this is what is done. */
  const doneLessons = useMemo(() => new Set(doneLessonIndexes(state, CURRICULUM_SLUG)), [state]);

  // The one streak number every screen shows (see effectiveStreak).
  const streak = hydrated ? effectiveStreak(state, dayKey()) : 0;

  return {
    state,
    streak,
    hydrated,
    doneLessons,
    registerCourse,
    unlockLessons,
    completeLesson,
    recordReview,
    completeCase,
    recordPractice,
    recordExercise,
    recordArgument,

    clearFreezeSaved,
    clearCelebration,
    setDailyGoal,
  };
}
