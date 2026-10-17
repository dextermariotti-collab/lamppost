import { supabase } from "@/integrations/supabase/client";
import { AUTH_CALLBACK } from "./native-config";
import { isNativeApp } from "./platform";

export type OAuthProvider = "google" | "apple";

/**
 * Starts "Continue with Google / Apple". On the web the page goes to the provider and comes
 * back to /auth. In the app the provider opens in the system browser (Google refuses sign-in
 * inside an app's own web view), which returns to the app through AUTH_CALLBACK; the code that
 * comes back is exchanged by `completeNativeSignIn`. Either way the learner lands on /auth,
 * which attaches their onboarding pick to the account and goes home.
 */
export async function startOAuth(provider: OAuthProvider): Promise<{ error: Error | null }> {
  if (!isNativeApp()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth` },
    });
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
