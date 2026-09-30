import { Check, Gem, Sparkles, Star } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { ProgressRing } from "@/components/ProgressRing";

/**
 * The number-heavy blocks on /progress. They take plain props
 * and show a neutral dash until `hydrated`: before that the store only holds
 * its server placeholder (all zeros), and printing those as if they were the
 * learner's real numbers is what made the page read "0 XP / 0 day streak".
 */

const PENDING = "–";

export function TodaySession({
  hydrated,
  doneToday,
  dailyGoal,
  dueTotal,
}: {
  hydrated: boolean;
  doneToday: number;
  dailyGoal: number;
  dueTotal: number;
}) {
  const goal = Math.max(dailyGoal, 1);
  const pct = Math.min(100, Math.round((doneToday / goal) * 100));
  const complete = hydrated && doneToday >= goal;
  const remaining = goal - doneToday;

  return (
    <section
      className="mt-6 flex animate-rise-in items-center gap-5 border-t border-border pt-5"
      style={{ animationDelay: "80ms" }}
    >
      <ProgressRing pct={hydrated ? pct : 0} size={104} stroke={10}>
        <span className="text-2xl font-extrabold">
          {hydrated ? <CountUp value={doneToday} duration={800} /> : PENDING}
          <span className="text-sm text-muted-foreground">/{hydrated ? goal : PENDING}</span>
        </span>
        <span className="text-[10px] font-bold text-muted-foreground">today</span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <h2 className="text-base">Today's session</h2>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {!hydrated
            ? "Loading today's progress…"
            : complete
              ? "Session complete. The streak is safe."
              : `${remaining} more lesson${remaining === 1 ? "" : "s"} to close today out.`}
        </p>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {!hydrated
            ? " "
            : dueTotal === 0
              ? "Nothing due for review today."
              : `${dueTotal} drill${dueTotal === 1 ? "" : "s"} due for review.`}
        </p>
        {complete && (
          <span className="mt-2 inline-flex animate-pop-in items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-extrabold text-success">
            <Sparkles className="h-3.5 w-3.5" /> Daily goal cleared
          </span>
        )}
      </div>
    </section>
  );
}

export function StatTiles({
  hydrated,
  lessons,
  xp,
  gems,
}: {
  hydrated: boolean;
  lessons: number;
  xp: number;
  gems: number;
}) {
  return (
    <div className="mt-6 grid grid-cols-3 divide-x divide-border border-y border-border py-4">
      <StatTile label="Lessons" value={hydrated ? lessons : null} icon={Check} delay={0} />
      <StatTile label="Total XP" value={hydrated ? xp : null} icon={Star} delay={70} />
      <StatTile label="Gems" value={hydrated ? gems : null} icon={Gem} delay={140} />
    </div>
  );
}

/** `value` is null until the learner's real numbers have loaded. */
export function StatTile({
  label,
  value,
  icon: Icon,
  delay,
}: {
  label: string;
  value: number | null;
  icon: typeof Check;
  delay: number;
}) {
  return (
    <div className="animate-rise-in px-3 text-center" style={{ animationDelay: `${delay}ms` }}>
      <Icon aria-hidden="true" className="mx-auto h-4 w-4 text-primary-text" strokeWidth={2.2} />
      <p className="mt-1.5 text-xl font-extrabold">
        {value === null ? PENDING : <CountUp value={value} />}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
