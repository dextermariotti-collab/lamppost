import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Flame, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ChestOffer } from "@/components/ChestOffer";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { DrillVariant } from "@/components/exercises/DrillVariant";
import { SocraticPopup } from "@/components/SocraticPopup";
import type { Exercise } from "@/lib/exercises";

import { Button } from "@/components/ui/button";
import { useCompanion } from "@/lib/companion-store";
import { useDailyChallenge } from "@/lib/challenge";
import { CURRICULUM_SLUG } from "@/lib/curriculum";
import { useProgress } from "@/lib/progress";
import { trackDrillResult } from "@/lib/review-drills";
import { recordDrillOutcome } from "@/lib/rating";
import { celebrateAnswer } from "@/components/AnswerFeedback";

export const Route = createFileRoute("/challenge")({
  head: () => ({
    meta: [
      { title: "Daily challenge — Lamppost" },
      {
        name: "description",
        content:
          "One quick reasoning drill a day, drawn from the thinking skills you've already unlocked. It counts towards your streak.",
      },
      { property: "og:title", content: "Daily challenge — Lamppost" },
      {
        property: "og:description",
        content: "A single fresh drill each day to keep your streak and your reasoning sharp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DailyChallengeScreen,
});

function DailyChallengeScreen() {
  const navigate = useNavigate();
  const { state, recordReview } = useProgress();
  const { companion } = useCompanion();
  const completed = state.courses[CURRICULUM_SLUG]?.completed ?? 0;
  const { challenge, doneToday, lastCorrect, hydrated, complete } = useDailyChallenge(completed);

  const [result, setResult] = useState<boolean | null>(null);
  /** True when the answer was given on this screen, so feedback is shown first. */
  const [justAnswered, setJustAnswered] = useState(false);
  const [wrapped, setWrapped] = useState(false);

  useEffect(() => {
    if (hydrated && doneToday && result === null) setResult(lastCorrect);
  }, [hydrated, doneToday, lastCorrect, result]);

  const seen = useMemo<number[]>(() => [], []);
  const finished = result !== null;
  /** Show the done card once feedback has been read (or on a later visit). */
  const showDone = finished && (wrapped || !justAnswered);

  /** The answered drill, kept so the companion can ask a follow-up about it. */
  const [answered, setAnswered] = useState<{
    exercise: Exercise;
    answer: unknown;
    correct: boolean;
  } | null>(null);
  const [socraticDone, setSocraticDone] = useState(false);

  const handleAnswer = (
    score: number,
    _variant: number,
    answer: unknown,
    exercise: Exercise,
    difficulty: number,
  ) => {
    if (finished || !challenge) return;
    const correct = score >= 1;
    setResult(correct);
    setJustAnswered(true);
    setAnswered({ exercise, answer, correct });
    complete(correct);
    recordReview(correct);
    trackDrillResult(challenge.lessonId, challenge.kind, score);
    celebrateAnswer({ correct, xp: correct ? 20 : 5, note: "Daily challenge" });
    recordDrillOutcome(challenge.lessonId, { score, difficulty });
  };

  return (
    <PhoneFrame>
      <div className="px-5 pb-10">
        <div className="flex items-center justify-between py-3">
          <Link
            to="/"
            aria-label="Back home"
            className="-ml-1 flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {challenge ? (
            <p className="text-xs font-bold text-muted-foreground">Daily challenge</p>
          ) : (
            <h1 className="text-xs font-bold text-muted-foreground">Daily challenge</h1>
          )}
          <span className="w-11" />
        </div>

        <div className="mt-2 flex items-center gap-2 text-primary-text">
          <Zap aria-hidden className="h-4 w-4" />
          <p className="text-xs font-bold">One drill. Counts towards your streak.</p>
        </div>

        {!challenge && hydrated && (
          <div className="mt-8 rounded-3xl border border-border p-5 text-center">
            <p className="text-sm font-bold">Finish your first lesson</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The daily challenge draws on skills you've already unlocked, so it opens up once
              you've completed a lesson.
            </p>
            <Button asChild className="mt-4 h-11 w-full rounded-full font-semibold">
              <Link to="/course/$slug" params={{ slug: CURRICULUM_SLUG }}>
                Go to my path
              </Link>
            </Button>
          </div>
        )}

        {challenge && (
          <>
            <h1 className="mt-3 text-2xl leading-tight">{challenge.lessonTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{challenge.unitTitle}</p>

            {showDone ? (
              <div className="mt-8 flex animate-pop-in flex-col items-center text-center">
                <CompanionAvatar
                  companion={{ ...companion, expression: result ? "excited" : "calm" }}
                  size={112}
                  animate
                />
                <div className="mt-4 flex items-center gap-2 text-primary-text">
                  <Flame aria-hidden className="h-5 w-5" />
                  <p className="text-sm font-bold">Today's challenge is done</p>
                </div>
                <p className="mt-2 max-w-[17rem] text-sm text-muted-foreground">
                  {result
                    ? "Called it. A new challenge lands tomorrow."
                    : "Missed — so that skill is back in your review queue with new material."}
                </p>
                <ChestOffer source="challenge" className="mt-6 w-full max-w-sm" />
                <Button
                  onClick={() => navigate({ to: "/" })}
                  className="mt-6 h-12 rounded-full bg-hero-gradient px-6 text-sm font-semibold shadow-card"
                >
                  Back to home
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <DrillVariant
                  lessonId={challenge.lessonId}
                  kind={challenge.kind}
                  seen={seen}
                  index={0}
                  total={1}
                  showCount={false}
                  onAnswer={handleAnswer}
                />
                {finished && (
                  <Button
                    onClick={() => setWrapped(true)}
                    className="mt-5 h-12 w-full animate-pop-in rounded-full bg-hero-gradient text-sm font-semibold shadow-card"
                  >
                    Finish challenge
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                {answered && !socraticDone && (
                  <SocraticPopup
                    companion={companion}
                    lessonTitle={challenge.lessonTitle}
                    objective={challenge.unitTitle}
                    exercise={answered.exercise}
                    answer={answered.answer}
                    correct={answered.correct}
                    onDismiss={() => setSocraticDone(true)}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
