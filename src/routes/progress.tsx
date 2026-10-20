import { createFileRoute, Link } from "@tanstack/react-router";
import { Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { BadgeShelf } from "@/components/BadgeShelf";
import { BeforeAfterTable } from "@/components/BeforeAfterTable";
import { DisclosureRow, LinkRow } from "@/components/DisclosureRow";
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
import { CURRICULUM_SLUG, UNITS } from "@/lib/curriculum";
import { useMasteryAnalytics } from "@/lib/mastery";
import { deriveInsights, shiftDay, useProgress, type Celebration } from "@/lib/progress";
import { calibrationLine, calibrationSummary, weekStrip, weekdayLetter } from "@/lib/progress-view";
import { useDueDrills } from "@/lib/review-drills";
import { checkLine, overallChange, useUnitChecks } from "@/lib/unit-checks";
import { useToday } from "@/lib/use-today";

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

function ProgressScreen() {
  const { state, streak, hydrated, doneLessons, clearCelebration, clearFreezeSaved } =
    useProgress();
  const [celebration, setCelebration] = useState<Celebration | null>(null);
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
  }, [state.celebration, clearCelebration]);

  // Read again at local midnight and on coming back, so "today" is never yesterday.
  const today = useToday();
  const insights = deriveInsights(state);
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
  // Lessons only: a review or a case keeps the streak, but it isn't a lesson.
  const week = Array.from({ length: 7 }, (_, i) => {
    const key = shiftDay(today, i - 6);
    return {
      key,
      label: mounted ? weekdayLetter(key) : "",
      count: mounted ? (state.lessonsByDay[key] ?? 0) : 0,
    };
  });
  const weekMax = Math.max(1, ...week.map((d) => d.count));
  const strip = mounted ? weekStrip(state, today) : [];

  const hasDrills = analytics?.units.some((unit) => unit.answered > 0) ?? false;
  const calibration = analytics ? calibrationSummary(analytics.calibration.bands) : null;
  const earned = badges?.filter((badge) => badge.tier).length ?? 0;
  const written = analytics?.written.points ?? [];
  const { checks } = useUnitChecks();
  const change = overallChange(checks);
  const checkedUnits = UNITS.filter((u) => checkLine(checks[u.id]) !== null);
  const latestWritten = written[written.length - 1];

  return (
    <PhoneFrame>
      <div className="relative px-5 pb-8">
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
            ? `You've practiced more in the last 7 days than in ${insights.percentile}% of your past weeks.`
            : hasDrills
              ? "What you have learned, and how sure you were."
              : "It fills in as you practice."}
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

        <SkillsCard units={analytics?.units ?? null} done={doneLessons} />

        {/* The last few stops of the map */}
        {nearMiss && (
          <Link to="/courses" className="sign mt-4 flex w-full items-center gap-3 p-4 text-left">
            <Target aria-hidden className="h-5 w-5 shrink-0 text-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">
                {nearMiss.left} lesson{nearMiss.left === 1 ? "" : "s"} left in {nearMiss.topic}
              </span>
              <span className="block text-xs text-muted-foreground">
                {nearMiss.completed} of {nearMiss.total} done.
              </span>
            </span>
          </Link>
        )}

        <div className="mt-5">
          {/* Before and after: does the skill carry over to things the lessons never showed? */}
          <DisclosureRow
            title="Before and after"
            summary={
              change.units > 0
                ? `Across ${change.units} unit${change.units === 1 ? "" : "s"}: ${change.before} of ${change.beforeTotal} right before, ${change.after} of ${change.afterTotal} after.`
                : checkedUnits.length > 0
                  ? "Your after-checks open as you finish each unit."
                  : "A three-question check before and after each unit shows whether the skills carry over."
            }
          >
            <p className="text-xs text-muted-foreground">
              Real-world questions none of the lessons use, different before and after, first answer
              only. Three months after a unit, its after-check comes back once more to see what
              stuck. Read a change as a rough signal, not a grade. Start one from a unit on My Path.
            </p>
            {checkedUnits.length > 0 && (
              <BeforeAfterTable units={checkedUnits} checks={checks} className="mt-3" />
            )}
          </DisclosureRow>

          <LinkRow
            to="/notes"
            title="Your notes"
            summary={
              lessonsDone > 0
                ? `The idea in full from ${lessonsDone} finished lesson${lessonsDone === 1 ? "" : "s"}.`
                : "The idea in full from each lesson, once you've finished it."
            }
          />

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

          {/* The last seven days (a rolling window, not the Monday week of the recap and league) */}
          <DisclosureRow
            title="Last 7 days"
            summary={
              hydrated
                ? `${insights.thisWeek} lesson${insights.thisWeek === 1 ? "" : "s"} finished.`
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
        <StatTiles
          hydrated={hydrated}
          lessons={lessonsDone}
          xp={state.xp}
          longestStreak={state.longestStreak}
        />
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
            <StreakFreezeCard freezes={state.freezes} />
            <TodaySession
              hydrated={hydrated}
              doneToday={insights.doneToday}
              dailyGoal={state.dailyGoal}
              dueTotal={dueTotal}
            />
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
      <span className="h-2 flex-1 overflow-hidden rounded-sm bg-muted">
        <span
          className={`block h-full ${tone === "primary" ? "bg-primary" : "bg-foreground/25"}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </span>
    </div>
  );
}
