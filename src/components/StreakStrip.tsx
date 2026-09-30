import { Check, Snowflake } from "lucide-react";
import { StreakFlame } from "@/components/StreakCalendar";
import type { StripDay } from "@/lib/progress-view";

const PENDING = "–";

/**
 * The streak as one strip: the number, the longest run, and the last seven days as dots.
 * Tapping it opens the calendar, freezes and today's goal. The number is printed as it is,
 * never counted up from zero, and shows a dash until the learner's real numbers have loaded.
 */
export function StreakStrip({
  hydrated,
  streak,
  longestStreak,
  atRisk,
  days,
  onOpen,
}: {
  hydrated: boolean;
  streak: number;
  longestStreak: number;
  atRisk: boolean;
  /** Empty until the browser knows the local day. */
  days: StripDay[];
  onOpen: () => void;
}) {
  const label = hydrated
    ? `${streak} day streak. Longest ${longestStreak} days. Open the calendar and freezes.`
    : "Streak. Open the calendar and freezes.";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={label}
      className="mt-5 block w-full rounded-2xl border border-border bg-card p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="flex items-center gap-2">
        <StreakFlame streak={atRisk ? 0 : streak} size={22} />
        <span className="text-[17px] font-bold">{hydrated ? streak : PENDING} day streak</span>
        <span className="flex-1" />
        <span className="text-[13px] font-semibold text-muted-foreground">
          Longest {hydrated ? longestStreak : PENDING}
        </span>
      </span>
      <span aria-hidden className="mt-3 flex justify-between">
        {(days.length > 0 ? days : PLACEHOLDER_DAYS).map((day, i) => (
          <span key={day?.key ?? i} className="flex flex-col items-center gap-1.5">
            <span className="h-3 text-[10px] font-bold leading-3 text-muted-foreground">
              {day?.letter ?? ""}
            </span>
            <Dot day={day} />
          </span>
        ))}
      </span>
      {atRisk && hydrated && (
        <span className="mt-3 block text-[13px] text-muted-foreground">
          A lesson today keeps the streak going.
        </span>
      )}
    </button>
  );
}

const PLACEHOLDER_DAYS: (StripDay | null)[] = Array.from({ length: 7 }, () => null);

function Dot({ day }: { day: StripDay | null }) {
  const base = "flex h-7 w-7 items-center justify-center rounded-full";
  if (!day) return <span className={`${base} bg-muted`} />;
  const ring = day.isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "";
  if (day.status === "done")
    return (
      <span className={`${base} bg-primary text-primary-foreground ${ring}`}>
        <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  if (day.status === "freeze")
    return (
      <span className={`${base} bg-gem/20 text-gem ${ring}`}>
        <Snowflake aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
      </span>
    );
  return <span className={`${base} bg-muted ${ring}`} />;
}
