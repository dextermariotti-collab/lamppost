import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseFeedback, ExerciseShell, OptionButton } from "./ExerciseShell";
import type { PredictExercise as PredictExerciseData } from "@/lib/exercises";

export type PredictAnswer = { choice: number; confidence: number };

/** Calibration line: what confidence they claimed vs what actually happened. */
function calibration(confidence: number, correct: boolean) {
  if (correct) {
    return confidence >= 80
      ? `You said ${confidence}% — and you were right. Well calibrated.`
      : `You said ${confidence}% and got it right; you knew more than you credited yourself for.`;
  }
  return confidence >= 80
    ? `You said ${confidence}% — that's overconfident. This is the gap worth watching.`
    : `You said ${confidence}%, so you already sensed the doubt. Good instinct, wrong call.`;
}

/** Commit to a prediction and a confidence level BEFORE the answer is shown. */
export function PredictExerciseCard({
  exercise,
  index,
  total,
  showCount = true,
  answer,
  onAnswer,
}: {
  exercise: PredictExerciseData;
  index: number;
  total: number;
  showCount?: boolean;
  answer: PredictAnswer | undefined;
  onAnswer: (answer: PredictAnswer, score: number) => void;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(60);
  const answered = answer !== undefined;
  const correct = answer?.choice === exercise.correct;

  return (
    <ExerciseShell
      kind="predict"
      index={index}
      total={total}
      showCount={showCount}
      passage={exercise.scenario}
    >
      <p className="mt-4 text-[15px] font-semibold leading-snug text-foreground">
        {exercise.question}
      </p>

      <div className="mt-3 space-y-2">
        {exercise.options.map((option, i) => (
          <OptionButton
            key={option}
            label={option}
            picked={answered ? answer.choice === i : choice === i}
            isAnswer={i === exercise.correct}
            answered={answered}
            onPick={() => setChoice(i)}
          />
        ))}
      </div>

      {!answered && (
        <div className="mt-4">
          <label
            htmlFor={`confidence-${index}`}
            className="flex items-baseline justify-between text-[13px] font-semibold text-muted-foreground"
          >
            How sure are you?
            <span className="text-base font-bold text-primary-text">{confidence}%</span>
          </label>
          <input
            id={`confidence-${index}`}
            aria-valuetext={`${confidence} percent`}
            type="range"
            min={0}
            max={100}
            step={5}
            value={confidence}
            onChange={(event) => setConfidence(Number(event.target.value))}
            className="range-touch mt-1"
          />
          <div className="sticky-action mt-4">
            <Button
              type="button"
              disabled={choice === null}
              onClick={() =>
                choice !== null &&
                onAnswer({ choice, confidence }, choice === exercise.correct ? 1 : 0)
              }
              className="h-11 w-full rounded-sm font-semibold"
            >
              Lock in my call
            </Button>
          </div>
        </div>
      )}

      {answered && (
        <ExerciseFeedback
          correct={!!correct}
          headline={calibration(answer.confidence, !!correct)}
          body={exercise.explanation}
        />
      )}
    </ExerciseShell>
  );
}
