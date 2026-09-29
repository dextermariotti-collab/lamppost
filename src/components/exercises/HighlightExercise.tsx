import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseFeedback, ExerciseShell } from "./ExerciseShell";
import type { HighlightExercise as HighlightExerciseData } from "@/lib/exercises";

/** Tap the words that do the damage: weasel words, manipulation, unsupported claims. */
export function HighlightExerciseCard({
  exercise,
  index,
  total,
  showCount = true,
  answer,
  onAnswer,
}: {
  exercise: HighlightExerciseData;
  index: number;
  total: number;
  showCount?: boolean;
  answer: number[] | undefined;
  onAnswer: (picked: number[], score: number) => void;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const answered = answer !== undefined;
  const shown = answer ?? picked;
  const targets = new Set(exercise.targets);

  const hits = shown.filter((i) => targets.has(i)).length;
  const misses = shown.length - hits;
  const score = Math.max(0, (hits - misses) / exercise.targets.length);

  const toggle = (i: number) => {
    if (answered) return;
    setPicked((prev) => (prev.includes(i) ? prev.filter((p) => p !== i) : [...prev, i]));
  };

  return (
    <ExerciseShell
      kind="highlight"
      index={index}
      total={total}
      showCount={showCount}
      question={exercise.question}
    >
      <div
        role="group"
        aria-label="The passage. Press a word to pick it."
        className="mt-4 flex flex-wrap gap-x-1.5 gap-y-1 rounded-2xl bg-primary-soft p-3 text-[15px] leading-snug"
      >
        {exercise.tokens.map((token, i) => {
          const isPicked = shown.includes(i);
          const isTarget = targets.has(i);
          const state = !answered
            ? isPicked
              ? "border-primary bg-primary text-primary-foreground"
              : "border-primary/25 bg-background/70 text-accent-foreground hover:border-primary/60"
            : isTarget
              ? "border-success bg-success/25 text-foreground underline decoration-success decoration-2"
              : isPicked
                ? "border-destructive/60 bg-destructive/15 text-foreground line-through"
                : "border-transparent text-accent-foreground/70";
          return (
            <button
              key={`${token}-${i}`}
              type="button"
              aria-pressed={isPicked}
              onClick={() => toggle(i)}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border-2 px-2.5 font-semibold transition-colors ${state}`}
            >
              {token}
              {answered && isTarget && (
                <span className="sr-only">
                  {" "}
                  (one to tap{isPicked ? ", you got it" : ", you missed it"})
                </span>
              )}
              {answered && !isTarget && isPicked && (
                <span className="sr-only"> (not one to tap)</span>
              )}
            </button>
          );
        })}
      </div>

      {!answered ? (
        <Button
          type="button"
          disabled={picked.length === 0}
          onClick={() =>
            onAnswer(
              picked,
              Math.max(
                0,
                (picked.filter((i) => targets.has(i)).length -
                  picked.filter((i) => !targets.has(i)).length) /
                  exercise.targets.length,
              ),
            )
          }
          className="sticky-action mt-4 h-11 w-full rounded-full font-semibold"
        >
          Check my picks
        </Button>
      ) : (
        <ExerciseFeedback
          correct={score >= 1}
          headline={
            score >= 1
              ? "You caught every one."
              : `${hits} of ${exercise.targets.length} found${misses ? `, ${misses} false alarm${misses === 1 ? "" : "s"}` : ""}.`
          }
          body={exercise.explanation}
        />
      )}
    </ExerciseShell>
  );
}
