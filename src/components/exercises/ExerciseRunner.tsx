import { ChoiceExercise } from "./ChoiceExercise";
import { PredictExerciseCard, type PredictAnswer } from "./PredictExercise";
import { RankExerciseCard } from "./RankExercise";
import { SortExerciseCard, type SortAnswer } from "./SortExercise";
import type { Exercise } from "@/lib/exercises";

/** Renders whichever drill is current and reports the answer plus its score. */
export function ExerciseRunner({
  exercise,
  index,
  total,
  answer,
  onAnswer,
}: {
  exercise: Exercise;
  index: number;
  total: number;
  answer: unknown;
  onAnswer: (answer: unknown, score: number) => void;
}) {
  switch (exercise.kind) {
    case "claim":
    case "flaw":
    case "assumption":
    case "steelman":
      return (
        <ChoiceExercise
          exercise={exercise}
          index={index}
          total={total}
          answer={typeof answer === "number" ? answer : undefined}
          onAnswer={onAnswer}
        />
      );
    case "predict":
      return (
        <PredictExerciseCard
          exercise={exercise}
          index={index}
          total={total}
          answer={(answer as PredictAnswer | undefined) ?? undefined}
          onAnswer={onAnswer}
        />
      );
    case "rank":
      return (
        <RankExerciseCard
          exercise={exercise}
          index={index}
          total={total}
          answer={Array.isArray(answer) ? (answer as string[]) : undefined}
          onAnswer={onAnswer}
        />
      );
    case "sort":
      return (
        <SortExerciseCard
          exercise={exercise}
          index={index}
          total={total}
          answer={(answer as SortAnswer | undefined) ?? undefined}
          onAnswer={onAnswer}
        />
      );
  }
}
