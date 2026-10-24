import { supabase } from "@/integrations/supabase/client";
import { AUTH_CALLBACK } from "./native-config";
import { isNativeApp } from "./platform";

export type OAuthProvider = "google" | "apple";

/** Held across the web's round trip to Google or Apple, which comes back to /auth without the query. */
const REDIRECT_KEY = "lamppost-auth-redirect";
/**
 * How long a held redirect is good for. A sign-in canceled at the provider leaves one behind,
 * and a later sign-in (from Profile, say) must not land on that old lesson.
 */
export const REDIRECT_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Where to go once signed in: a path on this site, or nothing. "//host" and "/\host" are read
 * by browsers as another site, and stray control characters can turn a path into one, so
 * anything that isn't plainly a local path is refused.
 */
export function safeRedirect(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f\s]/.test(value)) return null;
  return value;
}

function holdRedirect(path: string, now = Date.now()) {
  try {
    window.sessionStorage.setItem(REDIRECT_KEY, JSON.stringify({ path, at: now }));
  } catch {
    /* they land on home instead */
  }
}

/**
 * The redirect held for the provider's return, if it was held in the last ten minutes, and
 * forgotten either way. One without a time (from an older build) counts as old.
 */
export function takeHeldRedirect(now = Date.now()): string | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(REDIRECT_KEY);
    window.sessionStorage.removeItem(REDIRECT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const held = JSON.parse(raw) as { path?: unknown; at?: unknown } | null;
    if (typeof held?.at !== "number") return null;
    if (now - held.at > REDIRECT_MAX_AGE_MS || held.at > now + 60_000) return null;
    return safeRedirect(held.path);
  } catch {
    return null;
  }
}

/**
 * Starts "Continue with Google / Apple". On the web the page goes to the provider and comes
 * back to /auth, so `returnTo` is held (with the time) for the way back. In the app the provider
 * opens in the system browser (Google refuses sign-in inside an app's own web view), which
 * returns to the app through AUTH_CALLBACK; the code that comes back is exchanged by
 * `completeNativeSignIn`, and /auth never left the screen, so its own query still says where to
 * go and nothing is held (a canceled sheet leaves nothing behind). Either way the learner lands
 * on /auth, which attaches their onboarding pick to the account and moves on.
 */
export async function startOAuth(
  provider: OAuthProvider,
  returnTo: string | null = null,
): Promise<{ error: Error | null }> {
  if (!isNativeApp()) {
    const path = safeRedirect(returnTo);
    if (path) holdRedirect(path);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error && path) takeHeldRedirect();
    return { error };
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: AUTH_CALLBACK, skipBrowserRedirect: true },
  });
  if (error || !data.url) return { error: error ?? new Error("No sign-in address came back.") };
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: data.url, presentationStyle: "popover" });
  return { error: null };
}

/**
 * Finishes a sign-in the system browser handed back to the app. Returns false for any other
 * link, and for a sign-in that failed or was canceled (the learner just stays on /auth).
 */
export async function completeNativeSignIn(url: string): Promise<boolean> {
  if (!url.startsWith(AUTH_CALLBACK)) return false;
  const { Browser } = await import("@capacitor/browser");
  await Browser.close().catch(() => undefined);
  const code = new URL(url).searchParams.get("code");
  if (!code) return false;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return !error;
}
