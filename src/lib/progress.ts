import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useSessionUser } from "./companion-store";
import { getMyProfile, syncProgress } from "./profile.functions";
import { buyStreakFreeze } from "./wallet.functions";
import { dayKey, shiftDay } from "./days";
import { migrateHistoryToLocalDays, readActivityTimes } from "./progress-migrate";
import {
  DAY_KEY_VERSION,
  DEFAULT_STATE,
  applyArgument,
  adoptWallet,
  applyBuyFreeze,
  applyExercise,
  applyLessonComplete,
  applyPractice,
  applyReview,
  applyServerPurchase,
  applyUnlockLessons,
  canBuyFreeze,
  effectiveStreak,
  gemsEarned,
  mergeAccountProgress,
  type ProgressState,
} from "./progress-core";

export {
  DEFAULT_STATE,
  FREEZE_COST,
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

/** What a sync tells the account about this device. Gems are lifetime earnings; spending is the server's. */
function syncPayload(state: ProgressState) {
  return {
    totalXp: state.xp,
    gemsEarned: gemsEarned(state),
    history: state.history,
    freezeLog: state.freezeLog,
    today: dayKey(),
    dayKeyVersion: state.dayKeyVersion,
  };
}

/** How a freeze purchase ended, in words the card can show. */
export type BuyFreezeOutcome = { ok: true } | { ok: false; message: string };

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

  const update = useCallback((fn: (prev: ProgressState) => ProgressState) => {
    writeState(fn(getSnapshot()));
  }, []);

  // On sign-in, pull the account's numbers down so a new device isn't blank.
  // Once per account per page load, not once per screen that mounts this hook.
  useEffect(() => {
    if (!hydrated || !userId || pulledAccounts.has(userId)) return;
    pulledAccounts.add(userId);
    void getMyProfile()
      .then((profile) => {
        if (profile) update((prev) => mergeAccountProgress(prev, profile, dayKey()));
      })
      .catch(() => pulledAccounts.delete(userId));
  }, [hydrated, userId, update]);

  // Write-through sync: the account is the source of truth friends can see.
  useEffect(() => {
    if (!hydrated || !userId) return;
    const payload = syncPayload(state);
    const signature = JSON.stringify(payload);
    if (signature === lastSynced.current) return;
    lastSynced.current = signature;
    void syncProgress({ data: payload })
      // The account is the truth for what has been spent, wherever it was spent.
      .then((account) => update((prev) => adoptWallet(prev, { spent: account.gemsSpent })))
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

  const buying = useRef(false);

  /**
   * Signed out, gems only exist on this device, so the purchase happens here. Signed
   * in, the account owns the gems: it is brought up to date with what was just
   * earned, then the server spends them in one atomic step, and the freeze is held
   * only once it says yes.
   */
  const buyFreeze = useCallback(async (): Promise<BuyFreezeOutcome> => {
    if (buying.current) return { ok: false, message: "One moment — that's still going through." };
    if (!canBuyFreeze(getSnapshot())) {
      return { ok: false, message: "You can't get a freeze right now." };
    }
    if (!userId) {
      update((prev) => applyBuyFreeze(prev));
      return { ok: true };
    }

    buying.current = true;
    try {
      const payload = syncPayload(getSnapshot());
      const account = await syncProgress({ data: payload });
      lastSynced.current = JSON.stringify(payload);
      update((prev) => adoptWallet(prev, { spent: account.gemsSpent }));
      if (!canBuyFreeze(getSnapshot())) {
        return { ok: false, message: "You don't have enough gems for that yet." };
      }

      const result = await buyStreakFreeze();
      if (result.ok) {
        update((prev) => applyServerPurchase(prev, { spent: result.spent }));
        return { ok: true };
      }
      if ("spent" in result) update((prev) => adoptWallet(prev, { spent: result.spent }));
      return { ok: false, message: "message" in result ? result.message : result.reason };
    } catch {
      return { ok: false, message: "That couldn't go through just now. Your gems were not spent." };
    } finally {
      buying.current = false;
    }
  }, [update, userId]);

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

  // The one streak number every screen shows (see effectiveStreak).
  const streak = hydrated ? effectiveStreak(state, dayKey()) : 0;

  return {
    state,
    streak,
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
