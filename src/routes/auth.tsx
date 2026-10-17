import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GuideMark } from "@/components/LineBullet";
import { LegalFooter } from "@/components/LegalFooter";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { ConsentFields, UnderAgeNotice } from "@/components/ConsentFields";
import { useConsentForm } from "@/lib/use-consent-form";
import { PhoneFrame } from "@/components/PhoneFrame";
import { readDraft, syncDraftAfterSignIn, useSessionUser } from "@/lib/companion-store";
import { DEFAULT_COMPANION, companionName } from "@/lib/companions";
import { clearPendingConsent, stashPendingConsent } from "@/lib/consent";
import { supabase } from "@/integrations/supabase/client";
import { startOAuth, type OAuthProvider } from "@/lib/oauth";
import { publicUrl } from "@/lib/platform";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Lamppost" },
      {
        name: "description",
        content:
          "Create your Lamppost account to keep your companion, streak and training progress on every device.",
      },
      { property: "og:title", content: "Sign in — Lamppost" },
      { property: "og:description", content: "Keep your companion and streak across devices." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/auth" }],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const navigate = useNavigate();
  const { userId, ready } = useSessionUser();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const companion = readDraft() ?? DEFAULT_COMPANION;
  const consent = useConsentForm();
  const signingUp = mode === "signup";
  /** Signing up needs an age and the agreement first; signing in to an existing account doesn't. */
  const blockedFromSignup = signingUp && !consent.ready;

  // Once a session exists, attach the onboarding pick to the account.
  useEffect(() => {
    if (!ready || !userId) return;
    void syncDraftAfterSignIn(userId)
      .catch(() => undefined)
      .then(() => navigate({ to: "/", replace: true }));
  }, [ready, userId, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "signup") {
        if (!consent.claim) return;
        // Remembered until there is a session to record it against (email confirmation
        // or a redirect in between); ConsentGate records it, or asks again if it's gone.
        stashPendingConsent(consent.claim);
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          // The confirmation link opens a browser, so it returns to the website, never the app.
          options: { emailRedirectTo: publicUrl() },
        });
        if (err) {
          clearPendingConsent();
          throw err;
        }
        if (!data.session) {
          setMessage("Check your inbox to confirm your email, then come back and sign in.");
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: OAuthProvider) => {
    setError(null);
    if (signingUp) {
      if (!consent.claim) return;
      stashPendingConsent(consent.claim);
    }
    const { error: err } = await startOAuth(provider);
    if (err) {
      clearPendingConsent();
      setError(`${provider === "apple" ? "Apple" : "Google"} sign-in didn't complete. Try again.`);
    }
  };

  if (signingUp && consent.blocked) {
    return (
      <PhoneFrame showNav={false}>
        <div className="flex min-h-full flex-col px-6 pb-8">
          <div className="mt-10">
            <UnderAgeNotice />
          </div>
          <button
            type="button"
            onClick={() => setMode("signin")}
            className="mt-6 min-h-11 text-xs font-bold text-primary-text"
          >
            I already have an account
          </button>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame showNav={false}>
      <div className="flex min-h-full flex-col px-6 pb-8">
        <div className="mt-6 flex animate-rise-in flex-col items-center text-center">
          <GuideMark size={72} />
          <h1 className="mt-3 text-2xl">Save {companionName(companion)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an account and your companion, streak and progress follow you everywhere.
          </p>
        </div>

        {signingUp && (
          <section
            aria-label="Before you start"
            className="mt-6 rounded-3xl bg-card/60 p-4 shadow-soft"
          >
            <ConsentFields form={consent} />
          </section>
        )}

        <button
          type="button"
          onClick={() => void oauth("apple")}
          disabled={blockedFromSignup}
          aria-describedby={blockedFromSignup ? "signup-needs" : undefined}
          className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-foreground p-4 text-sm font-extrabold text-background shadow-soft transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-60"
        >
          <AppleLogo /> Continue with Apple
        </button>
        <button
          type="button"
          onClick={() => void oauth("google")}
          disabled={blockedFromSignup}
          aria-describedby={blockedFromSignup ? "signup-needs" : undefined}
          className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-card p-4 text-sm font-extrabold shadow-soft transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-60"
        >
          <Sparkles aria-hidden className="h-4 w-4 text-primary-text" /> Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-[11px] font-bold text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            aria-label="Email"
            autoComplete="email"
            className="min-h-12 w-full rounded-2xl bg-card p-4 text-sm font-semibold shadow-soft outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            autoComplete={signingUp ? "new-password" : "current-password"}
            className="min-h-12 w-full rounded-2xl bg-card p-4 text-sm font-semibold shadow-soft outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
          />
          <button
            type="submit"
            disabled={busy || blockedFromSignup}
            aria-describedby={blockedFromSignup ? "signup-needs" : undefined}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-hero-gradient p-4 text-sm font-extrabold text-primary-foreground shadow-card transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Mail aria-hidden className="h-4 w-4" />
            )}
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
          {blockedFromSignup && (
            <p
              id="signup-needs"
              className="text-center text-xs font-semibold text-muted-foreground"
            >
              {consent.band === null
                ? "Enter your date of birth and check the box above to continue."
                : "Tick the boxes above to continue."}
            </p>
          )}
        </form>

        {error && (
          <p className="mt-3 rounded-2xl bg-flame/10 p-3 text-xs font-bold text-flame">{error}</p>
        )}
        {message && (
          <p className="mt-3 rounded-2xl bg-success/10 p-3 text-xs font-bold text-success">
            {message}
          </p>
        )}

        <button
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="mt-4 text-xs font-bold text-primary-text"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>

        <p className="mt-4 text-[11px] leading-relaxed font-semibold text-muted-foreground">
          {signingUp ? "" : "By signing in you agree to our "}
          {signingUp ? "Read the " : ""}
          <Link to="/legal/terms" className="font-extrabold text-primary-text underline">
            Terms
          </Link>
          ,{" "}
          <Link to="/legal/privacy" className="font-extrabold text-primary-text underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/legal/ai-content" className="font-extrabold text-primary-text underline">
            AI content notice
          </Link>
          . AI-written replies can be wrong.
        </p>

        <button
          onClick={() => navigate({ to: "/" })}
          className="mt-auto pt-6 text-xs font-bold text-muted-foreground"
        >
          Keep exploring without an account
        </button>
      </div>
      <LegalFooter />
    </PhoneFrame>
  );
}

/** Apple's logo, as its sign-in button guidelines ask for. */
function AppleLogo() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
      <path d="M11.18 8.47c-.02-1.67 1.37-2.48 1.43-2.52-.78-1.14-1.99-1.3-2.42-1.31-1.03-.1-2.01.6-2.53.6-.52 0-1.32-.59-2.17-.57-1.12.02-2.15.65-2.73 1.65-1.16 2.02-.3 5 .84 6.64.55.8 1.21 1.7 2.08 1.67.83-.03 1.15-.54 2.16-.54 1 0 1.29.54 2.17.52.9-.01 1.47-.82 2.02-1.62.63-.93.89-1.83.91-1.88-.02-.01-1.75-.67-1.76-2.66zM9.53 3.56c.46-.56.77-1.33.68-2.1-.66.03-1.46.44-1.93 1-.43.49-.8 1.28-.7 2.03.73.06 1.48-.37 1.95-.93z" />
    </svg>
  );
}
