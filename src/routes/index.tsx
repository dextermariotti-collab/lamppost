import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Expand, Play, Star, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { skillsToPractise } from "@/lib/rating";
import { Button } from "@/components/ui/button";
import { CompanionAura } from "@/components/CompanionAura";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ProgressRing } from "@/components/ProgressRing";
import { StreakFlame } from "@/components/StreakCalendar";
import { ThinkingGraph } from "@/components/ThinkingGraph";
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
} from "@/lib/curriculum";
import { useCurriculumCourse } from "@/lib/curriculum-store";
import { dayKey, useProgress } from "@/lib/progress";
import { unitAccent } from "@/lib/unit-accent";
import { reviewUrgencyFor, useDueDrills } from "@/lib/review-drills";

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
  const { state, streak, registerCourse } = useProgress();
  const { companion } = useCompanion();
  // Makes sure the curriculum exists locally with its lesson titles.
  useCurriculumCourse();

  // First run: introduce the app and let them pick a companion. Nothing renders
  // until that check has run, so a new visitor never sees home flash first.
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

  const completed = state.courses[CURRICULUM_SLUG]?.completed ?? 0;
  const { items: dueItems, total: dueTotal } = useDueDrills();
  const { challenge, doneToday: challengeDone } = useDailyChallenge(completed);
  const [mapOpen, setMapOpen] = useState(false);

  const maxOverdue = dueItems[0]?.overdueDays ?? 0;
  const urgency = reviewUrgencyFor(dueTotal, maxOverdue);

  const doneToday = state.history[dayKey()] ?? 0;
  const goalPct = Math.min(100, Math.round((doneToday / Math.max(state.dailyGoal, 1)) * 100));

  // One-line reason for the recommendation, from the learner's own drill history.
  const [recommendation, setRecommendation] = useState<{ reason: string } | null>(null);
  useEffect(() => {
    const top = skillsToPractise(completed)[0];
    setRecommendation(top ? { reason: top.reason } : null);
  }, [completed]);

  const nextIndex = nextLessonIndex(completed);
  const next = lessonAt(nextIndex);
  const finished = completed >= TOTAL_LESSONS;
  const unit = unitById(next?.unitId ?? "claims");
  const accent = unitAccent(unit.id);
  const minutes = Math.max(5, (next?.drills.length ?? 4) * 2);

  if (gate === "checking") {
    return (
      <PhoneFrame className="graph-home" showNav={false}>
        <div className="min-h-full" aria-busy="true" />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame className="graph-home">
      <div className="min-h-full px-5 pb-10">
        {/* Header: who you are, how you're doing today */}
        <header className="flex items-center gap-3 pt-6">
          <Link to="/profile" aria-label="Open profile" className="shrink-0">
            <CompanionAura
              companion={{ ...companion, expression: urgency === "piling" ? "calm" : "happy" }}
              streak={streak}
              size={46}
            />
          </Link>

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
            {finished ? "Curriculum complete" : `${unit.emoji} ${unit.title}`}
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

        {/* Today's review */}
        <button
          type="button"
          onClick={() => navigate({ to: dueTotal === 0 ? "/schedule" : "/review" })}
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
              {dueTotal === 0
                ? "Nothing due. Every drill is sitting comfortably."
                : urgency === "piling"
                  ? `Oldest is ${maxOverdue} days overdue.`
                  : "New scenarios, same skills."}
            </span>
          </span>
          <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        <WeeklyRecapCard className="mt-3" />

        {/* The map sits below the action, as a preview you can open full screen */}
        <section className="mt-6 border-t border-border pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Your thinking map</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Seven reasoning skills, and the ideas they share.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMapOpen(true)}
              className="shrink-0 gap-1.5 text-xs font-bold text-muted-foreground"
            >
              <Expand aria-hidden className="h-3.5 w-3.5" /> Expand
            </Button>
          </div>

          <div className="mt-3">
            <ThinkingGraph completed={completed} compact />
          </div>
        </section>
      </div>

      {mapOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-background px-5 pb-10">
          <div className="mx-auto max-w-[600px]">
            <div className="flex items-center justify-between gap-3 pt-6">
              <h2 className="text-lg font-bold">Your thinking map</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close map"
                onClick={() => setMapOpen(false)}
                className="h-11 w-11 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <ThinkingGraph completed={completed} />
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}
