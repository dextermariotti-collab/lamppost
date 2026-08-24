import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Switch } from "@/components/ui/switch";
import { displayNameFor, useAccount, useRefreshAccount } from "@/lib/account";
import { updateMyProfile } from "@/lib/profile.functions";
import { useProgress } from "@/lib/progress";

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

  useEffect(() => {
    if (sessionReady && !signedIn) navigate({ to: "/auth", replace: true });
  }, [sessionReady, signedIn, navigate]);

  const save = async (patch: Parameters<typeof updateMyProfile>[0]["data"]) => {
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
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-sm font-bold">Profile</h2>
              <label className="mt-3 block text-xs font-bold text-muted-foreground">
                Display name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={displayNameFor(account ?? null)}
                className="mt-1 w-full rounded-2xl bg-card px-4 py-3 text-sm shadow-soft outline-none ring-primary/30 focus:ring-2"
              />
              <label className="mt-3 block text-xs font-bold text-muted-foreground">Handle</label>
              <div className="mt-1 flex items-center rounded-2xl bg-card px-4 shadow-soft ring-primary/30 focus-within:ring-2">
                <span className="text-sm text-muted-foreground">@</span>
                <input
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
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
