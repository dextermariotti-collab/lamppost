/** Removes everything Lamppost keeps in this browser. Nothing on a server is touched. */
export function clearDeviceData() {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("lamppost-"))
    .forEach((key) => window.localStorage.removeItem(key));
}
