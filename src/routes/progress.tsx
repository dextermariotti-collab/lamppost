import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  Clock,
  Flame,
  Gem,
  GraduationCap,
  Snowflake,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StreakCalendar, StreakFlame } from "@/components/StreakCalendar";
import { StreakSavedCard } from "@/components/StreakSavedCard";
import { BadgeShelf } from "@/components/BadgeShelf";
import { useBadges } from "@/lib/badges";
import { unitLevels } from "@/lib/levels";
import { useCompanion } from "@/lib/companion-store";
import { Confetti } from "@/components/Confetti";
import { CountUp } from "@/components/CountUp";
import { MilestoneCard } from "@/components/MilestoneCard";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ProgressRing } from "@/components/ProgressRing";
import { StreakFreezeCard } from "@/components/StreakFreezeCard";
import { CURRICULUM_SLUG } from "@/lib/curriculum";
import { useMasteryAnalytics } from "@/lib/mastery";
import { useDueDrills } from "@/lib/review-drills";
import { dayKey, deriveInsights, tierFor, useProgress, type Celebration } from "@/lib/progress";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Your Progress — Lamppost" },
      {
        name: "description",
        content:
          "Streaks, mastery tiers and daily session wins — see your Lamppost momentum come alive.",
      },
      { property: "og:title", content: "Your Progress — Lamppost" },
      { property: "og:description", content: "Streaks, mastery tiers and today's session wins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/progress" }],
  }),
  component: ProgressScreen,
});

const WEEK_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function ProgressScreen() {
  const { state, hydrated, clearCelebration, buyFreeze, clearFreezeSaved } = useProgress();
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [burst, setBurst] = useState(false);
  const analytics = useMasteryAnalytics();
  const badges = useBadges(state);
  const { companion } = useCompanion();
  const levels = useMemo(() => (analytics ? unitLevels() : []), [analytics]);

  // Consume any queued celebration from a just-finished lesson or quiz.
  useEffect(() => {
    if (!state.celebration) return;
    const next = state.celebration;
    clearCelebration();
    if (next.big) {
      setCelebration(next);
      return;
    }
    setBurst(true);
    const t = setTimeout(() => setBurst(false), 1400);
    return () => clearTimeout(t);
  }, [state.celebration, clearCelebration]);

  const insights = useMemo(() => deriveInsights(state), [state]);
  const { total: dueTotal } = useDueDrills();
  const courses = Object.entries(state.courses);
  // One source of truth: the curriculum's own completed count, the same number
  // My Path and Home read (placement-unlocked lessons included).
  const lessonsDone = state.courses[CURRICULUM_SLUG]?.completed ?? 0;
  const sessionPct = Math.min(100, Math.round((insights.doneToday / state.dailyGoal) * 100));
  const sessionDone = insights.doneToday >= state.dailyGoal;

  const nearMiss = courses
    .map(([slug, c]) => ({
      slug,
      ...c,
      pct: c.total ? Math.round((c.completed / c.total) * 100) : 0,
      left: Math.max(0, c.total - c.completed),
    }))
    .filter((c) => c.pct >= 60 && c.left > 0 && c.left <= 2)
    .sort((a, b) => b.pct - a.pct)[0];

  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return {
      key: dayKey(d),
      label: WEEK_LABELS[d.getDay()]!,
      count: state.history[dayKey(d)] ?? 0,
    };
  });
  const weekMax = Math.max(1, ...week.map((d) => d.count));

  const flameIntensity = Math.min(1, state.streak / 30);

  return (
    <PhoneFrame>
      <div className="relative px-5 pb-8">
        {burst && <Confetti />}
        {celebration && (
          <MilestoneCard
            celebration={celebration}
            streak={state.streak}
            onClose={() => setCelebration(null)}
          />
        )}

        <h1 className="pt-4 text-3xl">Your momentum</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {insights.percentile !== null
            ? `You've reviewed more this week than ${insights.percentile}% of your past weeks.`
            : "Small steps, compounding daily."}
        </p>

        {/* Streak — one quiet pool of lamplight, nothing else shouting */}
        <section className="relative mt-7 animate-rise-in">
          <span
            aria-hidden="true"
            className="lamplight-glow absolute -top-8 -left-6 -z-10 h-40 w-40 rounded-full"
            style={{ opacity: insights.atRisk ? 0.35 : 0.75 + flameIntensity * 0.25 }}
          />
          <div className="flex items-end gap-3">
            <span className="mb-2">
              <StreakFlame streak={insights.atRisk ? 0 : state.streak} size={28} />
            </span>
            <p className="font-display text-[3.5rem] leading-none font-extrabold">
              <CountUp value={state.streak} duration={900} />
            </p>
            <p className="mb-2 text-sm font-semibold text-foreground">day streak</p>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Trophy className="h-3.5 w-3.5" /> Longest {state.longestStreak} days
          </p>
          {insights.atRisk && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-flame">
              <Clock className="h-3.5 w-3.5" /> {insights.hoursLeft}h left to keep it alive
            </p>
          )}
        </section>

        {state.freezeSaved && (
          <StreakSavedCard
            days={state.freezeSaved.days}
            streak={state.streak}
            freezesLeft={state.freezes}
            companion={companion}
            onClose={clearFreezeSaved}
          />
        )}

        {/* Four weeks of real practice */}
        <section className="mt-6 border-t border-border pt-5">
          <h2 className="text-base">Your last four weeks</h2>
          <div className="mt-3">
            <StreakCalendar state={state} />
          </div>
        </section>

        <StreakFreezeCard freezes={state.freezes} gems={state.gems} onBuy={buyFreeze} />

        {/* Today's session */}
        <section
          className="mt-6 flex animate-rise-in items-center gap-5 border-t border-border pt-5"
          style={{ animationDelay: "80ms" }}
        >
          <ProgressRing pct={sessionPct} size={104} stroke={10}>
            <span className="text-2xl font-extrabold">
              <CountUp value={insights.doneToday} duration={800} />

              <span className="text-sm text-muted-foreground">/{state.dailyGoal}</span>
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">today</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <h2 className="text-base">Today's session</h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {sessionDone
                ? "Session complete. The streak is safe."
                : `${state.dailyGoal - insights.doneToday} more lesson${
                    state.dailyGoal - insights.doneToday === 1 ? "" : "s"
                  } to close today out.`}
            </p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {dueTotal === 0
                ? "Nothing due for review today."
                : `${dueTotal} drill${dueTotal === 1 ? "" : "s"} due for review.`}
            </p>
            {sessionDone && (
              <span className="mt-2 inline-flex animate-pop-in items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-extrabold text-success">
                <Sparkles className="h-3.5 w-3.5" /> Daily goal cleared
              </span>
            )}
          </div>
        </section>

        {/* Near-miss pull */}
        {nearMiss && (
          <Link
            to="/course/$slug"
            params={{ slug: nearMiss.slug }}
            className="mt-4 flex w-full animate-rise-in items-center gap-3 rounded-3xl border-2 border-primary/30 bg-primary-soft p-4 text-left shadow-soft transition-transform hover:-translate-y-0.5"
            style={{ animationDelay: "120ms" }}
          >
            <Target className="h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-accent-foreground">
                {nearMiss.left} more lesson{nearMiss.left === 1 ? "" : "s"} to master{" "}
                {nearMiss.topic}
              </span>
              <span className="block text-xs font-semibold text-muted-foreground">
                You're at {nearMiss.pct}% — closer than it feels.
              </span>
            </span>
          </Link>
        )}

        {/* Stats — unboxed, hairline-separated, quiet */}
        <div className="mt-6 grid grid-cols-3 divide-x divide-border border-y border-border py-4">
          <Tile label="Lessons" value={lessonsDone} icon={Check} delay={0} />
          <Tile label="Total XP" value={state.xp} icon={Star} delay={70} />
          <Tile label="Gems" value={state.gems} icon={Gem} delay={140} />

        </div>

        {/* Per-skill mastery, from real drill accuracy */}
        <h2 className="mt-6 text-base">Skill mastery</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          How often you get each unit's drills right — not how many lessons you've opened.
        </p>
        {!analytics || analytics.units.every((unit) => unit.answered === 0) ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Answer some drills and each skill's accuracy appears here.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {analytics.units.map((unit, i) => {
              const pct = Math.round(unit.accuracy * 100);
              const tier = tierFor(pct);
              return (
                <li
                  key={unit.unitId}
                  className="animate-rise-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-bold">
                      <span aria-hidden className="mr-1.5">
                        {unit.emoji}
                      </span>
                      {unit.title}
                    </p>
                    <p className="shrink-0 text-[11px] font-bold text-muted-foreground">
                      {unit.answered === 0
                        ? "not started"
                        : `${pct}% · ${levels.find((l) => l.unitId === unit.unitId)?.level.name ?? tier.name}`}
                    </p>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-hero-gradient"
                      style={{
                        width: `${hydrated && unit.answered > 0 ? pct : 0}%`,
                        transition: "width 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {unit.answered} drill{unit.answered === 1 ? "" : "s"} answered
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {/* Achievements: named tiers, honest thresholds */}
        <div className="mt-6 border-t border-border pt-5">
          <h2 className="text-base">Achievements</h2>
          <BadgeShelf badges={badges ?? []} />
        </div>

        {/* Calibration: stated confidence vs what actually happened */}
        <div className="mt-6 border-t border-border pt-5">
          <h2 className="text-base">Calibration</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            From predict-then-reveal drills: how confident you said you were, against how often you
            were right.
          </p>
          {!analytics || analytics.calibration.bands.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Not enough predictions yet. Set a confidence level on a few predict drills and this
              chart fills in.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {analytics.calibration.bands.map((band) => (
                <li key={band.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs font-bold">Said {band.label}</p>
                    <p className="text-[11px] font-bold text-muted-foreground">
                      {band.actual}% right · {band.count} drill{band.count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <Bar pct={band.stated} tone="muted" label="stated" />
                    <Bar pct={band.actual} tone="primary" label="actual" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Written response trend */}
        <div className="mt-6 border-t border-border pt-5">
          <h2 className="text-base">Written responses</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Your rubric score on each graded written task, oldest to newest.
          </p>
          {!analytics || analytics.written.points.length < 2 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {analytics && analytics.written.points.length === 1
                ? "One graded response so far. One more and the trend appears."
                : "No graded written responses yet."}
            </p>
          ) : (
            <>
              <div className="mt-4 flex items-end gap-1.5">
                {analytics.written.points.slice(-12).map((point, i) => (
                  <div key={`${point.at}-${i}`} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-lg bg-hero-gradient"
                      style={{
                        height: `${12 + Math.round((point.pct / 100) * 68)}px`,
                        transition: `height 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${i * 50}ms`,
                      }}
                    />
                    <span className="text-[10px] font-bold text-muted-foreground">{point.pct}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Latest {analytics.written.points[analytics.written.points.length - 1]!.pct}% of the
                rubric.
              </p>
            </>
          )}
        </div>

        {/* Week */}
        <div className="mt-6 border-t border-border pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base">This week</h2>
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> {insights.thisWeek} lessons
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-2">
            {week.map((day, i) => {
              const height = 12 + Math.round((day.count / weekMax) * 68);
              const isToday = i === week.length - 1;
              return (
                <div key={day.key} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className={`w-full rounded-t-xl ${
                      day.count > 0 ? "bg-hero-gradient" : "bg-muted"
                    } ${isToday && day.count > 0 ? "shadow-soft" : ""}`}
                    style={{
                      height: `${hydrated ? height : 12}px`,
                      transition: `height 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${i * 60}ms`,
                    }}
                  />
                  <span
                    className={`text-[11px] font-bold ${
                      isToday ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function Tile({
  label,
  value,
  icon: Icon,
  delay,
}: {
  label: string;
  value: number;
  icon: typeof Check;
  delay: number;
}) {
  return (
    <div className="animate-rise-in px-3 text-center" style={{ animationDelay: `${delay}ms` }}>
      <Icon aria-hidden="true" className="mx-auto h-4 w-4 text-primary" strokeWidth={2.2} />
      <p className="mt-1.5 text-xl font-extrabold">
        <CountUp value={value} />
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

/** Two-tone bar used by the calibration chart. */
function Bar({ pct, tone, label }: { pct: number; tone: "primary" | "muted"; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-11 text-[10px] font-bold text-muted-foreground">{label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className={`block h-full rounded-full ${tone === "primary" ? "bg-primary" : "bg-foreground/25"}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </span>
    </div>
  );
}
