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
      <p className="mt-4 flex flex-wrap gap-x-1 gap-y-1.5 rounded-2xl bg-primary-soft p-4 text-[15px] leading-relaxed">
        {exercise.tokens.map((token, i) => {
          const isPicked = shown.includes(i);
          const isTarget = targets.has(i);
          const state = !answered
            ? isPicked
              ? "bg-primary text-primary-foreground"
              : "text-accent-foreground hover:bg-primary/15"
            : isTarget
              ? "bg-success/25 text-foreground underline decoration-success decoration-2"
              : isPicked
                ? "bg-destructive/20 text-foreground line-through"
                : "text-accent-foreground/70";
          return (
            <button
              key={`${token}-${i}`}
              type="button"
              aria-pressed={isPicked}
              onClick={() => toggle(i)}
              className={`rounded-md px-1 font-semibold transition-colors ${state}`}
            >
              {token}
            </button>
          );
        })}
      </p>

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
