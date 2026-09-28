import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { readDraft, syncDraftAfterSignIn, useSessionUser } from "@/lib/companion-store";
import { DEFAULT_COMPANION, companionName } from "@/lib/companions";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

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
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
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

  const google = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Google sign-in didn't complete. Try again.");
      return;
    }
  };

  return (
    <PhoneFrame showNav={false}>
      <div className="flex min-h-full flex-col px-6 pb-8">
        <div className="mt-6 flex animate-rise-in flex-col items-center text-center">
          <CompanionAvatar companion={companion} size={116} animate />
          <h1 className="mt-3 text-2xl">Save {companionName(companion)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an account and your companion, streak and progress follow you everywhere.
          </p>
        </div>

        <button
          onClick={google}
          className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-card p-4 text-sm font-extrabold shadow-soft transition-transform hover:-translate-y-0.5"
        >
          <Sparkles className="h-4 w-4 text-primary-text" /> Continue with Google
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
            className="w-full rounded-2xl bg-card p-4 text-sm font-semibold shadow-soft outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            className="w-full rounded-2xl bg-card p-4 text-sm font-semibold shadow-soft outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-hero-gradient p-4 text-sm font-extrabold text-primary-foreground shadow-card transition-transform hover:-translate-y-0.5 disabled:opacity-70"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
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
          By continuing you agree to our{" "}
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
          . Lessons are AI-generated and may be wrong.
        </p>

        <button
          onClick={() => navigate({ to: "/" })}
          className="mt-auto pt-6 text-xs font-bold text-muted-foreground"
        >
          Keep exploring without an account
        </button>
      </div>
    </PhoneFrame>
  );
}
