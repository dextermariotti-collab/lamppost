import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { PrivacySafetySection } from "@/components/PrivacySafetySection";
import { FocusSheet, SegmentedRow, SettingsGroup, SettingsRow } from "@/components/SettingsParts";
import { ScreenHeader } from "@/components/ScreenHeader";
import { DeviceDataSection, YourDataSection } from "@/components/YourDataSection";
import { Switch } from "@/components/ui/switch";
import { displayNameFor, useAccount, useRefreshAccount } from "@/lib/account";
import { AI_PROVIDER_NAME, useAiConsentAgreedAt, withdrawAiConsent } from "@/lib/ai-consent";
import { updateMyProfile } from "@/lib/profile.functions";
import { useProgress } from "@/lib/progress";
import {
  GOAL_OPTIONS,
  MOTIVATIONS,
  readIntent,
  saveIntent,
  type Motivation,
} from "@/lib/onboarding";
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

function SettingsScreen() {
  const { data: account, isLoading, signedIn, sessionReady } = useAccount();
  const refresh = useRefreshAccount();
  const { state, setDailyGoal } = useProgress();
  // The goals onboarding offers, plus one set before they changed, so it still shows as chosen.
  const goals = [...new Set([...GOAL_OPTIONS, state.dailyGoal])].sort((a, b) => a - b);
  const [motivation, setMotivation] = useState<Motivation | null>(null);
  const [focusOpen, setFocusOpen] = useState(false);
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
            <SettingsGroup label="Practice">
              <SegmentedRow
                label="Daily goal"
                sub="Lessons a day. Reviews and the daily case keep your streak going but don't count toward it."
                options={goals.map((goal) => ({ value: goal, label: String(goal) }))}
                value={state.dailyGoal}
                onChange={(goal) => {
                  setDailyGoal(goal);
                  void save({ dailyGoal: goal });
                }}
              />
              <SettingsRow
                title="Training focus"
                value={MOTIVATIONS.find((option) => option.id === motivation)?.label ?? "Not set"}
                onClick={() => setFocusOpen(true)}
              />
            </SettingsGroup>

            <SettingsGroup label="Comfort">
              <SegmentedRow
                label="Appearance"
                options={[
                  {
                    value: "light",
                    label: (
                      <>
                        <Sun aria-hidden className="h-4 w-4" /> Light
                      </>
                    ),
                    name: "Light",
                  },
                  {
                    value: "dark",
                    label: (
                      <>
                        <Moon aria-hidden className="h-4 w-4" /> Dark
                      </>
                    ),
                    name: "Dark",
                  },
                ]}
                value={theme}
                onChange={setTheme}
              />
              <SettingsRow
                title="Sound effects"
                sub="Short tones for right, wrong and milestones."
                control={
                  <Switch
                    checked={feedback.sound}
                    onCheckedChange={(on) => setFeedback({ sound: on })}
                    aria-label="Sound effects"
                  />
                }
              />
              <SettingsRow
                title="Haptics"
                sub="A short buzz with each answer, where the device supports it."
                control={
                  <Switch
                    checked={feedback.haptics}
                    onCheckedChange={(on) => setFeedback({ haptics: on })}
                    aria-label="Haptics"
                  />
                }
              />
            </SettingsGroup>

            {signedIn ? (
              <>
                <SettingsGroup label="Profile">
                  <div className="px-4 py-3">
                    <label
                      htmlFor="settings-display-name"
                      className="block text-xs font-bold text-muted-foreground"
                    >
                      Display name
                    </label>
                    <input
                      id="settings-display-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={displayNameFor(account ?? null)}
                      className="mt-1 min-h-11 w-full rounded-xl bg-muted px-4 text-sm outline-none ring-primary/30 focus:ring-2"
                    />
                    <label
                      htmlFor="settings-handle"
                      className="mt-3 block text-xs font-bold text-muted-foreground"
                    >
                      Handle
                    </label>
                    <div className="mt-1 flex min-h-11 items-center rounded-xl bg-muted px-4 ring-primary/30 focus-within:ring-2">
                      <span className="text-sm text-muted-foreground">@</span>
                      <input
                        id="settings-handle"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value.toLowerCase())}
                        className="w-full bg-transparent py-2 pl-1 text-sm outline-none"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Friends find you with this handle. Email: {account?.email ?? "—"}
                    </p>
                    <Button
                      type="button"
                      onClick={() => void save({ displayName: name, handle })}
                      disabled={saving}
                      className="mt-3 h-11 w-full rounded-sm text-sm font-bold"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Save profile
                    </Button>
                    {error ? <p className="mt-2 text-xs text-flame">{error}</p> : null}
                    {saved ? <p className="mt-2 text-xs text-success">Saved</p> : null}
                  </div>
                </SettingsGroup>

                <SettingsGroup label="Notifications">
                  <SettingsRow
                    title="Friend nudges in the app"
                    sub="Show a reminder when a friend nudges you"
                    control={
                      <Switch
                        checked={account?.notifyNudgesInApp ?? true}
                        onCheckedChange={(checked) => void save({ notifyNudgesInApp: checked })}
                        aria-label="Friend nudges in the app"
                      />
                    }
                  />
                  <SettingsRow
                    title="Friend nudges by email"
                    sub="Emails start once a sending domain is connected"
                    control={
                      <Switch
                        checked={account?.notifyNudgesEmail ?? true}
                        onCheckedChange={(checked) => void save({ notifyNudgesEmail: checked })}
                        aria-label="Friend nudges by email"
                      />
                    }
                  />
                </SettingsGroup>

                <AiConsentGroup />
                <PrivacySafetySection />
                <YourDataSection />
              </>
            ) : (
              <>
                <SettingsGroup label="Account and data">
                  <SettingsRow
                    title="Signed out"
                    sub="Your settings are saved on this device. Sign in to sync them, manage notifications, or download and delete your data."
                    to="/auth"
                    value="Sign in"
                  />
                </SettingsGroup>
                <AiConsentGroup />
                <DeviceDataSection />
              </>
            )}

            <SettingsGroup label="About">
              <SettingsRow title="About and policies" to="/legal" />
            </SettingsGroup>
          </>
        )}
      </div>

      <FocusSheet
        open={focusOpen}
        onOpenChange={setFocusOpen}
        value={motivation}
        onChange={(next) => {
          saveIntent({ motivation: next });
          setMotivation(next);
          void save({ goal: next });
        }}
      />
    </PhoneFrame>
  );
}

const agreedOn = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** Whether this device agreed to send typed text to the AI service, and a way to take it back. */
function AiConsentGroup() {
  const agreedAt = useAiConsentAgreedAt();
  const [withdrawn, setWithdrawn] = useState(false);
  const day = agreedAt ? agreedOn(agreedAt) : null;

  return (
    <SettingsGroup label="AI service">
      <SettingsRow
        title="Sending what you type"
        sub={
          agreedAt
            ? `You agreed${day ? ` on ${day}` : ""} to send it to ${AI_PROVIDER_NAME}. Withdraw and you're asked again before anything more is sent.`
            : withdrawn
              ? "Withdrawn. Nothing more is sent until you agree again."
              : `Not agreed on this device. You're asked before anything you type goes to ${AI_PROVIDER_NAME}.`
        }
        control={
          agreedAt ? (
            <Button
              type="button"
              variant="secondary"
              aria-label="Withdraw AI agreement"
              onClick={() => {
                withdrawAiConsent();
                setWithdrawn(true);
              }}
              className="h-11 shrink-0 rounded-sm px-3 text-sm font-bold"
            >
              Withdraw
            </Button>
          ) : undefined
        }
      />
      {/* The button goes once it's used, so the change is announced. */}
      <p role="status" className="sr-only">
        {withdrawn && !agreedAt ? "AI agreement withdrawn." : ""}
      </p>
    </SettingsGroup>
  );
}
