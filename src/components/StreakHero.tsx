import { Flame } from "lucide-react";
import { CountUp } from "./CountUp";

/** Flame intensity tiers — the fire visibly grows with the streak. */
export function flameTier(streak: number) {
  if (streak >= 100) return 3;
  if (streak >= 30) return 2;
  if (streak >= 7) return 1;
  return 0;
}

/**
 * Hero streak metric. The flame gains size, glow and motion at milestones, and
 * cools to a hollow outline when today's streak hasn't been secured yet.
 */
export function StreakHero({ streak, atRisk }: { streak: number; atRisk: boolean }) {
  const tier = flameTier(streak);
  const size = [30, 34, 38, 42][tier]!;
  const glow = [0.22, 0.34, 0.48, 0.62][tier]!;

  return (
    <div className="relative flex items-center gap-4">
      <div className="relative flex items-center justify-center">
        <span
          aria-hidden
          className="absolute h-16 w-16 rounded-full blur-xl"
          style={{ background: `oklch(0.68 0.19 40 / ${atRisk ? 0.14 : glow})` }}
        />
        <Flame
          className={atRisk ? "relative text-flame/60" : "relative animate-flame text-flame"}
          style={{ width: size, height: size }}
          strokeWidth={atRisk ? 2 : 2.4}
          fill={atRisk ? "none" : "currentColor"}
        />
      </div>
      <div className="leading-none">
        <CountUp
          value={streak}
          className="font-display text-[2.75rem] font-extrabold tracking-tight text-foreground"
        />
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          day streak
        </p>
      </div>
    </div>
  );
}
