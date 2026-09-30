import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { AnimatedBar } from "@/components/AnimatedBar";
import { ChestOffer } from "@/components/ChestOffer";
import { DrillVariant } from "@/components/exercises/DrillVariant";
import { Button } from "@/components/ui/button";
import { useCompanion } from "@/lib/companion-store";
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
  const { companion } = useCompanion();
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

  const item = session?.[step];
  const done = session !== null && (session.length === 0 || step >= session.length);

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
    celebrateAnswer({ correct, xp: correct ? 15 : 5, note: EXERCISE_LABEL[item.kind] });
    recordDrillOutcome(item.lessonId, { score, difficulty });
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
            <AnimatedBar pct={(step / session!.length) * 100} className="mt-1" />
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
              onAnswer={handleAnswer}
            />

            {answered && (
              <Button
                onClick={() => {
                  setAnswered(false);
                  setStep((s) => s + 1);
                }}
                className="sticky-action mt-5 h-12 w-full rounded-full bg-hero-gradient text-base font-semibold shadow-card"
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
            <Button asChild className="mt-4 h-12 w-full rounded-full text-sm font-semibold">
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
            <CompanionAvatar companion={{ ...companion, expression: "happy" }} size={88} />
            <h2 className="mt-4 text-2xl">Review complete</h2>
            <p className="mt-2 max-w-[17rem] text-sm text-muted-foreground">
              {right} of {session!.length} handled. The ones you missed return tomorrow with new
              material.
            </p>
            <ChestOffer source="review" className="mt-6 w-full max-w-sm" />
            <Button asChild className="mt-6 h-12 rounded-full px-6 text-sm font-semibold">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
