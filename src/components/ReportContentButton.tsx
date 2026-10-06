import { useServerFn } from "@tanstack/react-start";
import { CONTACT_EMAIL } from "@/lib/legal-config";
import { Check, Flag, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { REPORT_REASONS, submitContentReport, type ReportInput } from "@/lib/reports.functions";

type Props = { context: Omit<ReportInput, "reason" | "details"> };

/** Lets a learner flag generated content that slipped past the safety rules. */
export function ReportContentButton({ context }: Props) {
  const send = useServerFn(submitContentReport);
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
      await send({ data: { ...context, reason, details } });
      setSent(true);
      window.setTimeout(() => {
        setOpen(false);
        setSent(false);
        setReason(null);
        setDetails("");
      }, 1400);
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mx-auto mt-4 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:text-flame"
      >
        <Flag className="h-3.5 w-3.5" />
        Report this content
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader>
            <DrawerTitle>Report generated content</DrawerTitle>
            <DrawerDescription>
              Tell us what's wrong. Reports are reviewed and used to tighten the content rules.
            </DrawerDescription>
          </DrawerHeader>

          <div className="max-h-[55vh] overflow-y-auto px-4 pb-2">
            {sent ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Check className="h-8 w-8 rounded-full bg-success p-1.5 text-success-foreground" />
                <p className="text-sm font-bold">Thanks — that's been sent for review.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {REPORT_REASONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setReason(option.value)}
                      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition-colors ${
                        reason === option.value
                          ? "border-primary bg-primary-soft"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span
                        className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                          reason === option.value ? "border-primary bg-primary" : "border-border"
                        }`}
                      />
                      {option.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  placeholder="Anything else we should know? (optional)"
                  className="mt-3 w-full rounded-2xl bg-card px-4 py-3 text-sm font-semibold shadow-soft outline-none ring-primary/30 focus:ring-2"
                />
                {error && <p className="mt-2 text-xs font-bold text-flame">{error}</p>}
              </>
            )}
          </div>

          {!sent && (
            <div className="p-4 pt-2">
              <button
                onClick={() => void submit()}
                disabled={!reason || sending}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-hero-gradient text-base font-extrabold text-primary-foreground shadow-card disabled:opacity-50"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                Send report
              </button>
              <p className="mt-2 text-center text-[11px] font-semibold text-muted-foreground">
                Urgent safety concern? Email {CONTACT_EMAIL}.
              </p>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
