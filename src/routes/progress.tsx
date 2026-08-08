import { createFileRoute } from "@tanstack/react-router";
import { Clock, Flame, Sparkles, Target, TrendingUp, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { CountUp } from "@/components/CountUp";
import { MilestoneCard } from "@/components/MilestoneCard";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ProgressRing } from "@/components/ProgressRing";
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
  const { state, hydrated, clearCelebration } = useProgress();
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [burst, setBurst] = useState(false);

  // Consume any queued celebration from a just-finished lesson or quiz.
  useEffect(() => {
    if (!state.celebration) return;
    const next = state.celebration;
    clearCelebration();
    if (next.big) setCelebration(next);
    else {
      setBurst(true);
      const t = setTimeout(() => setBurst(false), 1400);
      return () => clearTimeout(t);
    }
  }, [state.celebration, clearCelebration]);

  const insights = useMemo(() => deriveInsights(state), [state]);
  const courses = Object.entries(state.courses);
  const lessonsDone = courses.reduce((sum, [, c]) => sum + c.completed, 0);
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
    return { key: dayKey(d), label: WEEK_LABELS[d.getDay()]!, count: state.history[dayKey(d)] ?? 0 };
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

        {/* Streak — loss aversion */}
        <section
          className={`relative mt-5 animate-rise-in overflow-hidden rounded-3xl p-5 shadow-card transition-colors ${
            insights.atRisk ? "bg-card" : "bg-hero-gradient text-primary-foreground"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
              <span
                aria-hidden
                className={`absolute inset-0 rounded-full bg-flame ${
                  insights.atRisk ? "opacity-10" : "animate-glow-pulse"
                }`}
                style={{ opacity: insights.atRisk ? 0.1 : 0.25 + flameIntensity * 0.4 }}
              />
              <Flame
                className={`relative h-11 w-11 ${insights.atRisk ? "animate-none text-muted-foreground" : "animate-flame text-flame"}`}
                style={{ opacity: insights.atRisk ? 0.55 : 0.7 + flameIntensity * 0.3 }}
                strokeWidth={2.4}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-4xl leading-none font-extrabold ${insights.atRisk ? "" : ""}`}
              >
                <CountUp value={hydrated ? state.streak : 0} duration={900} />
                <span className="ml-1 text-base font-bold opacity-80">day streak</span>
              </p>
              <p
                className={`mt-2 flex items-center gap-1.5 text-xs font-bold ${
                  insights.atRisk ? "text-muted-foreground" : "opacity-85"
                }`}
              >
                <Trophy className="h-3.5 w-3.5" /> Longest: {state.longestStreak} days
              </p>
              {insights.atRisk && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-flame/12 px-2.5 py-1 text-[11px] font-extrabold text-flame">
                  <Clock className="h-3.5 w-3.5" /> {insights.hoursLeft}h left to keep it alive
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Today's session */}
        <section
          className="mt-4 flex animate-rise-in items-center gap-5 rounded-3xl bg-card p-5 shadow-soft"
          style={{ animationDelay: "80ms" }}
        >
          <ProgressRing pct={hydrated ? sessionPct : 0} size={104} stroke={10}>
            <span className="text-2xl font-extrabold">
              <CountUp value={hydrated ? insights.doneToday : 0} duration={800} />
              <span className="text-sm text-muted-foreground">/{state.dailyGoal}</span>
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">today</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <h2 className="text-base">Today's session</h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {sessionDone
                ? "Session complete. The streak is safe."
                : `${state.dailyGoal - insights.doneToday} more review${
                    state.dailyGoal - insights.doneToday === 1 ? "" : "s"
                  } to close today out.`}
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
          <button
            onClick={() => setCelebration(null)}
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
          </button>
        )}

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Tile label="Lessons" value={hydrated ? lessonsDone : 0} emoji="✅" delay={0} />
          <Tile label="Total XP" value={hydrated ? state.xp : 0} emoji="⭐" delay={70} />
          <Tile label="Gems" value={hydrated ? state.gems : 0} emoji="💎" delay={140} />
        </div>

        {/* Mastery tiers */}
        <h2 className="mt-6 text-base">Mastery</h2>
        {courses.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Start a course and your mastery tiers appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {courses.map(([slug, c], i) => {
              const pct = c.total ? Math.round((c.completed / c.total) * 100) : 0;
              const tier = tierFor(pct);
              return (
                <li
                  key={slug}
                  className="animate-rise-in rounded-3xl bg-card p-4 shadow-soft"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-xl ${
                        pct === 100 ? "animate-pop-in" : ""
                      }`}
                    >
                      {tier.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{c.topic}</span>
                      <span className="block text-[11px] font-extrabold tracking-wide text-primary uppercase">
                        {tier.name}
                      </span>
                    </span>
                    <CountUp
                      value={hydrated ? pct : 0}
                      className="text-sm font-extrabold text-muted-foreground"
                      format={(n) => `${n}%`}
                    />
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-hero-gradient"
                      style={{
                        width: `${hydrated ? pct : 0}%`,
                        transition: "width 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Week */}
        <div className="mt-5 rounded-3xl bg-card p-5 shadow-soft">
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
  emoji,
  delay,
}: {
  label: string;
  value: number;
  emoji: string;
  delay: number;
}) {
  return (
    <div
      className="animate-rise-in rounded-3xl bg-card p-4 shadow-soft"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span aria-hidden className="text-xl">
        {emoji}
      </span>
      <p className="mt-1.5 text-xl font-extrabold">
        <CountUp value={value} />
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
