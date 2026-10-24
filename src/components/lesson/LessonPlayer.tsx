import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { clearAnswerFeedback } from "@/components/AnswerFeedback";
import { Button } from "@/components/ui/button";
import { StepView } from "@/components/steps/StepView";
import { scrollToTop } from "@/lib/scroll";
import type { StepResult } from "@/lib/steps/scoring";
import type { LessonStep } from "@/lib/steps/types";
import { StepProgress } from "./StepProgress";

/**
 * Plays a lesson's steps one to a screen. Continue stays locked until the learner has done the
 * step (a text card counts as done the moment it's shown), so nothing is skipped by tapping
 * through. Focus moves to the new step each time, so a keyboard or screen-reader user starts
 * at its instruction rather than at the top of the page.
 */
export function LessonPlayer({
  steps,
  onStepResolved,
  onComplete,
  finalLabel = "Continue",
  intro,
  unitId,
  stopUnits,
}: {
  steps: readonly LessonStep[];
  /** Shown above the first step only. */
  intro?: ReactNode;
  /** The unit, so progress is drawn in its line color. */
  unitId?: string;
  /** For steps from different units (a daily case): each step's unit, for its stop's color. */
  stopUnits?: readonly string[];
  /** Called once per step, when the learner has finished it. */
  onStepResolved: (index: number, step: LessonStep, result: StepResult) => void;
  /** Called when Continue is pressed on the last step. */
  onComplete: (results: StepResult[]) => void;
  finalLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<number, StepResult>>({});
  const stepRef = useRef<HTMLDivElement | null>(null);
  const continueRef = useRef<HTMLButtonElement | null>(null);
  const step = steps[index]!;
  const resolved = results[index] !== undefined;
  const last = index === steps.length - 1;

  useEffect(() => {
    stepRef.current?.focus({ preventScroll: true });
    scrollToTop(stepRef.current);
    // Leaving a step takes its verdict down with it, so it never sits over the next question.
    return clearAnswerFeedback;
  }, [index]);

  // Answering closes the step's own controls, so a keyboard user would be left on nothing (or on
  // a button that just closed); Continue is where they go next. Focus they put somewhere still
  // usable stays where it is.
  useEffect(() => {
    if (!resolved) return;
    const active = document.activeElement as HTMLElement | null;
    const lost =
      !active ||
      active === document.body ||
      !active.isConnected ||
      (active as HTMLButtonElement).disabled === true;
    if (lost) continueRef.current?.focus({ preventScroll: true });
  }, [resolved]);

  const doneCount = Object.keys(results).length;

  return (
    <>
      {index === 0 && intro}
      <StepProgress
        total={steps.length}
        current={index}
        done={doneCount}
        {...(unitId ? { unitId } : {})}
        stopUnits={stopUnits}
      />
      <div className="px-5 pt-4 pb-8">
        <div ref={stepRef} tabIndex={-1} className="outline-none">
          <StepView
            key={step.id}
            step={step}
            onResolve={(result) => {
              setResults((prev) => (prev[index] ? prev : { ...prev, [index]: result }));
              onStepResolved(index, step, result);
            }}
          />
        </div>

        <div className="sticky-action mt-6">
          <Button
            ref={continueRef}
            type="button"
            disabled={!resolved}
            aria-disabled={!resolved}
            onClick={() => {
              if (last) onComplete(steps.map((_, i) => results[i]!));
              else setIndex((i) => i + 1);
            }}
            className={`h-12 w-full justify-between rounded-sm bg-primary px-4 text-base font-bold text-primary-foreground shadow-card hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 ${
              resolved ? "animate-pop-in" : "justify-center"
            }`}
          >
            {resolved ? (last ? finalLabel : "Continue") : "Answer to continue"}
            {resolved && <ArrowRight aria-hidden className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </>
  );
}
