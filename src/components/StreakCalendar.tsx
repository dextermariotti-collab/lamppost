import { Flame, Snowflake } from "lucide-react";
import { dayKey, type ProgressState } from "@/lib/progress";

/** Streak milestones. The flame grows visibly at each one. */
export const STREAK_TIERS = [3, 7, 30, 100];

export function streakTier(streak: number) {
  return STREAK_TIERS.filter((tier) => streak >= tier).length;
}

/** Flame size, glow strength and motion, one step per milestone reached. */
export function StreakFlame({
  streak,
  size,
  className,
}: {
  streak: number;
  size?: number;
  className?: string;
}) {
  const tier = streakTier(streak);
  const px = size ?? [18, 22, 26, 30, 34][tier]!;
  const glow = [0, 0.18, 0.3, 0.44, 0.6][tier]!;

  return (
    <span className={`relative inline-flex items-center justify-center ${className ?? ""}`}>
      {glow > 0 && (
        <span
          aria-hidden
          className="absolute rounded-full blur-md"
          style={{
            width: px * 2,
            height: px * 2,
            background: `color-mix(in oklab, var(--flame) ${Math.round(glow * 100)}%, transparent)`,
          }}
        />
      )}
      <Flame
        aria-hidden
        className={tier >= 2 ? "relative animate-flame text-flame" : "relative text-flame"}
        style={{ width: px, height: px }}
        strokeWidth={2.2}
        fill={tier >= 1 ? "currentColor" : "none"}
      />
    </span>
  );
}

function shift(key: string, days: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return dayKey(d);
}

/**
 * The last four weeks of real practice. Filled squares are days lessons were
 * finished, snowflakes are days a freeze covered, blanks are days missed.
 */
export function StreakCalendar({ state }: { state: ProgressState }) {
  const today = dayKey();
  const days = Array.from({ length: 28 }, (_, i) => shift(today, -(27 - i)));
  const frozen = new Set(state.freezeLog);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const count = state.history[day] ?? 0;
          const isFrozen = count === 0 && frozen.has(day);
          const isToday = day === today;
          return (
            <div
              key={day}
              title={`${day}: ${count > 0 ? `${count} lesson${count === 1 ? "" : "s"}` : isFrozen ? "freeze used" : "no practice"}`}
              className={`flex aspect-square items-center justify-center rounded-lg text-[10px] font-bold ${
                count > 0
                  ? "bg-primary/85 text-primary-foreground"
                  : isFrozen
                    ? "bg-gem/20 text-gem"
                    : "bg-muted text-muted-foreground/45"
              } ${isToday ? "ring-2 ring-primary/50" : ""}`}
            >
              <span className="relative inline-flex items-center justify-center leading-none">
                {Number(day.slice(-2))}
                {isFrozen && (
                  <Snowflake
                    aria-hidden
                    className="absolute -top-1.5 -right-2 h-2.5 w-2.5 text-gem"
                  />
                )}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-primary/85" /> practised
        </span>
        <span className="flex items-center gap-1.5">
          <Snowflake aria-hidden className="h-3 w-3 text-gem" /> freeze used
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-muted" /> missed
        </span>
      </div>
    </div>
  );
}
