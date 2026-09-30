import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Play, Star, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { skillsToPractise } from "@/lib/rating";
import { Button } from "@/components/ui/button";
import { CompanionAura } from "@/components/CompanionAura";
import { CompanionOffer } from "@/components/CompanionOffer";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ProgressRing } from "@/components/ProgressRing";
import { StreakFlame } from "@/components/StreakCalendar";
import { WeeklyRecapCard } from "@/components/WeeklyRecapCard";
import { hasSeenOnboarding, useCompanion } from "@/lib/companion-store";
import { useDailyChallenge } from "@/lib/challenge";
import {
  CURRICULUM_SLUG,
  CURRICULUM_TITLE,
  TOTAL_LESSONS,
  lessonAt,
  nextLessonIndex,
  unitById,
  unitProgress,
} from "@/lib/curriculum";
import { useCurriculumCourse } from "@/lib/curriculum-store";
import { dayKey, useProgress } from "@/lib/progress";
import { unitAccent } from "@/lib/unit-accent";
import {
  nextReviewLine,
  reviewUrgencyFor,
  useDrillSchedule,
  useDueDrills,
} from "@/lib/review-drills";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lamppost — train your critical thinking daily" },
      {
        name: "description",
        content:
          "Lamppost is a critical thinking trainer: seven units on claims, evidence, fallacies, biases, arguments, probability and media literacy.",
      },
      { property: "og:title", content: "Lamppost — train your critical thinking daily" },
      {
        property: "og:description",
        content:
          "Spot the flaw in everyday arguments, test your reasoning, and keep the habit going.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { state, streak, doneLessons, registerCourse } = useProgress();
  const { companion } = useCompanion();
  // Makes sure the curriculum exists locally with its lesson titles.
  useCurriculumCourse();

  // First run: introduce the app. Nothing renders until that check has run, so a new
  // visitor never sees home flash first.
  const [gate, setGate] = useState<"checking" | "open">("checking");
  useEffect(() => {
    if (!hasSeenOnboarding()) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    setGate("open");
  }, [navigate]);

  useEffect(() => {
    registerCourse(CURRICULUM_SLUG, CURRICULUM_TITLE, TOTAL_LESSONS);
  }, [registerCourse]);

  const lessonsDone = doneLessons.size;
  const { items: dueItems, total: dueTotal } = useDueDrills();
  const { items: scheduled } = useDrillSchedule();
  const { challenge, doneToday: challengeDone } = useDailyChallenge(doneLessons);

  const maxOverdue = dueItems[0]?.overdueDays ?? 0;
  const urgency = reviewUrgencyFor(dueTotal, maxOverdue);

  const doneToday = state.history[dayKey()] ?? 0;
  const goalPct = Math.min(100, Math.round((doneToday / Math.max(state.dailyGoal, 1)) * 100));
  // The counters wait for the first lesson: before it they would only be zeros.
  const started = lessonsDone > 0 || state.xp > 0 || streak > 0;

  // One-line reason for the recommendation, from the learner's own drill history.
  const [recommendation, setRecommendation] = useState<{ reason: string } | null>(null);
  useEffect(() => {
    const top = skillsToPractise(doneLessons)[0];
    setRecommendation(top ? { reason: top.reason } : null);
  }, [doneLessons]);

  const nextIndex = nextLessonIndex(doneLessons);
  const next = lessonAt(nextIndex);
  const finished = lessonsDone >= TOTAL_LESSONS;
  const unit = unitById(next?.unitId ?? "claims");
  const accent = unitAccent(unit.id);
  const minutes = Math.max(5, (next?.drills.length ?? 4) * 2);

  const units = useMemo(() => unitProgress(doneLessons), [doneLessons]);
  const here = units.find((u) => u.state === "current") ?? units.find((u) => u.state === "open");
  const where = here ?? units[units.length - 1]!;

  if (gate === "checking") {
    return (
      <PhoneFrame showNav={false}>
        <div className="min-h-full" aria-busy="true" />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div className="min-h-full px-5 pb-10">
        {/* Header: who you are, and how you're doing once there is something to show */}
        <header className="flex items-center gap-3 pt-6">
          <Link to="/profile" aria-label="Open profile" className="shrink-0">
            <CompanionAura
              companion={{ ...companion, expression: urgency === "piling" ? "calm" : "happy" }}
              streak={streak}
              size={46}
            />
          </Link>

          {started && (
            <>
              <Link
                to="/progress"
                className="flex items-center gap-1.5 rounded-full px-1 py-1"
                aria-label={`${streak} day streak`}
              >
                <StreakFlame streak={streak} />
                <span className="text-base font-bold text-foreground">{streak}</span>
              </Link>

              <span className="flex items-center gap-1 text-sm font-bold text-foreground">
                <Star aria-hidden className="h-4 w-4 text-xp" />
                {state.xp.toLocaleString()}
              </span>

              <span className="ml-auto shrink-0">
                <ProgressRing pct={goalPct} size={44} stroke={5}>
                  <span className="text-[11px] font-bold text-foreground">
                    {Math.min(doneToday, state.dailyGoal)}/{state.dailyGoal}
                  </span>
                </ProgressRing>
              </span>
            </>
          )}
        </header>

        {/* The main action, unmissable and in this unit's colour */}
        <section
          className="mt-5 rounded-3xl border p-5"
          style={{ background: accent.wash, borderColor: accent.border }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-wide"
            style={{ color: accent.color }}
          >
            {finished ? "Curriculum complete" : `Up next · ${unit.title}`}
          </p>
          <h1 className="mt-1.5 text-2xl leading-tight">{next?.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{next?.objective}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            about {minutes} min · lesson {nextIndex + 1} of {TOTAL_LESSONS}
            {recommendation ? ` · ${recommendation.reason}` : ""}
          </p>
          <Button
            type="button"
            onClick={() =>
              navigate({
                to: "/course/$slug/lesson/$index",
                params: { slug: CURRICULUM_SLUG, index: String(nextIndex + 1) },
              })
            }
            className="mt-4 h-12 w-full rounded-full text-base font-semibold"
            style={{ background: accent.color, color: "var(--background)" }}
          >
            <Play aria-hidden className="h-4 w-4" />
            {finished ? "Practise again" : "Start lesson"}
          </Button>
        </section>

        <CompanionOffer lessonsDone={lessonsDone} />

        {/* Reviews: a card when something is due, one quiet line when something is scheduled */}
        {dueTotal > 0 ? (
          <button
            type="button"
            onClick={() => navigate({ to: "/review" })}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left"
          >
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-bold text-primary-text"
            >
              {dueTotal}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">Today's review</span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                {urgency === "piling"
                  ? `Oldest is ${maxOverdue} days overdue.`
                  : "New scenarios, same skills."}
              </span>
            </span>
            <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ) : (
          scheduled.length > 0 && (
            <Link
              to="/schedule"
              className="mt-3 flex min-h-11 items-center gap-2 px-1 text-[13px] font-semibold text-muted-foreground"
            >
              <Check aria-hidden className="h-4 w-4 text-success" />
              No reviews due. {nextReviewLine(scheduled)}
            </Link>
          )
        )}

        {/* Daily challenge */}
        {challenge && (
          <button
            type="button"
            onClick={() => navigate({ to: "/challenge" })}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left"
          >
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-xp/15"
            >
              <Zap className="h-5 w-5 text-xp" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">Daily challenge</span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                {challengeDone
                  ? "Done for today. A new one lands tomorrow."
                  : `One drill from ${challenge.unitTitle}. Counts toward your streak.`}
              </span>
            </span>
            {!challengeDone && (
              <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        )}

        <WeeklyRecapCard className="mt-3" />

        {/* The seven units as one strip; the path itself lives under My Path */}
        <section className="mt-6 border-t border-border pt-5" aria-labelledby="path-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="path-heading" className="text-lg">
              Your path
            </h2>
            <Link
              to="/courses"
              className="flex min-h-11 items-center text-[13px] font-bold text-primary-text"
            >
              Open
            </Link>
          </div>
          <div aria-hidden className="mt-1 flex gap-1.5">
            {units.map((u) => (
              <span key={u.unit.id} className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{
                    width: `${u.state === "current" ? Math.max(u.pct, 35) : u.pct}%`,
                    opacity: u.state === "current" ? 0.55 : 1,
                  }}
                />
              </span>
            ))}
          </div>
          <p className="mt-2 text-[13px] font-semibold text-muted-foreground">
            Unit {where.index + 1} of {units.length} · {where.unit.title} · {where.completed} of{" "}
            {where.total} lessons
          </p>
        </section>
      </div>
    </PhoneFrame>
  );
}
