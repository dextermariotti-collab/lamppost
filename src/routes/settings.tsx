import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Download, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Switch } from "@/components/ui/switch";
import { displayNameFor, useAccount, useRefreshAccount } from "@/lib/account";
import { deleteMyAccount, exportMyData } from "@/lib/account-data.functions";
import { LEGAL_DOCS, PRIVACY_CONTACT } from "@/lib/legal";
import { updateMyProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
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

            <LegalAndDataSection />
          </>
        )}
      </div>
    </PhoneFrame>
  );
}

/** Legal pages plus the real mechanisms behind the privacy policy's promises. */
function LegalAndDataSection() {
  const navigate = useNavigate();
  const runExport = useServerFn(exportMyData);
  const runDelete = useServerFn(deleteMyAccount);
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [confirm, setConfirm] = useState("");
  const [askDelete, setAskDelete] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const download = async () => {
    setBusy("export");
    setProblem(null);
    try {
      const payload = await runExport();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lamppost-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "That export didn't work. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const destroy = async () => {
    setBusy("delete");
    setProblem(null);
    try {
      await runDelete({ data: { confirm } });
      Object.keys(localStorage)
        .filter((key) => key.startsWith("lamppost-"))
        .forEach((key) => localStorage.removeItem(key));
      await supabase.auth.signOut();
      void navigate({ to: "/auth", replace: true });
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "That deletion didn't complete. Try again.");
      setBusy(null);
    }
  };

  return (
    <>
      <section className="mt-8">
        <h2 className="text-sm font-bold">Legal &amp; policies</h2>
        <ul className="mt-2 space-y-2">
          {LEGAL_DOCS.map((doc) => (
            <li key={doc.slug}>
              <Link
                to={doc.route}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft"
              >
                <span className="flex-1">
                  <span className="block text-sm font-bold">{doc.title}</span>
                  <span className="block text-xs text-muted-foreground">{doc.summary}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold">Your data</h2>
        <button
          onClick={() => void download()}
          disabled={busy !== null}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-card py-3 text-sm font-bold shadow-soft disabled:opacity-60"
        >
          {busy === "export" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export my data
        </button>
        <p className="mt-1 text-[11px] text-muted-foreground">
          A JSON copy of your profile, activity, achievements, friendships, nudges and reports.
        </p>

        {!askDelete ? (
          <button
            onClick={() => setAskDelete(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/10 py-3 text-sm font-bold text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete my account
          </button>
        ) : (
          <div className="mt-4 rounded-2xl bg-destructive/10 p-4">
            <p className="text-xs font-semibold text-foreground/80">
              This permanently deletes your profile, progress, activity history, friendships, shared
              streaks and nudges, and removes your sign-in. It cannot be undone. Type DELETE to
              confirm.
            </p>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.toUpperCase())}
              placeholder="DELETE"
              className="mt-3 w-full rounded-2xl bg-card px-4 py-3 text-sm font-bold outline-none ring-destructive/40 focus:ring-2"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setAskDelete(false);
                  setConfirm("");
                }}
                className="flex-1 rounded-2xl bg-card py-3 text-sm font-bold shadow-soft"
              >
                Keep my account
              </button>
              <button
                onClick={() => void destroy()}
                disabled={confirm !== "DELETE" || busy !== null}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-destructive py-3 text-sm font-bold text-destructive-foreground disabled:opacity-50"
              >
                {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Delete forever
              </button>
            </div>
          </div>
        )}
        {problem ? <p className="mt-2 text-xs text-flame">{problem}</p> : null}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Privacy requests: {PRIVACY_CONTACT}
        </p>
      </section>
    </>
  );
}
