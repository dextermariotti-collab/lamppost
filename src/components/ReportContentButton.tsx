import { useServerFn } from "@tanstack/react-start";
import { CONTACT_EMAIL, contactHref } from "@/lib/legal-config";
import { Check, Flag, Loader2, Mail } from "lucide-react";
import { useId, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useSessionUser } from "@/lib/companion-store";
import { REPORT_REASONS, submitContentReport, type ReportInput } from "@/lib/reports.functions";

type Context = Omit<ReportInput, "reason" | "details">;

type Props = {
  /** `courseTopic` names the surface ("Tutor chat"); `excerpt` is the AI's text, capped here. */
  context: Context;
  /** Where the control sits. By default it is centered under the content, as in the lessons. */
  className?: string;
};

/** Enough of the AI's text to find what went wrong (the server keeps up to 4,000 characters). */
const EXCERPT_CHARS = 2000;
/** An email link carries less, so it opens in every mail app. */
const EMAIL_EXCERPT_CHARS = 500;

function cap(text: string, max: number) {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

/** Lets a learner flag AI-generated content without leaving the screen it's on. */
export function ReportContentButton({ context, className = "mx-auto mt-4" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex min-h-8 items-center gap-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:text-flame ${className}`}
      >
        <Flag aria-hidden className="h-3.5 w-3.5" />
        Report this content
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader>
            <DrawerTitle>Report AI-generated content</DrawerTitle>
            <DrawerDescription>
              Tell us what&apos;s wrong. A person reads every report, and reports are used to
              tighten the content rules.
            </DrawerDescription>
          </DrawerHeader>
          {/* Mounted only while open, so a closed button never asks who is signed in. */}
          <ReportForm context={context} onSent={() => setOpen(false)} />
        </DrawerContent>
      </Drawer>
    </>
  );
}

function ReportForm({ context, onSent }: { context: Context; onSent: () => void }) {
  const send = useServerFn(submitContentReport);
  const { userId, ready } = useSessionUser();
  const group = useId();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const excerpt = cap(context.excerpt ?? "", EXCERPT_CHARS);
  const signedOut = ready && !userId;

  const submit = async () => {
    if (!reason) return;
    setSending(true);
    setError(null);
    try {
      await send({ data: { ...context, excerpt, reason, details } });
      setSent(true);
      window.setTimeout(onSent, 1400);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "That report didn't send. Check your connection and try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const reasonLabel = REPORT_REASONS.find((option) => option.value === reason)?.label ?? "";
  const emailHref = contactHref(
    "Report: AI-generated content",
    [
      context.courseTopic ? `Where: ${context.courseTopic}` : "",
      context.lessonTitle ? `Lesson: ${context.lessonTitle}` : "",
      reasonLabel ? `Reason: ${reasonLabel}` : "",
      details.trim() ? `Details: ${details.trim()}` : "",
      excerpt ? `What it said: ${cap(excerpt, EMAIL_EXCERPT_CHARS)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );

  return (
    <>
      <div className="max-h-[55vh] overflow-y-auto px-4 pb-2">
        {sent ? (
          <div className="flex flex-col items-center gap-2 py-8" role="status">
            <Check
              aria-hidden
              className="h-8 w-8 rounded-full bg-success p-1.5 text-success-foreground"
            />
            <p className="text-sm font-bold">Thanks. That&apos;s been sent for review.</p>
          </div>
        ) : (
          <>
            <fieldset>
              <legend className="sr-only">What&apos;s wrong with it?</legend>
              <div className="space-y-2">
                {REPORT_REASONS.map((option) => (
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
                      name={group}
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
                rows={3}
                maxLength={2000}
                className="mt-1 w-full rounded-2xl bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-soft outline-none ring-primary/30 focus:ring-2"
              />
            </label>
            {error && (
              <p role="alert" className="mt-2 text-xs font-bold text-flame">
                {error}
              </p>
            )}
          </>
        )}
      </div>

      {!sent && (
        <div className="p-4 pt-2">
          {signedOut ? (
            <>
              {emailHref && reason ? (
                <a
                  href={emailHref}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-hero-gradient text-base font-extrabold text-primary-foreground shadow-card"
                >
                  <Mail aria-hidden className="h-4 w-4" />
                  Email this report
                </a>
              ) : emailHref ? (
                <button
                  type="button"
                  disabled
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-hero-gradient text-base font-extrabold text-primary-foreground shadow-card disabled:opacity-50"
                >
                  <Mail aria-hidden className="h-4 w-4" />
                  Email this report
                </button>
              ) : null}
              <p className="mt-2 text-center text-[11px] font-semibold text-muted-foreground">
                {emailHref
                  ? "Sending it from inside the app needs an account, so this opens an email to us with the details filled in."
                  : `Sending it from inside the app needs an account. Until then, email ${CONTACT_EMAIL} and say what was wrong.`}
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!reason || sending || !ready}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-hero-gradient text-base font-extrabold text-primary-foreground shadow-card disabled:opacity-50"
              >
                {sending && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                Send report
              </button>
              <p className="mt-2 text-center text-[11px] font-semibold text-muted-foreground">
                Urgent safety concern? Email {CONTACT_EMAIL}.
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
