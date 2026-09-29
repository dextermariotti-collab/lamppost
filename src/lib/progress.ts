import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useSessionUser } from "./companion-store";
import { getMyProfile, syncProgress } from "./profile.functions";
import { buyStreakFreeze } from "./wallet.functions";
import {
  buyHintToken,
  getRewards,
  openChest as openChestOnAccount,
  spendHintToken,
  unlockCosmetic as unlockCosmeticOnAccount,
} from "./rewards.functions";
import { rollChest, type ChestRecord, type ChestSource } from "./rewards";
import {
  adoptRewards,
  applyBuyHint,
  applyOpenChest,
  applyUnlockCosmetic,
  applyUseHint,
  canBuyHint,
  canUnlockCosmetic,
  chestsLeft,
  withWeeklyXp,
  type RewardsSnapshot,
} from "./rewards-state";
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
  gemsEarned,
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

/** How a purchase ended, in words the card can show. */
export type PurchaseOutcome = { ok: true } | { ok: false; message: string };
export type BuyFreezeOutcome = PurchaseOutcome;
/** How opening a chest ended: what came out, or why nothing did. */
export type ChestOutcome = { ok: true; record: ChestRecord } | { ok: false; message: string };

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
        // Hint tokens, cosmetics and today's chests live on the account too.
        return getRewards({ data: { today: dayKey() } });
      })
      .then((rewards) => update((prev) => adoptRewards(prev, rewards), { earned: false }))
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

  const busy = useRef(false);

  /**
   * Signed in, the account owns the gems, so anything that spends or grants them is
   * done by the server in one atomic step. First the account is brought up to date
   * with what was just earned and done (a chest is for something done today, and
   * a purchase can only use gems the account knows about); then `act` runs; and
   * nothing changes on the device until the server has answered.
   */
  const withAccount = useCallback(
    async <T>(act: () => Promise<T>): Promise<T> => {
      const payload = syncPayload(getSnapshot());
      const account = await syncProgress({ data: payload });
      lastSynced.current = signatureOf(payload);
      update(
        (prev) => adoptWallet(prev, { spent: account.gemsSpent, granted: account.gemsGranted }),
        {
          earned: false,
        },
      );
      return await act();
    },
    [update],
  );

  /** Runs one purchase or opening at a time, so a second tap can't repeat the first. */
  const exclusive = useCallback(
    async <T extends { ok: boolean }>(
      act: () => Promise<T>,
      failure: (message: string) => T,
    ): Promise<T> => {
      if (busy.current) return failure("One moment — that's still going through.");
      busy.current = true;
      try {
        return await act();
      } catch {
        return failure("That couldn't go through just now. Your gems were not spent.");
      } finally {
        busy.current = false;
      }
    },
    [],
  );

  const adoptSnapshot = useCallback(
    (snapshot: RewardsSnapshot | null) => {
      if (snapshot) update((prev) => adoptRewards(prev, snapshot), { earned: false });
    },
    [update],
  );

  const fail = (message: string) => ({ ok: false as const, message });

  /** Buys a streak freeze: on this device signed out, on the account signed in. */
  const buyFreeze = useCallback(
    (): Promise<PurchaseOutcome> =>
      exclusive<PurchaseOutcome>(async () => {
        if (!canBuyFreeze(getSnapshot())) return fail("You can't get a freeze right now.");
        if (!userId) {
          update((prev) => applyBuyFreeze(prev));
          return { ok: true };
        }
        return await withAccount<PurchaseOutcome>(async () => {
          if (!canBuyFreeze(getSnapshot())) return fail("You don't have enough gems for that yet.");
          const result = await buyStreakFreeze();
          if (result.ok) {
            update((prev) =>
              applyServerPurchase(prev, { spent: result.spent, granted: result.granted }),
            );
            return { ok: true };
          }
          if ("spent" in result) {
            update((prev) => adoptWallet(prev, { spent: result.spent, granted: result.granted }));
          }
          return fail("message" in result ? result.message : result.reason);
        });
      }, fail),
    [exclusive, update, userId, withAccount],
  );

  /** Opens a reward chest: one for each lesson, review or challenge done today, three at most. */
  const openChest = useCallback(
    (source: ChestSource): Promise<ChestOutcome> =>
      exclusive<ChestOutcome>(async () => {
        const day = dayKey();
        if (chestsLeft(getSnapshot(), day) <= 0) return fail("There's no chest to open right now.");
        if (!userId) {
          let record: ChestRecord | null = null;
          update((prev) => {
            const opened = applyOpenChest(prev, { day, source, prize: rollChest() });
            record = opened?.record ?? null;
            return opened?.state ?? prev;
          });
          return record ? { ok: true, record } : fail("There's no chest to open right now.");
        }
        return await withAccount<ChestOutcome>(async () => {
          const result = await openChestOnAccount({ data: { today: day, source } });
          if (result.ok) {
            adoptSnapshot(result.snapshot);
            return { ok: true, record: result.record };
          }
          return fail("message" in result ? result.message : result.reason);
        });
      }, fail),
    [adoptSnapshot, exclusive, update, userId, withAccount],
  );

  /** Buys a hint token with gems. */
  const buyHint = useCallback(
    (): Promise<PurchaseOutcome> =>
      exclusive<PurchaseOutcome>(async () => {
        if (!canBuyHint(getSnapshot())) return fail("You can't get a hint token right now.");
        if (!userId) {
          update((prev) => applyBuyHint(prev));
          return { ok: true };
        }
        return await withAccount<PurchaseOutcome>(async () => {
          const result = await buyHintToken({ data: { today: dayKey() } });
          if ("snapshot" in result) adoptSnapshot(result.snapshot);
          return result.ok
            ? { ok: true }
            : fail("message" in result ? result.message : result.reason);
        });
      }, fail),
    [adoptSnapshot, exclusive, update, userId, withAccount],
  );

  /** Unlocks a companion cosmetic with gems. */
  const unlockCosmetic = useCallback(
    (id: string): Promise<PurchaseOutcome> =>
      exclusive<PurchaseOutcome>(async () => {
        if (!canUnlockCosmetic(getSnapshot(), id)) return fail("You can't unlock that right now.");
        if (!userId) {
          update((prev) => applyUnlockCosmetic(prev, id));
          return { ok: true };
        }
        return await withAccount<PurchaseOutcome>(async () => {
          const result = await unlockCosmeticOnAccount({ data: { today: dayKey(), id } });
          if ("snapshot" in result) adoptSnapshot(result.snapshot);
          return result.ok
            ? { ok: true }
            : fail("message" in result ? result.message : result.reason);
        });
      }, fail),
    [adoptSnapshot, exclusive, update, userId, withAccount],
  );

  /**
   * Spends a hint token. Signed in, the account says whether there was one; the
   * hint is shown only if it did. Returns whether a token was used.
   */
  const spendHint = useCallback(async (): Promise<boolean> => {
    if (getSnapshot().hintTokens <= 0) return false;
    if (!userId) {
      update((prev) => applyUseHint(prev));
      return true;
    }
    try {
      const result = await spendHintToken();
      update((prev) => ({ ...prev, hintTokens: result.hintTokens }), { earned: false });
      return result.ok;
    } catch {
      return false;
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
    openChest,
    buyHint,
    unlockCosmetic,
    spendHint,
    clearFreezeSaved,
    clearCelebration,
    setDailyGoal,
  };
}
