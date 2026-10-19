import { resetProgressStore } from "./progress";

/**
 * Removes everything Lamppost keeps in this browser. Nothing on a server is touched. Other
 * stores still hold their copies in memory, so the caller reloads the app afterward.
 */
export function clearDeviceData() {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("lamppost-"))
    .forEach((key) => window.localStorage.removeItem(key));
  resetProgressStore();
}
