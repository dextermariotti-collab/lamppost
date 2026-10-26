import { LESSONS } from "./curriculum";
import { ATTEMPTS_EVENT, readAttemptStore, writeAttemptStore } from "./exercise-store";
import {
  LEARNING_STATE_VERSION,
  boundLearningState,
  learningSignature,
  mergeLearningState,
  type LearningState,
} from "./learning-state";
import { syncLearningState } from "./learning-state.functions";
import { WRITTEN_EVENT, readWritten, writeWritten } from "./mastery";
import { RATING_EVENT, readRatingStore, writeRatingStore } from "./rating";
import { REVIEW_DRILLS_EVENT, readDrillStore, writeDrillStore } from "./review-drills";

/**
 * Keeps the device's reviews and skills in step with the account (`syncLearningState`), the way
 * `requestSync` in `progress.ts` does for the numbers: one call in flight for the whole page, a
 * change made meanwhile goes after it, and an unchanged state isn't sent. What comes back is the
 * account's merged copy, merged once more with the device's (in case something changed while
 * the call was out) and saved, so every device ends up with the same reviews and skills.
 */

/** The stores whose changes start a sync. */
export const LEARNING_EVENTS = [REVIEW_DRILLS_EVENT, RATING_EVENT, ATTEMPTS_EVENT, WRITTEN_EVENT];

/** How long the stores stay quiet before a change is sent (a lesson writes several at once). */
export const LEARNING_SYNC_DELAY_MS = 2000;

const KNOWN_LESSONS: ReadonlySet<string> = new Set(LESSONS.map((lesson) => lesson.id));
const bounds = () => ({ known: KNOWN_LESSONS, now: Date.now() });

export function readLocalLearningState(): LearningState {
  return boundLearningState(
    {
      v: LEARNING_STATE_VERSION,
      reviews: readDrillStore(),
      ratings: readRatingStore(),
      attempts: readAttemptStore(),
      written: readWritten(),
    },
    bounds(),
  );
}

/**
 * Folds the account's copy into the device's and saves each part that changed. Returns the state
 * the device now holds.
 */
export function adoptLearningState(account: unknown): LearningState {
  const local = readLocalLearningState();
  const merged = boundLearningState(
    mergeLearningState(local, boundLearningState(account, bounds())),
    bounds(),
  );
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(merged.reviews, local.reviews)) writeDrillStore(merged.reviews);
  if (!same(merged.ratings, local.ratings)) writeRatingStore(merged.ratings);
  if (!same(merged.attempts, local.attempts)) writeAttemptStore(merged.attempts);
  if (!same(merged.written, local.written)) writeWritten(merged.written);
  return merged;
}

let generation = 0;
let syncedSignature = "";
let syncing = false;
let syncAgainFor: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export function requestLearningSync(userId: string) {
  if (syncing) {
    syncAgainFor = userId;
    return;
  }
  const state = readLocalLearningState();
  const signature = `${userId}:${learningSignature(state, bounds())}`;
  if (signature === syncedSignature) return;
  syncedSignature = signature;
  syncing = true;
  const sentIn = generation;
  void syncLearningState({ data: { state } })
    .then((account) => {
      if (sentIn !== generation || !account.state) return;
      const held = learningSignature(adoptLearningState(account.state), bounds());
      // What was just saved needn't be sent back; anything newer than the reply still is.
      if (held === learningSignature(boundLearningState(account.state, bounds()), bounds())) {
        syncedSignature = `${userId}:${held}`;
      }
    })
    .catch(() => {
      if (syncedSignature === signature) syncedSignature = "";
    })
    .finally(() => {
      syncing = false;
      const again = syncAgainFor;
      syncAgainFor = null;
      if (again && sentIn === generation) requestLearningSync(again);
    });
}

/** Sends the learning state once the stores have been quiet for a moment. */
export function scheduleLearningSync(userId: string) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    requestLearningSync(userId);
  }, LEARNING_SYNC_DELAY_MS);
}

/**
 * Forgets what was synced and ignores replies to calls already out. Called when this device's
 * data is cleared, so a reply can't write the old reviews back.
 */
export function resetLearningSync() {
  generation += 1;
  syncedSignature = "";
  syncAgainFor = null;
  if (timer) clearTimeout(timer);
  timer = null;
}
