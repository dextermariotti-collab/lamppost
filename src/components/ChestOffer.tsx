import { Link } from "@tanstack/react-router";
import { Gift, Loader2 } from "lucide-react";
import { useState } from "react";
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
      className={`rounded-2xl border border-border px-4 py-3 text-left ${className}`}
    >
      <div className="flex items-center gap-3">
        <Gift aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          {justOpened ? (
            <span role="status" className="animate-pop-in font-semibold text-foreground">
              {describePrize(justOpened)}
            </span>
          ) : left === 1 ? (
            "A reward chest is waiting."
          ) : (
            `${left} reward chests are waiting.`
          )}
        </p>
        {left > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={open}
            disabled={busy}
            aria-busy={busy}
            aria-label={justOpened ? "Open the next chest" : "Open the chest"}
            className="h-11 shrink-0 rounded-full px-5 font-semibold"
          >
            {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Opening" : justOpened ? "Open next" : "Open"}
          </Button>
        )}
      </div>
      {last && !last.ok && (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-destructive">
          {last.message}
        </p>
      )}
      <Link
        to="/rewards"
        className="mt-1 inline-flex min-h-11 items-center text-xs font-semibold text-primary-text underline"
      >
        What can be inside? Odds and chest history
      </Link>
    </section>
  );
}
