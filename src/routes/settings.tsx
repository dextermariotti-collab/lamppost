import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { LegalLinksSection } from "@/components/LegalLinksSection";
import { PrivacySafetySection } from "@/components/PrivacySafetySection";
import { ScreenHeader } from "@/components/ScreenHeader";
import { DeviceDataSection, YourDataSection } from "@/components/YourDataSection";
import { Switch } from "@/components/ui/switch";
import { displayNameFor, useAccount, useRefreshAccount } from "@/lib/account";
import { updateMyProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { useProgress } from "@/lib/progress";
import { MOTIVATIONS, readIntent, saveIntent, type Motivation } from "@/lib/onboarding";
import { useTheme } from "@/lib/theme";
import { useFeedbackPrefs } from "@/lib/feedback";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Account settings — Lamppost" },
      {
        name: "description",
        content: "Edit your Lamppost name, handle, daily goal and friend nudge notifications.",
      },
      { property: "og:title", content: "Account settings — Lamppost" },
      { property: "og:description", content: "Manage your name, handle, goal and notifications." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/settings" }],
  }),
  component: SettingsScreen,
});

const GOALS = [1, 2, 3, 5, 8];

function SettingsScreen() {
  const { data: account, isLoading, signedIn, sessionReady } = useAccount();
  const refresh = useRefreshAccount();
  const navigate = useNavigate();
  const { state, setDailyGoal } = useProgress();
  const [motivation, setMotivation] = useState<Motivation | null>(null);
  useEffect(() => setMotivation(readIntent().motivation), []);
  const { theme, setTheme } = useTheme();
  const { prefs: feedback, set: setFeedback } = useFeedbackPrefs();

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!account) return;
    setName(account.displayName ?? "");
    setHandle(account.handle);
  }, [account]);

  // Guests keep full access to local preferences; only account bits need sign-in.
  void sessionReady;

  const save = async (patch: Parameters<typeof updateMyProfile>[0]["data"]) => {
    if (!signedIn) return;
    setSaving(true);
    setError(null);
    try {
      await updateMyProfile({ data: patch });
      setSaved(true);
      refresh();
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PhoneFrame>
      <ScreenHeader title="Settings" backTo="/profile" />
      <div className="px-5 pb-10">
        {isLoading && signedIn ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-sm font-bold">Appearance</h2>
              <div
                className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1"
                role="group"
                aria-label="Color theme"
              >
                <Button
                  type="button"
                  variant={theme === "light" ? "default" : "ghost"}
                  onClick={() => setTheme("light")}
                  aria-pressed={theme === "light"}
                  className="gap-2 shadow-none"
                >
                  <Sun className="h-4 w-4" /> Light
                </Button>
                <Button
                  type="button"
                  variant={theme === "dark" ? "default" : "ghost"}
                  onClick={() => setTheme("dark")}
                  aria-pressed={theme === "dark"}
                  className="gap-2 shadow-none"
                >
                  <Moon className="h-4 w-4" /> Dark
                </Button>
              </div>
            </section>

            {signedIn && (
            <section className="mt-8">
              <h2 className="text-sm font-bold">Profile</h2>
              <label
                htmlFor="settings-display-name"
                className="mt-3 block text-xs font-bold text-muted-foreground"
              >
                Display name
              </label>
              <input
                id="settings-display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={displayNameFor(account ?? null)}
                className="mt-1 w-full rounded-2xl bg-card px-4 py-3 text-sm shadow-soft outline-none ring-primary/30 focus:ring-2"
              />
              <label
                htmlFor="settings-handle"
                className="mt-3 block text-xs font-bold text-muted-foreground"
              >
                Handle
              </label>
              <div className="mt-1 flex items-center rounded-2xl bg-card px-4 shadow-soft ring-primary/30 focus-within:ring-2">
                <span className="text-sm text-muted-foreground">@</span>
                <input
                  id="settings-handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase())}
                  className="w-full bg-transparent py-3 pl-1 text-sm outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Friends find you with this handle. Email: {account?.email ?? "—"}
              </p>
              <button
                onClick={() => void save({ displayName: name, handle })}
                disabled={saving}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-hero-gradient py-3 text-sm font-bold text-primary-foreground shadow-card disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save profile
              </button>
              {error ? <p className="mt-2 text-xs text-flame">{error}</p> : null}
              {saved ? <p className="mt-2 text-xs text-success">Saved</p> : null}
            </section>
            )}

            <section className="mt-8">
              <h2 className="text-sm font-bold">Daily goal</h2>
              <div className="mt-3 flex gap-2">
                {GOALS.map((goal) => (
                  <button
                    key={goal}
                    onClick={() => {
                      setDailyGoal(goal);
                      void save({ dailyGoal: goal });
                    }}
                    className={`flex-1 rounded-2xl py-3 text-sm font-bold shadow-soft ${
                      state.dailyGoal === goal
                        ? "bg-hero-gradient text-primary-foreground"
                        : "bg-card text-foreground"
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Lessons a day. Hitting it every day for a week earns the perfect week badge.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-sm font-bold">What you're training for</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Drills use examples from the situations you care about.
              </p>
              <ul className="mt-3 space-y-2">
                {MOTIVATIONS.map((option) => (
                  <li key={option.id}>
                    <button
                      onClick={() => {
                        saveIntent({ motivation: option.id });
                        setMotivation(option.id);
                        void save({ goal: option.id });
                      }}
                      className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-bold shadow-soft ${
                        motivation === option.id
                          ? "bg-hero-gradient text-primary-foreground"
                          : "bg-card text-foreground"
                      }`}
                    >
                      {option.label}
                      <span
                        className={`mt-0.5 block text-[11px] font-semibold ${
                          motivation === option.id
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        {option.blurb}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-sm font-bold">Sound and haptics</h2>
              <ul className="mt-2">
                <li className="flex items-center gap-3 border-b border-border py-4">
                  <span className="flex-1">
                    <span className="block text-sm font-bold">Sound effects</span>
                    <span className="block text-[11px] text-muted-foreground">
                      Short tones for right, wrong and milestones.
                    </span>
                  </span>
                  <Switch
                    checked={feedback.sound}
                    onCheckedChange={(on) => setFeedback({ sound: on })}
                    aria-label="Sound effects"
                  />
                </li>
                <li className="flex items-center gap-3 border-b border-border py-4">
                  <span className="flex-1">
                    <span className="block text-sm font-bold">Haptics</span>
                    <span className="block text-[11px] text-muted-foreground">
                      A short buzz with each answer, where the device supports it.
                    </span>
                  </span>
                  <Switch
                    checked={feedback.haptics}
                    onCheckedChange={(on) => setFeedback({ haptics: on })}
                    aria-label="Haptics"
                  />
                </li>
              </ul>
            </section>

            {signedIn ? (
            <>
            <section className="mt-8">
              <h2 className="text-sm font-bold">Notifications</h2>
              <ul className="mt-2">
                <li className="flex items-center gap-3 border-b border-border py-4">
                  <span className="flex-1">
                    <span className="block text-sm font-bold">Friend nudges in the app</span>
                    <span className="block text-xs text-muted-foreground">
                      Show a reminder when a friend nudges you
                    </span>
                  </span>
                  <Switch
                    checked={account?.notifyNudgesInApp ?? true}
                    onCheckedChange={(checked) => void save({ notifyNudgesInApp: checked })}
                  />
                </li>
                <li className="flex items-center gap-3 py-4">
                  <span className="flex-1">
                    <span className="block text-sm font-bold">Friend nudges by email</span>
                    <span className="block text-xs text-muted-foreground">
                      Emails start once a sending domain is connected
                    </span>
                  </span>
                  <Switch
                    checked={account?.notifyNudgesEmail ?? true}
                    onCheckedChange={(checked) => void save({ notifyNudgesEmail: checked })}
                  />
                </li>
              </ul>
            </section>

            <PrivacySafetySection />
            <YourDataSection />
            </>
            ) : (
              <section className="mt-8 rounded-2xl border border-border p-4">
                <h2 className="text-sm font-bold">Account</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your settings are saved on this device. Sign in to sync them, manage
                  notifications, or download and delete your data.
                </p>
                <Button type="button" className="mt-3 rounded-full" onClick={() => void navigate({ to: "/auth" })}>
                  Sign in
                </Button>
              </section>
            )}
            {!signedIn && <DeviceDataSection />}
            <LegalLinksSection />
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
