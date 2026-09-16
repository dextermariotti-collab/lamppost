import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { AnimatedBar } from "@/components/AnimatedBar";
import { DrillVariant } from "@/components/exercises/DrillVariant";
import { Button } from "@/components/ui/button";
import { useCompanion } from "@/lib/companion-store";
import { useProgress } from "@/lib/progress";
import { EXERCISE_LABEL } from "@/lib/exercises";
import { useDueDrills, type ScheduledDrill } from "@/lib/review-drills";

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
  const navigate = useNavigate();
  const { recordReview } = useProgress();
  const { companion } = useCompanion();
  const { items, hydrated, grade } = useDueDrills();

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

  const handleAnswer = (score: number, variant: number) => {
    if (answered || !item) return;
    setAnswered(true);
    const correct = score >= 1;
    if (correct) setRight((n) => n + 1);
    grade(item.key, correct, variant);
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
          <p className="text-xs font-bold text-muted-foreground">Daily review</p>
          <span className="w-9" />
        </div>

        {!done && item && (
          <>
            <AnimatedBar pct={(step / session!.length) * 100} className="mt-1" />
            <p className="mt-2 text-[11px] font-bold text-muted-foreground">
              {step + 1} of {session!.length} · {item.unitTitle}
            </p>

            <div className="mt-4">
              <p className="text-[11px] font-bold text-primary">
                {item.lessonTitle} · {EXERCISE_LABEL[item.kind]}
                {item.overdueDays > 0 && ` · ${item.overdueDays}d overdue`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.reason === "missed"
                  ? "You missed this one before. New scenario, same skill."
                  : "You weren't sure last time. Here's a fresh one."}
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
                className="mt-5 h-12 w-full rounded-full bg-hero-gradient text-base font-semibold shadow-card"
              >
                {step + 1 >= session!.length ? "Finish review" : "Next drill"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </>
        )}

        {done && (
          <div className="mt-10 flex animate-pop-in flex-col items-center text-center">
            <CompanionAvatar
              companion={{ ...companion, expression: "excited" }}
              size={120}
              animate
            />
            <h1 className="mt-4 text-2xl">
              {session!.length === 0 ? "Nothing due right now" : "Review complete"}
            </h1>
            <p className="mt-2 max-w-[17rem] text-sm text-muted-foreground">
              {session!.length === 0
                ? "Drills you miss — or aren't sure about — come back here as new scenarios. Nothing is waiting today."
                : `${right} of ${session!.length} handled. The ones you missed return tomorrow with new material.`}
            </p>
            <Button
              onClick={() => navigate({ to: "/" })}
              className="mt-6 h-12 rounded-full bg-hero-gradient px-6 text-sm font-semibold shadow-card"
            >
              <Sparkles className="h-4 w-4" />
              Back to home
            </Button>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
