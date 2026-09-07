import { Gem, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FREEZE_COST, MAX_FREEZES } from "@/lib/progress";

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
  onBuy: () => void;
}) {
  const full = freezes >= MAX_FREEZES;
  const affordable = gems >= FREEZE_COST;

  return (
    <section className="mt-4 animate-rise-in rounded-3xl bg-card p-5 shadow-soft">
      <div className="flex items-center gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-primary/15 blur-md"
          />
          <Snowflake
            className={`relative h-8 w-8 ${freezes > 0 ? "text-primary" : "text-muted-foreground/50"}`}
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
        <Button
          onClick={onBuy}
          disabled={!affordable}
          className="mt-3 h-11 w-full rounded-full text-sm font-extrabold"
        >
          <Gem className="mr-1.5 h-4 w-4" />
          {affordable
            ? `Get another for ${FREEZE_COST} gems`
            : `${FREEZE_COST - gems} more gems for another`}
        </Button>
      )}
    </section>
  );
}
