import { createFileRoute, Link } from "@tanstack/react-router";
import { GuideMark } from "@/components/LineBullet";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { DrillVariant } from "@/components/exercises/DrillVariant";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/lib/progress";
import { EXERCISE_LABEL } from "@/lib/exercises";
import { CURRICULUM_SLUG } from "@/lib/curriculum";
import {
  nextReviewLine,
  useDrillSchedule,
  useDueDrills,
  type ScheduledDrill,
} from "@/lib/review-drills";
import { recordDrillOutcome } from "@/lib/rating";
import { celebrateAnswer } from "@/components/AnswerFeedback";
import { playCue } from "@/lib/feedback";
import { REVIEW_XP } from "@/lib/progress-core";
import { holdRewards } from "@/lib/reward-hold";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Daily review — Lamppost" },
      {
        name: "description",
        content:
          "Run today's review queue: the reasoning drills you got wrong or weren't sure about, served as brand-new scenarios.",
      },
      { property: "og:title", content: "Daily review — Lamppost" },
      {
        property: "og:description",
        content: "Fresh drills on the skills you found shaky — same skill, new scenario.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewQueue,
});

function ReviewQueue() {
  const { recordReview } = useProgress();
  const { items, hydrated, grade } = useDueDrills();
  const { items: scheduled } = useDrillSchedule();

  // Snapshot the queue once so grading doesn't reshuffle it mid-session.
  const [session, setSession] = useState<ScheduledDrill[] | null>(null);
  useEffect(() => {
    if (hydrated && session === null) setSession(items);
  }, [hydrated, items, session]);

  const [step, setStep] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [right, setRight] = useState(0);
  const [skipped, setSkipped] = useState(0);

  const item = session?.[step];
  const done = session !== null && (session.length === 0 || step >= session.length);

  // Badges and level-ups wait for the end of the review rather than landing on a drill.
  const running = session !== null && !done;
  useEffect(() => (running ? holdRewards() : undefined), [running]);

  // The hint's half XP isn't passed on: recordReview pays a fixed REVIEW_XP either way.
  const handleAnswer = (
    score: number,
    variant: number,
    _answer: unknown,
    _exercise: unknown,
    difficulty: number,
  ) => {
    if (answered || !item) return;
    setAnswered(true);
    const correct = score >= 1;
    if (correct) setRight((n) => n + 1);
    grade(item.key, correct, variant);
    recordReview(correct);
    playCue(correct ? "correct" : "wrong");
    celebrateAnswer({
      correct,
      xp: correct ? REVIEW_XP.correct : REVIEW_XP.wrong,
      note: EXERCISE_LABEL[item.kind],
    });
    recordDrillOutcome(item.lessonId, { score, difficulty });
  };

  // A drill that can't be fetched is left in the queue, ungraded, for next time.
  const skipDrill = () => {
    if (answered) return;
    setSkipped((n) => n + 1);
    setStep((s) => s + 1);
  };

  return (
    <PhoneFrame>
      {done ? (
        <ScreenHeader title="Daily review" backTo="/" />
      ) : (
        <ScreenHeader
          backTo="/"
          right={<span className="text-xs font-bold text-muted-foreground">Daily review</span>}
        />
      )}
      <div className="px-5 pb-8">
        {!done && item && (
          <>
            <div
              role="progressbar"
              aria-label="Review progress"
              aria-valuemin={0}
              aria-valuemax={session!.length}
              aria-valuenow={step}
              aria-valuetext={`${step} of ${session!.length} done`}
              className="mt-1 h-2 overflow-hidden bg-muted"
            >
              <div
                className="h-full bg-primary transition-[width] duration-300 ease-out"
                style={{ width: `${(step / session!.length) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] font-bold text-muted-foreground">
              {step + 1} of {session!.length} · {item.unitTitle}
            </p>

            <div className="mt-4">
              <p className="text-[11px] font-bold text-primary-text">
                {item.lessonTitle} · {EXERCISE_LABEL[item.kind]}
                {item.overdueDays > 0 && ` · ${item.overdueDays}d overdue`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.reason === "missed"
                  ? "You missed this one before. New scenario, same skill."
                  : item.reason === "unsure"
                    ? "You weren't sure last time. Here's a fresh one."
                    : "Keeping this skill fresh. New scenario, same skill."}
              </p>
            </div>

            <DrillVariant
              key={`${item.key}-${step}`}
              lessonId={item.lessonId}
              kind={item.kind}
              seen={item.seen}
              index={step}
              total={session!.length}
              skip={{ label: "Skip this drill", onSkip: skipDrill }}
              onAnswer={handleAnswer}
            />

            {answered && (
              <Button
                onClick={() => {
                  setAnswered(false);
                  setStep((s) => s + 1);
                }}
                className="sticky-action mt-5 h-12 w-full rounded-sm bg-hero-gradient text-base font-semibold shadow-card"
              >
                {step + 1 >= session!.length ? "Finish review" : "Next drill"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </>
        )}

        {done && session!.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg">Nothing due right now</h2>
            <p className="mt-1 text-sm text-muted-foreground">{nextReviewLine(scheduled)}</p>
            <Button asChild className="mt-4 h-12 w-full rounded-sm text-sm font-semibold">
              <Link to="/courses">Continue your path</Link>
            </Button>
            <Link
              to="/schedule"
              className="mt-2 flex min-h-11 items-center justify-center text-[13px] font-bold text-primary-text"
            >
              See the review schedule
            </Link>
          </div>
        )}

        {done && session!.length > 0 && (
          <div className="flex animate-pop-in flex-col items-center text-center">
            <GuideMark size={72} />
            <h2 className="mt-4 text-2xl">Review complete</h2>
            <p className="mt-2 max-w-[17rem] text-sm text-muted-foreground">
              {right} of {session!.length} handled. The ones you missed return tomorrow with new
              material.
              {skipped > 0 &&
                ` ${skipped === 1 ? "The one you skipped is" : `The ${skipped} you skipped are`} still in your queue.`}
            </p>
            <Button asChild className="mt-6 h-12 rounded-sm px-6 text-sm font-semibold">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
