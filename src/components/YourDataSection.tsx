import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Mail, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount, exportMyData } from "@/lib/account-data.functions";
import { dayKey } from "@/lib/days";
import { clearDeviceData } from "@/lib/device-data";
import { CONTACT_EMAIL, contactHref } from "@/lib/legal-config";

const button =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";

/**
 * "Your data" for someone with an account: download it, ask for it by email, or delete
 * the account and everything in it. Deleting asks for the word DELETE, then clears this
 * device and signs out.
 */
export function YourDataSection() {
  const navigate = useNavigate();
  const runExport = useServerFn(exportMyData);
  const runDelete = useServerFn(deleteMyAccount);
  const confirmId = useId();
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
      link.download = `lamppost-data-${dayKey()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "That download didn't work. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const destroy = async () => {
    setBusy("delete");
    setProblem(null);
    try {
      await runDelete({ data: { confirm } });
      clearDeviceData();
      await supabase.auth.signOut();
      void navigate({ to: "/", replace: true });
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "That deletion didn't complete. Try again.");
      setBusy(null);
    }
  };

  const requestHref = contactHref(
    "Data request",
    "Please send me a copy of the personal data Lamppost holds about my account.",
  );

  return (
    <section className="mt-6" aria-labelledby="your-data-heading">
      <h2
        id="your-data-heading"
        className="px-1 font-sans text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
      >
        Your data
      </h2>

      <button
        type="button"
        onClick={() => void download()}
        disabled={busy !== null}
        className={`${button} mt-3 bg-card shadow-soft`}
      >
        {busy === "export" ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <Download aria-hidden className="h-4 w-4" />
        )}
        Download my data
      </button>
      <p className="mt-1 text-[11px] text-muted-foreground">
        A file with your profile, progress, friends, writing, rewards and the record of what you
        agreed to.
      </p>

      {requestHref ? (
        <a href={requestHref} className={`${button} mt-3 bg-card shadow-soft`}>
          <Mail aria-hidden className="h-4 w-4" />
          Request my data by email
        </a>
      ) : (
        <p className="mt-3 rounded-2xl bg-card p-3 text-xs text-muted-foreground shadow-soft">
          <span className="font-bold text-foreground">Request my data by email:</span> write to{" "}
          {CONTACT_EMAIL} and say what you'd like.
        </p>
      )}

      {!askDelete ? (
        <button
          type="button"
          onClick={() => setAskDelete(true)}
          className={`${button} mt-4 bg-destructive/10 text-destructive`}
        >
          <Trash2 aria-hidden className="h-4 w-4" />
          Delete my account
        </button>
      ) : (
        <div
          className="mt-4 rounded-2xl bg-destructive/10 p-4"
          role="group"
          aria-label="Delete account"
        >
          <p className="text-xs font-semibold text-foreground/80">
            This permanently deletes your account and everything in it: your profile, progress,
            rewards, friends, shared streaks, writing and conversations, and your sign-in. Reports
            you made are kept for safety but no longer linked to you. It cannot be undone.
          </p>
          <label htmlFor={confirmId} className="mt-3 block text-xs font-bold">
            Type DELETE to confirm
          </label>
          <input
            id={confirmId}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.toUpperCase())}
            autoComplete="off"
            className="mt-1 min-h-11 w-full rounded-2xl bg-card px-4 py-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAskDelete(false);
                setConfirm("");
              }}
              className={`${button} flex-1 bg-card shadow-soft`}
            >
              Keep my account
            </button>
            <button
              type="button"
              onClick={() => void destroy()}
              disabled={confirm !== "DELETE" || busy !== null}
              className={`${button} flex-1 bg-destructive text-destructive-foreground disabled:opacity-50`}
            >
              {busy === "delete" ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
              Delete forever
            </button>
          </div>
        </div>
      )}
      {problem ? (
        <p role="alert" className="mt-2 text-xs font-bold text-destructive">
          {problem}
        </p>
      ) : null}
    </section>
  );
}

/** For someone without an account: the only copy of their progress is in this browser. */
export function DeviceDataSection() {
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);

  return (
    <section className="mt-6" aria-labelledby="device-data-heading">
      <h2
        id="device-data-heading"
        className="px-1 font-sans text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
      >
        Data on this device
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Without an account, your progress, drill answers and settings are kept in this browser only.
        Nothing about them is on our servers.
      </p>
      {cleared ? (
        <p role="status" className="mt-3 rounded-2xl bg-card p-3 text-xs font-bold shadow-soft">
          Cleared. Reload the page to start fresh.
        </p>
      ) : confirming ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={`${button} flex-1 bg-card shadow-soft`}
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={() => {
              clearDeviceData();
              setCleared(true);
            }}
            className={`${button} flex-1 bg-destructive text-destructive-foreground`}
          >
            Clear it
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={`${button} mt-2 justify-start border border-border bg-card px-4 text-destructive`}
        >
          <Trash2 aria-hidden className="h-4 w-4" />
          Clear progress on this device
        </button>
      )}
    </section>
  );
}
