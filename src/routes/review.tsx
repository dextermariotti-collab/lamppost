import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LESSONS } from "@/lib/curriculum";
import { GuideMark } from "@/components/LineBullet";
import { celebrateAnswer } from "@/components/AnswerFeedback";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ReportContentButton } from "@/components/ReportContentButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { loadLessonScript } from "@/content/lessons";
import { readAttemptStore } from "@/lib/exercise-store";
import { playCue } from "@/lib/feedback";
import { useProgress } from "@/lib/progress";
import { reviewXp } from "@/lib/progress-core";
import { recordDrillOutcome } from "@/lib/rating";
import { nextReviewLine, useDrillSchedule, useDueDrills } from "@/lib/review-drills";
import { reviewSession, stepExcerpt, type ReviewQuestion } from "@/lib/review-steps";
import { holdRewards } from "@/lib/reward-hold";
import { statedConfidence } from "@/lib/steps/attempts";
import type { StepResult } from "@/lib/steps/scoring";
import type { LessonStep } from "@/lib/steps/types";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Daily review — Lamppost" },
      {
        name: "description",
        content:
          "Run today's review queue: questions from the lessons you got wrong or weren't sure about, back just as they start to fade.",
      },
      { property: "og:title", content: "Daily review — Lamppost" },
      {
        property: "og:description",
        content: "The skills you found shaky, asked again at the right moment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewQueue,
});

const REASON: Record<ReviewQuestion["item"]["reason"], string> = {
  missed: "missed last time",
  unsure: "unsure last time",
  practice: "coming back",
  keep: "keeping it fresh",
};

function ReviewQueue() {
  const { recordReview } = useProgress();
  const { items, hydrated, grade } = useDueDrills();
  const { items: scheduled } = useDrillSchedule();

  // The questions are picked once, so grading doesn't reshuffle the queue mid-session.
  const [session, setSession] = useState<{ questions: ReviewQuestion[]; skipped: number } | null>(
    null,
  );
  const started = useRef(false);
  useEffect(() => {
    if (!hydrated || started.current) return;
    started.current = true;
    void reviewSession(items, loadLessonScript, readAttemptStore()).then(setSession);
  }, [hydrated, items]);

  const [tally, setTally] = useState({ right: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);
  const answered = useRef(new Set<number>());

  const questions = session?.questions ?? [];
  const running = session !== null && questions.length > 0 && !finished;
  // Badges and level-ups wait for the end of the review rather than landing on a question.
  useEffect(() => (running ? holdRewards() : undefined), [running]);

  const steps = questions.map<LessonStep>((q) => ({
    ...q.step,
    label: `${q.item.lessonTitle} · ${REASON[q.item.reason]}`,
  }));

  const onStepResolved = (index: number, _step: LessonStep, result: StepResult) => {
    const question = questions[index];
    if (!question || answered.current.has(index)) return;
    answered.current.add(index);
    const { item } = question;
    // Right means right the first time; a hint halves the XP, never the verdict.
    const correct = result.wrongAttempts === 0 && !result.revealed;
    const xpScale = result.hintUsed ? 0.5 : 1;
    setTally((t) => (correct ? { ...t, right: t.right + 1 } : { ...t, wrong: t.wrong + 1 }));
    grade(item.key, correct, question.variant);
    recordReview(correct, xpScale);
    playCue(correct ? "correct" : "wrong");
    celebrateAnswer({ correct, xp: reviewXp(correct, xpScale) });
    const confidence = statedConfidence(result.answer);
    recordDrillOutcome(item.lessonId, {
      score: correct ? 1 : 0,
      difficulty: 2,
      ...(confidence !== undefined ? { confidence } : {}),
    });
  };

  const empty = session !== null && questions.length === 0 && session.skipped === 0;
  const done = session !== null && (finished || (questions.length === 0 && session.skipped > 0));

  return (
    <PhoneFrame>
      <ScreenHeader title="Daily review" backTo="/" />
      {running && (
        <div className="-mt-2">
          <LessonPlayer
            steps={steps}
            stopUnits={questions.map((q) => unitOf(q))}
            intro={
              <p className="px-5 pb-1 text-xs text-muted-foreground">
                Questions from lessons you missed or weren&apos;t sure about, back just as they
                start to fade.
              </p>
            }
            aboveAction={(index) => {
              const q = questions[index];
              return q ? (
                <ReportContentButton
                  className="mt-4"
                  context={{
                    courseTopic: "Review question",
                    lessonTitle: q.item.lessonTitle,
                    ...(q.item.lessonIndex >= 0 ? { lessonIndex: q.item.lessonIndex + 1 } : {}),
                    excerpt: stepExcerpt(q.step),
                  }}
                />
              ) : null;
            }}
            onStepResolved={onStepResolved}
            onComplete={() => setFinished(true)}
            finalLabel="Finish review"
          />
        </div>
      )}
      <div className="px-5 pb-8">
        {empty && (
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

        {done && (
          <ReviewSummary right={tally.right} wrong={tally.wrong} skipped={session.skipped} />
        )}
      </div>
    </PhoneFrame>
  );
}

const unitOf = (q: ReviewQuestion) =>
  LESSONS.find((lesson) => lesson.id === q.item.lessonId)?.unitId ?? "";

/**
 * The end of a review, telling right, missed and skipped apart and saying what happens to each:
 * a miss comes back tomorrow, a question that couldn't be loaded was never graded so it stays due,
 * and a right answer comes back later, further apart. A review where nothing was answered says
 * so plainly rather than calling itself complete.
 */
function ReviewSummary({
  right,
  wrong,
  skipped,
}: {
  right: number;
  wrong: number;
  skipped: number;
}) {
  const skippedLine =
    skipped === 1
      ? "One question couldn't be loaded. It's still due and comes back in a later review."
      : `${skipped} questions couldn't be loaded. They're still due and come back in a later review.`;

  if (right + wrong === 0) {
    return (
      <div className="sign p-5">
        <h2 className="text-lg">No questions answered</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {skipped === 1
            ? "Today's question couldn't be loaded, so nothing was graded. It's still due and comes back in a later review."
            : `Today's ${skipped} questions couldn't be loaded, so nothing was graded. They're still due and come back in a later review.`}
        </p>
        <Button asChild className="mt-4 h-12 w-full rounded-sm text-sm font-semibold">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  const next = [
    wrong === 1
      ? "The one you missed comes back tomorrow."
      : wrong > 1
        ? `The ${wrong} you missed come back tomorrow.`
        : null,
    skipped > 0 ? skippedLine : null,
    wrong === 0 && skipped === 0 ? "Each one comes back later, further apart." : null,
  ].filter(Boolean);

  return (
    <div className="flex animate-pop-in flex-col items-center text-center">
      <GuideMark size={72} />
      <h2 className="mt-4 text-2xl">Review complete</h2>
      <p className="mt-2 font-mono text-xs text-muted-foreground">
        {right} right · {wrong} missed
        {skipped > 0 && ` · ${skipped} skipped`}
      </p>
      <p className="mt-2 max-w-[17rem] text-sm text-muted-foreground">{next.join(" ")}</p>
      <Button asChild className="mt-6 h-12 rounded-sm px-6 text-sm font-semibold">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
