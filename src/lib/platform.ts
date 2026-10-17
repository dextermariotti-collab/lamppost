import { Capacitor } from "@capacitor/core";

/**
 * What differs between the web app and the iOS/Android apps. The phone apps are the same screens
 * built with `--mode app` and bundled inside the app (docs/mobile.md), so three things change:
 * where server functions run, which address links point at, and a few native behaviors
 * (sign-in, the back button, the status bar, sharing a file).
 */

/** True inside the iOS or Android app. */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

/** True on the iOS app (for things only Apple asks for). */
export const isIosApp = (): boolean => Capacitor.getPlatform() === "ios";

/** The deployed backend the app build calls; empty on the web, which calls its own origin. */
const API_URL =
  import.meta.env.MODE === "app" ? (import.meta.env["VITE_API_URL"] ?? "").replace(/\/$/, "") : "";

/**
 * `fetch` for server functions. Their URLs are relative (`/_serverFn/…`), which in the app would
 * mean the app's own bundle, so the app build sends them to the backend instead.
 */
export const apiFetch: typeof fetch = (input, init) =>
  fetch(
    API_URL && typeof input === "string" && input.startsWith("/") ? `${API_URL}${input}` : input,
    init,
  );

/**
 * The web address for links that leave the device: invites people share, and the page a sign-up
 * email returns to. In the app the page's own origin is local to the phone, so it is the
 * deployed site (VITE_PUBLIC_URL, falling back to the backend's address).
 */
export function publicUrl(): string {
  if (import.meta.env.MODE !== "app" && typeof window !== "undefined")
    return window.location.origin;
  const configured = (import.meta.env["VITE_PUBLIC_URL"] ?? "").replace(/\/$/, "");
  return configured || API_URL;
}
