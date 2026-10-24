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
}

function clearPrefixed(storage: Storage) {
  Object.keys(storage)
    .filter((key) => key.startsWith("lamppost-"))
    .forEach((key) => storage.removeItem(key));
}
