import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Target, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BadgeShelf } from "@/components/BadgeShelf";
import { Confetti } from "@/components/Confetti";
import { DisclosureRow } from "@/components/DisclosureRow";
import { MilestoneCard } from "@/components/MilestoneCard";
import { PhoneFrame } from "@/components/PhoneFrame";
import { StatTiles, TodaySession } from "@/components/ProgressSummary";
import { SkillsCard } from "@/components/SkillsCard";
import { StreakCalendar } from "@/components/StreakCalendar";
import { StreakFreezeCard } from "@/components/StreakFreezeCard";
import { StreakSavedCard } from "@/components/StreakSavedCard";
import { StreakStrip } from "@/components/StreakStrip";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useBadges } from "@/lib/badges";
import { useCompanion } from "@/lib/companion-store";
import { CURRICULUM_SLUG } from "@/lib/curriculum";
import { useMasteryAnalytics } from "@/lib/mastery";
import { dayKey, deriveInsights, useProgress, type Celebration } from "@/lib/progress";
import { calibrationLine, calibrationSummary, weekStrip } from "@/lib/progress-view";
import { useDueDrills } from "@/lib/review-drills";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Lamppost" },
      {
        name: "description",
        content:
          "How well each critical-thinking skill is going, how well your confidence matched what happened, and your streak.",
      },
      { property: "og:title", content: "Progress — Lamppost" },
      { property: "og:description", content: "Skill accuracy, calibration and your streak." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/progress" }],
  }),
  component: ProgressScreen,
});

const WEEK_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function ProgressScreen() {
  const { state, streak, hydrated, clearCelebration, buyFreeze, clearFreezeSaved } = useProgress();
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [burst, setBurst] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const analytics = useMasteryAnalytics();
  const badges = useBadges(state);
  const { companion } = useCompanion();

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

  const nearMiss = courses
    .map(([slug, c]) => ({
      slug,
      ...c,
      pct: c.total ? Math.round((c.completed / c.total) * 100) : 0,
      left: Math.max(0, c.total - c.completed),
    }))
    .filter((c) => c.pct >= 60 && c.left > 0 && c.left <= 2)
    .sort((a, b) => b.pct - a.pct)[0];

  // Local-day labels are only known in the browser; render them after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return {
      key: dayKey(d),
      label: mounted ? WEEK_LABELS[d.getDay()]! : "",
      count: mounted ? (state.history[dayKey(d)] ?? 0) : 0,
    };
  });
  const weekMax = Math.max(1, ...week.map((d) => d.count));
  const strip = mounted ? weekStrip(state, dayKey()) : [];

  const hasDrills = analytics?.units.some((unit) => unit.answered > 0) ?? false;
  const calibration = analytics ? calibrationSummary(analytics.calibration.bands) : null;
  const earned = badges?.filter((badge) => badge.tier).length ?? 0;
  const written = analytics?.written.points ?? [];
  const latestWritten = written[written.length - 1];

  return (
    <PhoneFrame>
      <div className="relative px-5 pb-8">
        {burst && <Confetti />}
        {celebration && (
          <MilestoneCard
            celebration={celebration}
            streak={streak}
            onClose={() => setCelebration(null)}
          />
        )}

        <h1 className="pt-4 text-3xl">Progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {insights.percentile !== null
            ? `You've reviewed more this week than ${insights.percentile}% of your past weeks.`
            : hasDrills
              ? "What you have learned, and how sure you were."
              : "It fills in as you practise."}
        </p>

        {state.freezeSaved && (
          <StreakSavedCard
            days={state.freezeSaved.days}
            streak={streak}
            freezesLeft={state.freezes}
            companion={companion}
            onClose={clearFreezeSaved}
          />
        )}

        <StreakStrip
          hydrated={hydrated}
          streak={streak}
          longestStreak={state.longestStreak}
          atRisk={insights.atRisk}
          days={strip}
          onOpen={() => setSheetOpen(true)}
        />

        <SkillsCard units={analytics?.units ?? null} completed={lessonsDone} />

        {/* Near-miss pull */}
        {nearMiss && (
          <Link
            to="/course/$slug"
            params={{ slug: nearMiss.slug }}
            className="mt-4 flex w-full animate-rise-in items-center gap-3 rounded-3xl border-2 border-primary/30 bg-primary-soft p-4 text-left shadow-soft transition-transform hover:-translate-y-0.5"
            style={{ animationDelay: "120ms" }}
          >
            <Target className="h-5 w-5 shrink-0 text-primary-text" />
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

        <div className="mt-5">
          {/* Calibration: stated confidence vs what actually happened */}
          <DisclosureRow
            title="Calibration"
            summary={
              !analytics
                ? ""
                : calibration
                  ? calibrationLine(calibration)
                  : "Needs a few predict-then-reveal drills."
            }
          >
            <p className="text-xs text-muted-foreground">
              From predict-then-reveal drills: how confident you said you were, against how often
              you were right.
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
          </DisclosureRow>

          {/* Achievements: named tiers, honest thresholds */}
          <DisclosureRow
            title="Achievements"
            summary={
              !badges
                ? ""
                : earned === 0
                  ? "None earned yet. Each one shows exactly what it asks for."
                  : `${earned} of ${badges.length} earned.`
            }
          >
            <BadgeShelf badges={badges ?? []} />
          </DisclosureRow>

          {/* Written response trend */}
          <DisclosureRow
            title="Written responses"
            summary={
              !analytics
                ? ""
                : written.length === 0
                  ? "No graded responses yet."
                  : written.length === 1
                    ? "One graded response so far."
                    : `Latest ${latestWritten!.pct}% of the rubric.`
            }
          >
            <p className="text-xs text-muted-foreground">
              Your rubric score on each graded written task, oldest to newest.
            </p>
            {written.length < 2 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {written.length === 1
                  ? "One graded response so far. One more and the trend appears."
                  : "No graded written responses yet."}
              </p>
            ) : (
              <>
                <div className="mt-4 flex items-end gap-1.5">
                  {written.slice(-12).map((point, i) => (
                    <div
                      key={`${point.at}-${i}`}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <div
                        className="w-full rounded-t-lg bg-primary"
                        style={{
                          height: `${12 + Math.round((point.pct / 100) * 68)}px`,
                          transition: `height 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${i * 50}ms`,
                        }}
                      />
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {point.pct}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Latest {latestWritten!.pct}% of the rubric.
                </p>
              </>
            )}
          </DisclosureRow>

          {/* Week */}
          <DisclosureRow
            title="This week"
            summary={
              hydrated
                ? `${insights.thisWeek} lesson${insights.thisWeek === 1 ? "" : "s"} in the last seven days.`
                : ""
            }
          >
            <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <TrendingUp aria-hidden className="h-3.5 w-3.5" /> Lessons finished each day
            </p>
            <div className="mt-4 flex items-end justify-between gap-2">
              {week.map((day, i) => {
                const height = 12 + Math.round((day.count / weekMax) * 68);
                const isToday = i === week.length - 1;
                return (
                  <div key={day.key} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className={`w-full rounded-t-xl ${day.count > 0 ? "bg-primary" : "bg-muted"}`}
                      style={{
                        height: `${height}px`,
                        transition: `height 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${i * 60}ms`,
                      }}
                    />
                    <span
                      className={`text-[11px] font-bold ${
                        isToday ? "text-primary-text" : "text-muted-foreground"
                      }`}
                    >
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </DisclosureRow>
        </div>

        {/* Stats — unboxed, hairline-separated, quiet */}
        <StatTiles hydrated={hydrated} lessons={lessonsDone} xp={state.xp} gems={state.gems} />
      </div>

      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent className="mx-auto max-h-[88dvh] max-w-[440px]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{hydrated ? `${streak} day streak` : "Streak"}</DrawerTitle>
            <DrawerDescription>
              {hydrated ? `Longest ${state.longestStreak} days.` : ""}
            </DrawerDescription>
          </DrawerHeader>
          <div data-vaul-no-drag className="overflow-y-auto px-5 pb-8">
            <StreakCalendar state={state} />
            <StreakFreezeCard freezes={state.freezes} gems={state.gems} onBuy={buyFreeze} />
            <TodaySession
              hydrated={hydrated}
              doneToday={insights.doneToday}
              dailyGoal={state.dailyGoal}
              dueTotal={dueTotal}
            />
            <Link
              to="/rewards"
              onClick={() => setSheetOpen(false)}
              className="mt-5 flex min-h-11 items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
            >
              <span>Rewards: chests, hint tokens and cosmetics</span>
              <ArrowRight aria-hidden className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </DrawerContent>
      </Drawer>
    </PhoneFrame>
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
