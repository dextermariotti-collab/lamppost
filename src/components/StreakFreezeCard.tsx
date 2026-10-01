import { Snowflake } from "lucide-react";
import { MAX_FREEZES } from "@/lib/progress";

/**
 * Streak forgiveness: a held freeze covers one missed day. Freezes are earned, never bought:
 * one free every 7 days of streak, up to a small cap.
 */
export function StreakFreezeCard({ freezes }: { freezes: number }) {
  return (
    <section className="mt-6 animate-rise-in border-t border-border pt-5">
      <div className="flex items-center gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-primary/15 blur-md"
          />
          <Snowflake
            aria-hidden
            className={`relative h-8 w-8 ${freezes > 0 ? "text-primary-text" : "text-muted-foreground"}`}
            strokeWidth={2.2}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base">Streak freeze</h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {freezes > 0
              ? `${freezes} held — a missed day won't reset your streak.`
              : "None held right now. A missed day will reset your streak."}
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
        You earn one free every 7 days of streak, up to {MAX_FREEZES} at a time. They can't be
        bought.
      </p>
    </section>
  );
}
