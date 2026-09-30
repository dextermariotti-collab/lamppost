import { ArrowDown, ArrowRight, ArrowUp, Check, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { directionOf, likelihoodWord, probabilityPath, type Direction } from "@/lib/steps/checks";
import type { StepResult } from "@/lib/steps/scoring";
import type { UpdaterStep } from "@/lib/steps/types";
import { FeedbackPanel, StepFrame } from "./StepFrame";
import { useStepEngine } from "./useStepEngine";

const GUESSES: { value: Direction; label: string; icon: typeof ArrowUp }[] = [
  { value: "up", label: "More likely", icon: ArrowUp },
  { value: "down", label: "Less likely", icon: ArrowDown },
  { value: "same", label: "No real change", icon: ArrowRight },
];

const WORD: Record<Direction, string> = {
  up: "more likely",
  down: "less likely",
  same: "no real change",
};

/**
 * A claim starts at some probability. Evidence cards come one at a time: say whether each
 * makes the claim more likely, less likely or changes nothing, and the bar moves to show what
 * it really does. No formulas: the bar, its number and a word for where it sits.
 */
export function EvidenceUpdater({
  step,
  onResolve,
}: {
  step: UpdaterStep;
  onResolve: (result: StepResult) => void;
}) {
  const engine = useStepEngine(onResolve);
  const meterId = useId();
  const path = probabilityPath(step);
  /** How many cards the learner has dealt with. */
  const [done, setDone] = useState(0);
  const [guesses, setGuesses] = useState<Direction[]>([]);
  const [answered, setAnswered] = useState(false);

  const current = step.cards[done];
  const shownCards = answered ? done + 1 : done;
  const probability = path[shownCards]!;
  const finished = done >= step.cards.length;
  const correctCount = guesses.filter((g, i) => g === directionOf(step.cards[i]!.shift)).length;

  const guess = (value: Direction) => {
    if (!current || answered) return;
    const right = value === directionOf(current.shift);
    const nextGuesses = [...guesses, value];
    setGuesses(nextGuesses);
    setAnswered(true);
    const move =
      current.shift === 0
        ? "It changes nothing."
        : `It moves the claim ${current.shift > 0 ? "up" : "down"} to ${path[done + 1]}%.`;
    engine.say({
      tone: right ? "right" : "wrong",
      title: right ? "Yes" : `It's actually ${WORD[directionOf(current.shift)]}`,
      body: `${move} ${current.note}`,
    });
  };

  const next = () => {
    const nextDone = done + 1;
    setDone(nextDone);
    setAnswered(false);
    engine.say(null);
    if (nextDone >= step.cards.length) {
      const total = step.cards.length;
      const correct = guesses.filter((g, i) => g === directionOf(step.cards[i]!.shift)).length;
      engine.right(
        { guesses },
        `You called ${correct} of ${total} the right way. The claim ended at ${path[total]}%. ${step.why}`,
        correct === total ? "Well judged" : "Here's where it landed",
        correct / total,
      );
    }
  };

  return (
    <StepFrame
      label={step.label ?? "Update on the evidence"}
      prompt={step.prompt}
      hint={step.hint}
      engine={engine}
      hintHidden={answered}
      inlineFeedback
    >
      <div className="rounded-2xl bg-primary-soft p-4">
        <p className="text-[15px] font-semibold leading-relaxed text-accent-foreground">
          {step.claim}
        </p>
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-sm font-bold">
            <span id={meterId}>How likely it looks</span>
            <span aria-hidden className="text-primary-text">
              {probability}% · {likelihoodWord(probability)}
            </span>
          </div>
          <div
            role="meter"
            aria-labelledby={meterId}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={probability}
            aria-valuetext={`${probability} percent, ${likelihoodWord(probability)}`}
            className="relative mt-2 h-4 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
              style={{ width: `${probability}%` }}
            />
            <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/30" aria-hidden />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground" aria-hidden>
            <span>Very unlikely</span>
            <span>Toss-up</span>
            <span>Very likely</span>
          </div>
        </div>
      </div>

      {current && !finished && (
        <div className="mt-4">
          <p className="text-[11px] font-bold text-muted-foreground">
            New evidence {done + 1} of {step.cards.length}
          </p>
          <p className="mt-1 rounded-2xl border-2 border-primary/40 p-3 text-sm font-semibold">
            {current.text}
          </p>
          <div
            className="mt-3 grid grid-cols-3 gap-2"
            role="group"
            aria-label="What does this do to the claim?"
          >
            {GUESSES.map(({ value, label, icon: Icon }) => {
              const isRight = answered && value === directionOf(current.shift);
              const isMiss = answered && guesses[done] === value && !isRight;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={answered}
                  onClick={() => guess(value)}
                  className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-1 py-2 text-center text-[13px] font-semibold leading-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isRight
                      ? "border-success bg-success/10"
                      : isMiss
                        ? "border-destructive border-dashed bg-destructive/5"
                        : answered
                          ? "border-border opacity-60"
                          : "border-border hover:border-primary/60"
                  }`}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  <span>{label}</span>
                  {isRight && (
                    <span className="flex items-center gap-0.5 text-[11px] font-bold text-success">
                      <Check aria-hidden className="h-3.5 w-3.5" /> Correct
                    </span>
                  )}
                  {isMiss && (
                    <span className="flex items-center gap-0.5 text-[11px] font-bold text-destructive">
                      <X aria-hidden className="h-3.5 w-3.5" /> Not this one
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <FeedbackPanel message={engine.message} />

      {answered && !finished && (
        <Button
          type="button"
          onClick={next}
          className="mt-3 h-11 w-full rounded-full font-semibold"
        >
          {done + 1 < step.cards.length ? "Next piece of evidence" : "See where it landed"}
        </Button>
      )}

      {finished && (
        <p className="mt-4 text-center text-xs font-semibold text-muted-foreground">
          {correctCount} of {step.cards.length} called the right way.
        </p>
      )}
    </StepFrame>
  );
}
