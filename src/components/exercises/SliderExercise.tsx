import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseFeedback, ExerciseShell } from "./ExerciseShell";
import type { SliderExercise as SliderExerciseData } from "@/lib/exercises";

export type SliderAnswer = { before: number; after: number };

/** Rate confidence, read new evidence, then move it the right way and the right amount. */
export function SliderExerciseCard({
  exercise,
  index,
  total,
  showCount = true,
  answer,
  onAnswer,
}: {
  exercise: SliderExerciseData;
  index: number;
  total: number;
  showCount?: boolean;
  answer: SliderAnswer | undefined;
  onAnswer: (answer: SliderAnswer, score: number) => void;
}) {
  const [before, setBefore] = useState(50);
  const [locked, setLocked] = useState(false);
  const [after, setAfter] = useState(50);
  const answered = answer !== undefined;

  const scoreFor = (a: SliderAnswer) => {
    const moved = a.after - a.before;
    const wanted = exercise.direction === "up" ? exercise.size : -exercise.size;
    if (moved === 0 || Math.sign(moved) !== Math.sign(wanted)) return 0;
    const gap = Math.abs(Math.abs(moved) - exercise.size);
    return gap <= exercise.size / 2 ? 1 : 0.5;
  };

  const score = answered ? scoreFor(answer) : 0;

  return (
    <ExerciseShell
      kind="slider"
      index={index}
      total={total}
      showCount={showCount}
      question={
        locked || answered ? "Now update your confidence." : "How confident are you in this?"
      }
      passage={exercise.claim}
    >
      {!locked && !answered ? (
        <div className="mt-4">
          <p className="flex items-baseline justify-between text-[13px] font-semibold text-muted-foreground">
            Confidence before any new evidence
            <span className="text-base font-bold text-primary-text">{before}%</span>
          </p>
          <input
            aria-label="Confidence before"
            type="range"
            min={0}
            max={100}
            step={5}
            value={before}
            onChange={(event) => setBefore(Number(event.target.value))}
            className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
          <Button
            type="button"
            onClick={() => {
              setAfter(before);
              setLocked(true);
            }}
            className="sticky-action mt-4 h-11 w-full rounded-full font-semibold"
          >
            Lock that in
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <div className="rounded-2xl border-2 border-primary/30 bg-primary-soft p-4 text-[14px] font-semibold leading-relaxed text-accent-foreground">
            New evidence: {exercise.evidence}
          </div>
          <p className="mt-4 flex items-baseline justify-between text-[13px] font-semibold text-muted-foreground">
            {answered ? "You moved to" : "Confidence now"}
            <span className="text-base font-bold text-primary-text">
              {answered ? answer.after : after}%
            </span>
          </p>
          <input
            aria-label="Confidence after"
            type="range"
            min={0}
            max={100}
            step={5}
            disabled={answered}
            value={answered ? answer.after : after}
            onChange={(event) => setAfter(Number(event.target.value))}
            className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:opacity-70"
          />
          <p className="mt-1 text-[12px] font-semibold text-muted-foreground">
            You started at {answered ? answer.before : before}%.
          </p>
          {!answered && (
            <Button
              type="button"
              onClick={() => onAnswer({ before, after }, scoreFor({ before, after }))}
              className="sticky-action mt-4 h-11 w-full rounded-full font-semibold"
            >
              Commit to that
            </Button>
          )}
        </div>
      )}

      {answered && (
        <ExerciseFeedback
          correct={score >= 1}
          headline={
            score >= 1
              ? "Right direction, sensible size."
              : score > 0
                ? "Right direction, but the size was off."
                : `A good reasoner moves ${exercise.direction} here.`
          }
          body={exercise.explanation}
        />
      )}
    </ExerciseShell>
  );
}
