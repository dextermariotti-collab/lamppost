import { resetLearningSync } from "./learning-sync";
import { resetProgressStore } from "./progress";

/**
 * Removes everything Lamppost keeps in this browser. Nothing on a server is touched. Other
 * stores still hold their copies in memory, so the caller reloads the app afterward.
 */
export function clearDeviceData() {
  clearPrefixed(window.localStorage);
  // A sign-in or lesson held for a round trip is this tab's only, but still this person's.
  try {
    clearPrefixed(window.sessionStorage);
  } catch {
    /* storage blocked: nothing can be held there either */
  }
  resetProgressStore();
  resetLearningSync();
}

function clearPrefixed(storage: Storage) {
  Object.keys(storage)
    .filter((key) => key.startsWith("lamppost-"))
    .forEach((key) => storage.removeItem(key));
}

/** Stores nothing reads any more: the retired AI lesson pipeline's downloaded lessons. */
const RETIRED_KEYS = ["lamppost-courses-v1"];

/** Frees the space retired stores still take on devices that used them. */
export function forgetRetiredData() {
  try {
    for (const key of RETIRED_KEYS) window.localStorage.removeItem(key);
  } catch {
    /* storage blocked: nothing to free */
  }
}
