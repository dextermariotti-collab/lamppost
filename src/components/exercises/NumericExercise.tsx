import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseFeedback, ExerciseShell } from "./ExerciseShell";
import type { NumericExercise as NumericExerciseData } from "@/lib/exercises";
import { formatWithUnit, parseNumericAnswer } from "@/lib/numeric-answer";

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
  const [problem, setProblem] = useState<string | null>(null);
  const unit = exercise.unit ?? "";

  const submit = () => {
    const parsed = parseNumericAnswer(value);
    if (parsed === null) {
      setProblem("Type one number, like 120.");
      return;
    }
    setProblem(null);
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
            onChange={(event) => {
              setValue(event.target.value);
              setProblem(null);
            }}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            aria-invalid={problem !== null}
            aria-describedby={problem ? `numeric-${index}-problem` : undefined}
            placeholder="Type a number"
            className="mt-2 h-12 w-full rounded-2xl border-2 border-border bg-background px-4 text-base font-bold outline-none focus:border-primary"
          />
          {problem && (
            <p
              id={`numeric-${index}-problem`}
              role="alert"
              className="mt-2 text-[13px] font-semibold text-destructive"
            >
              {problem}
            </p>
          )}
          <div className="sticky-action mt-4">
            <Button
              type="button"
              disabled={value.trim() === ""}
              onClick={submit}
              className="h-11 w-full rounded-sm font-semibold"
            >
              Check my number
            </Button>
          </div>
        </div>
      ) : (
        <ExerciseFeedback
          correct={correct}
          headline={
            correct
              ? `Right — about ${formatWithUnit(exercise.answer, unit)}.`
              : `It's about ${formatWithUnit(exercise.answer, unit)}; you were ${formatWithUnit(Math.round(off * 100) / 100, unit)} out.`
          }
          body={exercise.solution}
        />
      )}
    </ExerciseShell>
  );
}
