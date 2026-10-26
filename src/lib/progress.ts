import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { cancelBadgeCheck, scheduleBadgeCheck, setBadgeAccount } from "./badge-award";
import { useSessionUser } from "./companion-store";
import { mayShareDeviceWith } from "./device-owner";
import { getMyProfile, syncProgress } from "./profile.functions";
import { CURRICULUM_SLUG, CURRICULUM_TITLE, LESSONS } from "./curriculum";
import { dayKey, shiftDay } from "./days";
import { migrateHistoryToLocalDays, readActivityTimes } from "./progress-migrate";
import { useToday } from "./use-today";
import { withWeeklyXp } from "./weekly-xp";
import {
  DAY_KEY_VERSION,
  DEFAULT_STATE,
  applyArgument,
  adoptLessons,
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
  loadLessons,
  mergeAccountProgress,
  readProgressState,
  saveLessons,
  studiedLessonIndexes,
  type ProgressState,
} from "./progress-core";

export {
  DEFAULT_STATE,
  gemsEarned,
  effectiveStreak,
  LEAGUES,
  MAX_FREEZES,
  REVIEW_XP,
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
/** Where a save that couldn't be read is kept, so starting fresh over it loses nothing. */
const UNREADABLE_KEY = "lamppost-progress-v1-unreadable";
const PROGRESS_EVENT = "lamppost-progress-change";
/** Today's lessons, so finished lessons saved by id map to where they sit now. */
const LESSON_ORDER = LESSONS.map((lesson) => lesson.id);
const COURSE = { slug: CURRICULUM_SLUG, topic: CURRICULUM_TITLE };

/**
 * True while the save can't be read and couldn't be copied aside either: until then nothing is
 * written over it, and this page load works from memory.
 */
let keepSave = false;

function parse(raw: string): ProgressState {
  const loaded = readProgressState(JSON.parse(raw) as unknown);
  if (loaded.dayKeyVersion >= DAY_KEY_VERSION) return loadLessons(loaded, LESSON_ORDER, COURSE);
  const migrated = migrateHistoryToLocalDays(loaded, readActivityTimes(window.localStorage));
  try {
    window.localStorage.setItem(KEY, JSON.stringify(migrated));
  } catch {
    /* the in-memory copy is still correct */
  }
  return loadLessons(migrated, LESSON_ORDER, COURSE);
}

/** Keeps the first unreadable save aside. False when it couldn't be kept (or not even read). */
function setAside(raw: string | null) {
  if (raw === null) return false;
  try {
    if (window.localStorage.getItem(UNREADABLE_KEY) === null) {
      window.localStorage.setItem(UNREADABLE_KEY, raw);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads the saved state. Progress written by older builds keyed days by their
 * UTC date; it is upgraded to local days here, once, and saved straight back.
 */
function read(): ProgressState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
    const state = raw ? parse(raw) : DEFAULT_STATE;
    keepSave = false;
    return state;
  } catch {
    keepSave = !setAside(raw);
    return snapshot ?? DEFAULT_STATE;
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

/**
 * Bumped when this device's data is cleared, so a reply to a request sent before then (an account
 * pull or a sync) can't write the old numbers back.
 */
let generation = 0;

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
    doneLessons: state.doneLessonIds ?? [],
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

function writeState(changed: ProgressState) {
  const next = saveLessons(changed, LESSON_ORDER, COURSE);
  if (!keepSave) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  snapshot = next;
  listeners.forEach((fn) => fn());
  // Also notify anything listening on the DOM event (other tabs, non-hook code).
  queueMicrotask(() => window.dispatchEvent(new Event(PROGRESS_EVENT)));
}

/**
 * Applies a change and saves it; a change that changes nothing writes nothing. XP a transition
 * earns is also counted toward the week it was earned in, unless `earned` is false (numbers
 * folded in from the account were not earned just now).
 */
function update(fn: (prev: ProgressState) => ProgressState, opts: { earned?: boolean } = {}) {
  const prev = getSnapshot();
  const next = fn(prev);
  if (next === prev) return;
  writeState(opts.earned === false ? next : withWeeklyXp(prev, next, dayKey()));
}

// One sync for the whole page, not one per mounted hook: the server credits weekly XP from a
// read and then a write, so two calls for the same change could count it twice.
let syncedSignature = "";
let syncing = false;
let syncAgainFor: string | null = null;

function requestSync(userId: string) {
  // Someone else's progress on this device never reaches this account (DeviceOwnerGuard).
  if (!mayShareDeviceWith(userId)) return;
  if (syncing) {
    syncAgainFor = userId;
    return;
  }
  const payload = syncPayload(getSnapshot());
  const signature = `${userId}:${signatureOf(payload)}`;
  if (signature === syncedSignature) return;
  syncedSignature = signature;
  syncing = true;
  const sentIn = generation;
  void syncProgress({ data: payload })
    // The account is the truth for what has been spent and granted, wherever that happened,
    // and holds the lessons finished on other devices.
    .then((account) => {
      if (sentIn !== generation) return;
      update(
        (prev) =>
          adoptLessons(
            adoptWallet(prev, { spent: account.gemsSpent, granted: account.gemsGranted }),
            account.doneLessons,
          ),
        { earned: false },
      );
      // Badges are the server's to award, from what this sync just stored.
      scheduleBadgeCheck(userId);
    })
    .catch(() => {
      if (syncedSignature === signature) syncedSignature = "";
    })
    .finally(() => {
      syncing = false;
      const again = syncAgainFor;
      syncAgainFor = null;
      if (again && sentIn === generation) requestSync(again);
    });
}

/**
 * Forgets everything held in memory and reads the device again. Called after this device's data
 * is cleared, so no screen still holding the old numbers can save them back.
 */
export function resetProgressStore() {
  generation += 1;
  cancelBadgeCheck();
  pulledAccounts.clear();
  syncedSignature = "";
  syncAgainFor = null;
  keepSave = false;
  snapshot = null;
  emit();
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
  const today = useToday();
  const { userId, ready: sessionReady } = useSessionUser();

  // On sign-in, pull the account's numbers down so a new device isn't blank.
  // Once per account per page load, not once per screen that mounts this hook.
  useEffect(() => {
    if (!hydrated || !userId || pulledAccounts.has(userId) || !mayShareDeviceWith(userId)) return;
    pulledAccounts.add(userId);
    const sentIn = generation;
    void getMyProfile()
      .then((profile) => {
        if (profile && sentIn === generation) {
          update((prev) => mergeAccountProgress(prev, profile, dayKey()), { earned: false });
        }
      })
      .catch(() => pulledAccounts.delete(userId));
  }, [hydrated, userId]);

  // Write-through sync: the account is the source of truth friends can see.
  useEffect(() => {
    if (!hydrated) return;
    // A screen that just mounted reads no user until its session check answers: not a sign-out.
    if (sessionReady) setBadgeAccount(userId);
    if (userId) requestSync(userId);
  }, [hydrated, sessionReady, userId, state]);

  const registerCourse = useCallback(
    (slug: string, topic: string, total: number) =>
      update((prev) =>
        prev.courses[slug]
          ? prev
          : { ...prev, courses: { ...prev.courses, [slug]: { topic, completed: 0, total } } },
      ),
    [],
  );

  /**
   * Marks the first `count` lessons as already known — used by the optional
   * onboarding placement check. No XP, no streak: nothing was practiced.
   */
  const unlockLessons = useCallback(
    (slug: string, topic: string, count: number, total: number) =>
      update((prev) => applyUnlockLessons(prev, slug, topic, count, total, LESSON_ORDER)),
    [],
  );

  const completeLesson = useCallback(
    (slug: string, topic: string, index: number, total: number) =>
      update((prev) =>
        applyLessonComplete(
          prev,
          {
            slug,
            topic,
            index,
            total,
            ...(LESSON_ORDER[index] ? { id: LESSON_ORDER[index] } : {}),
          },
          dayKey(),
        ),
      ),
    [],
  );

  /**
   * A graded spaced-repetition answer: keeps the streak alive and pays out. `xpScale` is the
   * share of the usual XP it pays (0.5 after the nudge).
   */
  const recordReview = useCallback(
    (correct: boolean, xpScale = 1) =>
      update((prev) => applyReview(prev, correct, dayKey(), xpScale)),
    [],
  );

  /** A finished daily case: one activity for the day, paid by how many questions were right. */
  const completeCase = useCallback(
    (right: number) => update((prev) => applyCase(prev, right, dayKey())),
    [],
  );

  const recordPractice = useCallback(
    (verdict: "solid" | "shaky" | "revisit", connectionMade: boolean) =>
      update((prev) => applyPractice(prev, verdict, connectionMade)),
    [],
  );

  const recordExercise = useCallback(
    (score: number, bonus = 0) => update((prev) => applyExercise(prev, score, bonus)),
    [],
  );

  const recordArgument = useCallback(
    (total: number, max: number) => update((prev) => applyArgument(prev, total, max)),
    [],
  );

  const clearFreezeSaved = useCallback(
    () => update((prev) => (prev.freezeSaved ? { ...prev, freezeSaved: null } : prev)),
    [],
  );

  const clearCelebration = useCallback(
    () => update((prev) => (prev.celebration ? { ...prev, celebration: null } : prev)),
    [],
  );

  const setDailyGoal = useCallback(
    (goal: number) =>
      update((prev) => {
        const dailyGoal = Math.min(10, Math.max(1, goal));
        return dailyGoal === prev.dailyGoal ? prev : { ...prev, dailyGoal };
      }),
    [],
  );

  /** The lessons finished, by 0-based index. Any lesson can be started; this is what is done. */
  const doneLessons = useMemo(() => new Set(doneLessonIndexes(state, CURRICULUM_SLUG)), [state]);

  /** The finished lessons that were studied, leaving out any only placed out of at onboarding. */
  const studiedLessons = useMemo(
    () => new Set(studiedLessonIndexes(state, CURRICULUM_SLUG, LESSON_ORDER)),
    [state],
  );

  // The one streak number every screen shows (see effectiveStreak).
  const streak = hydrated ? effectiveStreak(state, today) : 0;

  /** Lessons finished today: what the daily goal counts. Reviews and cases are not lessons. */
  const doneToday = state.lessonsByDay[today] ?? 0;

  return {
    state,
    streak,
    hydrated,
    doneLessons,
    studiedLessons,
    doneToday,
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
