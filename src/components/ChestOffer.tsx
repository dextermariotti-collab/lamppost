import { Link } from "@tanstack/react-router";
import { Gift, Loader2 } from "lucide-react";
import { useState } from "react";
import { ChestOdds } from "@/components/ChestOdds";
import { Button } from "@/components/ui/button";
import { dayKey, useProgress, type ChestOutcome } from "@/lib/progress";
import { describePrize, type ChestSource } from "@/lib/rewards";
import { chestsLeft } from "@/lib/rewards-state";

/**
 * The reward chest after a lesson, a review or the daily challenge. It is there if
 * something was finished today and a chest is left; it is quiet otherwise. It never
 * counts down, never says a chest is about to disappear, and never asks for
 * anything: opening it is the learner's choice, and the odds are one tap away.
 */
export function ChestOffer({
  source,
  className = "",
}: {
  source: ChestSource;
  className?: string;
}) {
  const { state, hydrated, openChest } = useProgress();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<ChestOutcome | null>(null);

  if (!hydrated) return null;
  const left = chestsLeft(state, dayKey());
  const justOpened = last?.ok ? last.record : null;
  if (left === 0 && !justOpened && !last) return null;

  const open = () => {
    if (busy) return;
    setBusy(true);
    setLast(null);
    void openChest(source)
      .then(setLast)
      .catch(() => setLast({ ok: false, message: "That couldn't go through just now." }))
      .finally(() => setBusy(false));
  };

  return (
    <section
      aria-label="Reward chest"
      className={`rounded-3xl border border-border bg-card p-4 text-left shadow-soft ${className}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-text"
        >
          <Gift className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base">{justOpened ? "Inside the chest" : "A reward chest"}</h2>
          {justOpened ? (
            <p role="status" className="mt-1 animate-pop-in text-sm font-semibold text-foreground">
              {describePrize(justOpened)}
            </p>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {left === 1
                ? "You finished something today, so there's a chest. Most hold a few gems."
                : `You finished things today, so there are ${left} chests. Most hold a few gems.`}
            </p>
          )}
          {last && !last.ok && (
            <p role="alert" className="mt-2 text-[13px] font-semibold text-destructive">
              {last.message}
            </p>
          )}
        </div>
      </div>

      {left > 0 && (
        <Button
          type="button"
          onClick={open}
          disabled={busy}
          aria-busy={busy}
          className="mt-3 h-11 w-full rounded-full font-semibold"
        >
          {busy ? <Loader2 aria-hidden className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {busy ? "Opening…" : justOpened ? "Open the next chest" : "Open the chest"}
        </Button>
      )}

      <details className="mt-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-[13px] font-semibold text-primary-text">
          What can be inside?
        </summary>
        <div className="pb-2">
          <ChestOdds />
          <Link
            to="/rewards"
            className="mt-2 inline-flex min-h-11 items-center text-[13px] font-semibold text-primary-text underline"
          >
            Your rewards and chest history
          </Link>
        </div>
      </details>
    </section>
  );
}
