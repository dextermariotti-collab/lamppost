import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Flame, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { skillsToPractise } from "@/lib/rating";
import { Button } from "@/components/ui/button";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ProgressRing } from "@/components/ProgressRing";
import { ThinkingGraph } from "@/components/ThinkingGraph";
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
        content: "Spot the flaw in real arguments, test your reasoning, and keep the habit going.",
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
  const { state, registerCourse } = useProgress();
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

  if (gate === "checking") {
    return (
      <PhoneFrame className="graph-home" showNav={false}>
        <div className="min-h-full" aria-busy="true" />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame className="graph-home">
      <main className="min-h-full px-5 pb-10">
        <header className="flex items-start justify-between gap-4 pt-7">
          <div>
            <h1 className="max-w-56 text-lg font-bold leading-snug">Your thinking map</h1>
            <p className="mt-1 max-w-56 text-sm leading-relaxed text-muted-foreground">
              Seven reasoning skills, and the ideas they share.
            </p>
          </div>

          <Link
            to="/profile"
            aria-label="Open profile"
            className="shrink-0 opacity-85 transition-opacity hover:opacity-100"
          >
            <CompanionAvatar
              companion={{ ...companion, expression: urgency === "piling" ? "calm" : "happy" }}
              size={44}
            />
          </Link>
        </header>

        <section className="mt-5 flex items-center gap-4 border-b border-border pb-5">
          <ProgressRing pct={goalPct} size={64} stroke={7}>
            <span className="text-sm font-bold text-foreground">
              {Math.min(doneToday, state.dailyGoal)}/{state.dailyGoal}
            </span>
          </ProgressRing>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Flame aria-hidden className="h-3.5 w-3.5 text-primary" />
              <p className="text-sm font-bold text-foreground">
                {state.streak} day{state.streak === 1 ? "" : "s"} in a row
              </p>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {doneToday >= state.dailyGoal
                ? "Daily goal met. Anything more is a bonus."
                : `${state.dailyGoal - doneToday} more lesson${state.dailyGoal - doneToday === 1 ? "" : "s"} to hit today's goal.`}
            </p>
          </div>
        </section>

        <section className="mt-5">
          <ThinkingGraph completed={completed} streak={state.streak} xp={state.xp} />
        </section>

        <section className="border-t border-border py-5">
          <p className="text-xs font-bold text-primary">
            {finished ? "Curriculum complete" : unitById(next?.unitId ?? "claims").title}
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              navigate({
                to: "/course/$slug/lesson/$index",
                params: { slug: CURRICULUM_SLUG, index: String(nextIndex + 1) },
              })
            }
            className="mt-1 h-auto w-full justify-between gap-3 whitespace-normal rounded-none bg-transparent p-0 text-left shadow-none hover:bg-transparent"
          >
            <span className="min-w-0">
              <span className="block text-base font-bold leading-snug text-foreground">
                {finished ? `Revisit: ${next?.title}` : `Continue: ${next?.title}`}
              </span>
              <span className="mt-1 block text-sm font-normal leading-relaxed text-muted-foreground">
                {next?.objective}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Lesson {Math.min(completed + 1, TOTAL_LESSONS)} of {TOTAL_LESSONS}
            {recommendation ? ` · ${recommendation.reason}` : ""}
          </p>
        </section>

        <section className="border-t border-border py-5">
          <p className="text-sm font-bold text-foreground">Today’s review</p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate({ to: dueTotal === 0 ? "/schedule" : "/review" })}
            className="mt-2 h-auto w-full justify-start whitespace-normal rounded-none bg-transparent p-0 text-left text-sm font-normal leading-relaxed text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground"
          >
            {dueTotal === 0
              ? "Nothing due today. Every drill is sitting comfortably."
              : urgency === "piling"
                ? `${dueTotal} drills due. Oldest is ${maxOverdue} days overdue.`
                : `${dueTotal} drill${dueTotal === 1 ? "" : "s"} due — new scenarios, same skills.`}
          </Button>
        </section>

        {challenge && (
          <section className="border-t border-border py-5">
            <div className="flex items-center gap-1.5">
              <Zap aria-hidden className="h-3.5 w-3.5 text-primary" />
              <p className="text-sm font-bold text-foreground">Daily challenge</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate({ to: "/challenge" })}
              className="mt-2 h-auto w-full justify-between gap-3 whitespace-normal rounded-none bg-transparent p-0 text-left shadow-none hover:bg-transparent"
            >
              <span className="min-w-0 text-sm font-normal leading-relaxed text-muted-foreground">
                {challengeDone
                  ? "Done for today. A new one lands tomorrow."
                  : `One drill from ${challenge.unitTitle}. Keeps your streak alive.`}
              </span>
              {!challengeDone && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </Button>
          </section>
        )}
      </main>
    </PhoneFrame>
  );
}
