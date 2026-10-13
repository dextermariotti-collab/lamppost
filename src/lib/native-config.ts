/**
 * The app's bundle identifier on both stores, as in capacitor.config.ts (a test keeps the two
 * the same). It is also the URL scheme sign-in returns through: the system browser hands
 * `com.lamppost.app://auth-callback?code=…` back to the app, so the iOS Info.plist and the
 * Android manifest register it, and Supabase must list AUTH_CALLBACK as a redirect URL.
 */
export const APP_ID = "com.lamppost.app";
export const AUTH_CALLBACK = `${APP_ID}://auth-callback`;
