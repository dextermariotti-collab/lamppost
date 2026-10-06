import { useServerFn } from "@tanstack/react-start";
import { Ban, Check, Flag, Loader2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CONTACT_EMAIL } from "@/lib/legal-config";
import { isLimited } from "@/lib/rate-limit";
import { blockUser, reportUser } from "@/lib/safety.functions";
import { MAX_REPORT_DETAILS, USER_REPORT_REASONS } from "@/lib/safety";

type Person = { id: string; name: string };

const TROUBLE = "That couldn't be done just now. Try again in a moment.";

/** Blocks someone after a plain explanation of what it does. They are not told. */
export function BlockPersonButton({
  person,
  onBlocked,
  className = "",
  children,
}: {
  person: Person;
  onBlocked?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  const block = useServerFn(blockUser);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await block({ data: { userId: person.id } });
      if (result.ok) {
        setOpen(false);
        onBlocked?.();
      } else {
        setError(isLimited(result) ? result.reason : result.reason || TROUBLE);
      }
    } catch {
      setError(TROUBLE);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className={
            className ||
            "flex min-h-11 items-center gap-2 px-1 text-xs font-semibold text-muted-foreground underline"
          }
        >
          {children ?? (
            <>
              <Ban aria-hidden className="h-3.5 w-3.5" />
              Block
            </>
          )}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-[22rem] rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Block {person.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Any friendship between you ends. They won&apos;t be able to find you, send you a request
            or see your profile, and they aren&apos;t told. You can unblock them in Settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="mt-0 h-11 rounded-sm">Cancel</AlertDialogCancel>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="flex h-11 items-center justify-center gap-2 rounded-sm bg-destructive px-5 text-sm font-bold text-destructive-foreground disabled:opacity-60"
          >
            {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            Block {person.name}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Reports a person to be looked at by a human. Blocking is offered afterwards, not bundled in. */
export function ReportPersonButton({
  person,
  className = "",
}: {
  person: Person;
  className?: string;
}) {
  const send = useServerFn(reportUser);
  const groupName = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason) return;
    setSending(true);
    setError(null);
    try {
      const result = await send({
        data: { userId: person.id, reason, ...(details.trim() ? { details: details.trim() } : {}) },
      });
      if (result.ok) setSent(true);
      else setError(result.reason || TROUBLE);
    } catch {
      setError(TROUBLE);
    } finally {
      setSending(false);
    }
  };

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setSent(false);
      setReason(null);
      setDetails("");
      setError(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          "flex min-h-11 items-center gap-2 px-1 text-xs font-semibold text-muted-foreground underline"
        }
      >
        <Flag aria-hidden className="h-3.5 w-3.5" />
        Report
      </button>

      <Drawer open={open} onOpenChange={close}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader>
            <DrawerTitle>Report {person.name}</DrawerTitle>
            <DrawerDescription>
              A person reads every report. {person.name} isn&apos;t told who sent it.
            </DrawerDescription>
          </DrawerHeader>

          <div className="max-h-[55vh] overflow-y-auto px-4 pb-2">
            {sent ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center" role="status">
                <Check
                  aria-hidden
                  className="h-8 w-8 rounded-full bg-success p-1.5 text-success-foreground"
                />
                <p className="text-sm font-bold">Thanks. Your report has been sent.</p>
                <p className="text-xs text-muted-foreground">
                  You can also block them so they can&apos;t contact you.
                </p>
              </div>
            ) : (
              <>
                <fieldset>
                  <legend className="sr-only">Why are you reporting {person.name}?</legend>
                  <div className="space-y-2">
                    {USER_REPORT_REASONS.map((option) => (
                      <label
                        key={option.value}
                        className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-ring ${
                          reason === option.value
                            ? "border-primary bg-primary-soft"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={groupName}
                          value={option.value}
                          checked={reason === option.value}
                          onChange={() => setReason(option.value)}
                          className="h-4 w-4 shrink-0 accent-[var(--primary)]"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="mt-3 block text-xs font-bold text-muted-foreground">
                  Anything else we should know? (optional)
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    maxLength={MAX_REPORT_DETAILS}
                    rows={3}
                    className="mt-1 w-full rounded-2xl bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-soft outline-none ring-primary/30 focus:ring-2"
                  />
                </label>
                {error && (
                  <p role="alert" className="mt-2 text-xs font-bold text-destructive">
                    {error}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="p-4 pt-2">
            {sent ? (
              <button
                type="button"
                onClick={() => close(false)}
                className="flex h-12 w-full items-center justify-center rounded-sm bg-muted text-base font-bold"
              >
                Close
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={!reason || sending}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-hero-gradient text-base font-extrabold text-primary-foreground shadow-card disabled:opacity-50"
                >
                  {sending && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                  Send report
                </button>
                <p className="mt-2 text-center text-[11px] font-semibold text-muted-foreground">
                  In danger? Contact local emergency services. Other concerns: {CONTACT_EMAIL}.
                </p>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
