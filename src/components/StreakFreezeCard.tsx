import { Gem, Loader2, Snowflake } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FREEZE_COST, MAX_FREEZES, type BuyFreezeOutcome } from "@/lib/progress";

/**
 * Streak forgiveness surface. Freezes are the escape valve that keeps loss
 * aversion motivating instead of punishing: one covers a single missed day.
 */
export function StreakFreezeCard({
  freezes,
  gems,
  onBuy,
}: {
  freezes: number;
  gems: number;
  /** Resolves when the purchase is settled: signed in, that means the server has answered. */
  onBuy: () => Promise<BuyFreezeOutcome>;
}) {
  const full = freezes >= MAX_FREEZES;
  const affordable = gems >= FREEZE_COST;
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const buy = () => {
    if (pending) return;
    setPending(true);
    setProblem(null);
    void onBuy()
      .then((outcome) => setProblem(outcome.ok ? null : outcome.message))
      .catch(() => setProblem("That couldn't go through just now. Your gems were not spent."))
      .finally(() => setPending(false));
  };

  return (
    <section className="mt-6 animate-rise-in border-t border-border pt-5">
      <div className="flex items-center gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-primary/15 blur-md"
          />
          <Snowflake
            className={`relative h-8 w-8 ${freezes > 0 ? "text-primary-text" : "text-muted-foreground"}`}
            strokeWidth={2.2}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base">Streak freeze</h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {freezes > 0
              ? `${freezes} held — a missed day won't reset your streak.`
              : "No freezes left. A missed day will reset your streak."}
          </p>
          <div className="mt-2 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: MAX_FREEZES }, (_, i) => (
              <span
                key={i}
                className={`h-2.5 w-8 rounded-full ${i < freezes ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        You earn one free freeze every 7 days of streak, up to {MAX_FREEZES} at a time.
      </p>

      {!full && (
        <>
          <Button
            onClick={buy}
            disabled={!affordable || pending}
            aria-busy={pending}
            className="mt-4 h-11 w-full rounded-full text-sm font-extrabold"
          >
            {pending ? (
              <Loader2 aria-hidden className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Gem aria-hidden className="mr-1.5 h-4 w-4" />
            )}
            {pending
              ? "Getting your freeze…"
              : affordable
                ? `Get another for ${FREEZE_COST} gems`
                : `${FREEZE_COST - gems} more gems for another`}
          </Button>
          {problem && (
            <p role="alert" className="mt-2 text-[13px] font-semibold text-destructive">
              {problem}
            </p>
          )}
        </>
      )}
    </section>
  );
}
