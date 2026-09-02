import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { AnimatedBar } from "@/components/AnimatedBar";
import { SuccessBurst } from "@/components/SuccessBurst";
import { Button } from "@/components/ui/button";
import { useCompanion } from "@/lib/companion-store";
import { useProgress } from "@/lib/progress";
import { useReviewQueue } from "@/lib/reviews";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Daily review — Lamppost" },
      {
        name: "description",
        content:
          "Run today's spaced repetition queue: quick recall questions from the lessons you've already finished.",
      },
      { property: "og:title", content: "Daily review — Lamppost" },
      {
        property: "og:description",
        content: "Keep what you learned with a two-minute spaced repetition session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewQueue,
});

function ReviewQueue() {
  const navigate = useNavigate();
  const { state, recordReview } = useProgress();
  const { companion } = useCompanion();
  const completedBySlug = useMemo(
    () => Object.fromEntries(Object.entries(state.courses).map(([slug, c]) => [slug, c.completed])),
    [state.courses],
  );
  const { items, hydrated, grade } = useReviewQueue(completedBySlug);

  // Snapshot the queue once so grading doesn't reshuffle it mid-session.
  const [session, setSession] = useState<typeof items | null>(null);
  useEffect(() => {
    if (hydrated && session === null) setSession(items);
  }, [hydrated, items, session]);

  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);

  const item = session?.[step];
  const done = session !== null && (session.length === 0 || step >= session!.length);

  const answer = (index: number) => {
    if (picked !== null || !item) return;
    setPicked(index);
    const correct = index === item.quiz.correct;
    if (correct) setRight((n) => n + 1);
    grade(item.key, correct);
    recordReview(correct);
  };

  return (
    <PhoneFrame>
      <div className="px-5 pb-8">
        <div className="flex items-center justify-between py-3">
          <Link
            to="/"
            aria-label="Back home"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Daily review
          </p>
          <span className="w-9" />
        </div>

        {!done && item && (
          <>
            <AnimatedBar pct={(step / session!.length) * 100} className="mt-1" />
            <p className="mt-2 text-[11px] font-bold text-muted-foreground">
              {step + 1} of {session!.length} · {item.topic}
            </p>

            <div className="mt-5 animate-rise-in rounded-3xl bg-card p-5 shadow-card">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                {item.lessonTitle}
                {item.overdueDays > 0 && ` · ${item.overdueDays}d overdue`}
              </p>
              <h1 className="mt-2 text-lg leading-snug">{item.quiz.question}</h1>

              <div className="mt-4 space-y-2.5">
                {item.quiz.options.map((option, i) => {
                  const isCorrect = i === item.quiz.correct;
                  const chosen = picked === i;
                  return (
                    <Button
                      key={option}
                      type="button"
                      variant="outline"
                      onClick={() => answer(i)}
                      disabled={picked !== null}
                      className={cn(
                        "relative h-auto min-h-12 w-full justify-between whitespace-normal rounded-2xl border-2 p-3 text-left text-sm font-bold shadow-none transition-all",
                        picked === null
                          ? "border-border hover:-translate-y-0.5 hover:border-primary/60"
                          : isCorrect
                            ? "border-success bg-success/10 animate-correct-answer"
                            : chosen
                              ? "border-destructive bg-destructive/10"
                              : "border-border opacity-60",
                      )}
                    >
                      {option}
                      {picked !== null && isCorrect && <Check className="h-4 w-4 text-success" />}
                      {picked !== null && chosen && !isCorrect && (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                      {picked !== null && chosen && isCorrect && <SuccessBurst compact />}
                    </Button>
                  );
                })}
              </div>

              {picked !== null && (
                <div className="mt-4 animate-rise-in rounded-2xl bg-primary-soft p-3">
                  <div className="flex items-start gap-3">
                    <CompanionAvatar
                      companion={{
                        ...companion,
                        expression: picked === item.quiz.correct ? "excited" : "calm",
                      }}
                      size={40}
                    />
                    <p className="text-xs font-semibold text-accent-foreground">
                      {item.quiz.explanation}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {picked !== null && (
              <Button
                onClick={() => {
                  setPicked(null);
                  setStep((s) => s + 1);
                }}
                className="mt-5 w-full rounded-2xl bg-hero-gradient py-3.5 text-sm font-extrabold text-primary-foreground shadow-card transition-transform active:scale-95"
              >
                {step + 1 >= session!.length ? "Finish review" : "Next"}
              </Button>
            )}
          </>
        )}

        {done && (
          <div className="mt-10 flex animate-pop-in flex-col items-center text-center">
            <CompanionAvatar companion={{ ...companion, expression: "excited" }} size={120} animate />
            <h1 className="mt-4 text-2xl">
              {session!.length === 0 ? "Nothing due right now" : "Review complete"}
            </h1>
            <p className="mt-2 max-w-[16rem] text-sm text-muted-foreground">
              {session!.length === 0
                ? "Finish a lesson and it'll come back here tomorrow for recall practice."
                : `${right} of ${session!.length} recalled. The ones you missed return tomorrow.`}
            </p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="mt-6 flex items-center gap-2 rounded-2xl bg-hero-gradient px-6 py-3 text-sm font-extrabold text-primary-foreground shadow-card"
            >
              <Sparkles className="h-4 w-4" />
              Back to home
            </button>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
