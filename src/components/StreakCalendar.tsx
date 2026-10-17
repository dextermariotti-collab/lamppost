import { Flame, Snowflake } from "lucide-react";
import { useEffect, useState } from "react";
import { dayKey, shiftDay } from "@/lib/days";
import type { ProgressState } from "@/lib/progress-core";
import { calendarRange, weekdayLetter } from "@/lib/progress-view";

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

  return (
    <span className={`relative inline-flex items-center justify-center ${className ?? ""}`}>
      <Flame
        aria-hidden
        className="relative text-flame"
        style={{ width: px, height: px }}
        strokeWidth={2.2}
        fill={tier >= 1 ? "currentColor" : "none"}
      />
    </span>
  );
}

/**
 * The last four weeks of real practice, under the month and a row of weekday letters. Filled
 * squares are days lessons were finished, snowflakes are days a freeze covered, blanks are days
 * missed, and today has a ring.
 */
export function StreakCalendar({ state }: { state: ProgressState }) {
  // "Today" is the device's local day, which the server can't know.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const today = dayKey();
  if (!mounted) return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />;
  const days = Array.from({ length: 28 }, (_, i) => shiftDay(today, -(27 - i)));
  const frozen = new Set(state.freezeLog);

  return (
    <div className="max-w-[440px]">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{calendarRange(today)}</p>
      <div aria-hidden className="mb-1 grid grid-cols-7 gap-1.5">
        {days.slice(0, 7).map((day) => (
          <span key={day} className="text-center text-[10px] font-bold text-muted-foreground">
            {weekdayLetter(day)}
          </span>
        ))}
      </div>
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
                    : "bg-muted text-muted-foreground"
              } ${isToday ? "ring-2 ring-primary" : ""}`}
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
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-primary/85" /> practiced
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
