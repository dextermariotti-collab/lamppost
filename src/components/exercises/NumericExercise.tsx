import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseFeedback, ExerciseShell } from "./ExerciseShell";
import type { NumericExercise as NumericExerciseData } from "@/lib/exercises";

/** Estimate or calculate a number, judged against a tolerance. */
export function NumericExerciseCard({
  exercise,
  index,
  total,
  showCount = true,
  answer,
  onAnswer,
}: {
  exercise: NumericExerciseData;
  index: number;
  total: number;
  showCount?: boolean;
  answer: number | undefined;
  onAnswer: (value: number, score: number) => void;
}) {
  const [value, setValue] = useState("");
  const answered = answer !== undefined;
  const off = answered ? Math.abs(answer - exercise.answer) : 0;
  const correct = answered && off <= exercise.tolerance;
  const unit = exercise.unit ?? "";

  const submit = () => {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(parsed)) return;
    onAnswer(parsed, Math.abs(parsed - exercise.answer) <= exercise.tolerance ? 1 : 0);
  };

  return (
    <ExerciseShell
      kind="numeric"
      index={index}
      total={total}
      showCount={showCount}
      question={exercise.question}
      passage={exercise.scenario}
    >
      {!answered ? (
        <div className="mt-4">
          <label
            htmlFor={`numeric-${index}`}
            className="text-[13px] font-semibold text-muted-foreground"
          >
            Your answer{unit ? ` (${unit})` : ""}
          </label>
          <input
            id={`numeric-${index}`}
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            placeholder="Type a number"
            className="mt-2 h-12 w-full rounded-2xl border-2 border-border bg-background px-4 text-base font-bold outline-none focus:border-primary"
          />
          <Button
            type="button"
            disabled={value.trim() === ""}
            onClick={submit}
            className="sticky-action mt-4 h-11 w-full rounded-full font-semibold"
          >
            Check my number
          </Button>
        </div>
      ) : (
        <ExerciseFeedback
          correct={correct}
          headline={
            correct
              ? `Right — about ${exercise.answer}${unit}.`
              : `It's about ${exercise.answer}${unit}; you were ${Math.round(off * 100) / 100}${unit} out.`
          }
          body={exercise.solution}
        />
      )}
    </ExerciseShell>
  );
}
