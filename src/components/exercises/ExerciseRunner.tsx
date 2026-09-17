import { ChartExerciseCard } from "./ChartExercise";
import { ChoiceExercise } from "./ChoiceExercise";
import { HighlightExerciseCard } from "./HighlightExercise";
import { NumericExerciseCard } from "./NumericExercise";
import { OrderExerciseCard } from "./OrderExercise";
import { PredictExerciseCard, type PredictAnswer } from "./PredictExercise";
import { RankExerciseCard } from "./RankExercise";
import { SliderExerciseCard, type SliderAnswer } from "./SliderExercise";
import { SortExerciseCard, type SortAnswer } from "./SortExercise";
import type { Exercise } from "@/lib/exercises";

/** Renders whichever drill is current and reports the answer plus its score. */
export function ExerciseRunner({
  exercise,
  index,
  total,
  showCount = true,
  answer,
  onAnswer,
}: {
  exercise: Exercise;
  index: number;
  total: number;
  /** Single-drill screens carry their own header, so the counter is hidden. */
  showCount?: boolean;
  answer: unknown;
  onAnswer: (answer: unknown, score: number) => void;
}) {
  switch (exercise.kind) {
    case "claim":
    case "flaw":
    case "assumption":
    case "steelman":
    case "judge":
    case "rewrite":
      return (
        <ChoiceExercise
          exercise={exercise}
          index={index}
          total={total}
          showCount={showCount}
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
          showCount={showCount}
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
          showCount={showCount}
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
          showCount={showCount}
          answer={(answer as SortAnswer | undefined) ?? undefined}
          onAnswer={onAnswer}
        />
      );
    case "highlight":
      return (
        <HighlightExerciseCard
          exercise={exercise}
          index={index}
          total={total}
          showCount={showCount}
          answer={Array.isArray(answer) ? (answer as number[]) : undefined}
          onAnswer={onAnswer}
        />
      );
    case "order":
      return (
        <OrderExerciseCard
          exercise={exercise}
          index={index}
          total={total}
          showCount={showCount}
          answer={Array.isArray(answer) ? (answer as string[]) : undefined}
          onAnswer={onAnswer}
        />
      );
    case "numeric":
      return (
        <NumericExerciseCard
          exercise={exercise}
          index={index}
          total={total}
          showCount={showCount}
          answer={typeof answer === "number" ? answer : undefined}
          onAnswer={onAnswer}
        />
      );
    case "slider":
      return (
        <SliderExerciseCard
          exercise={exercise}
          index={index}
          total={total}
          showCount={showCount}
          answer={(answer as SliderAnswer | undefined) ?? undefined}
          onAnswer={onAnswer}
        />
      );
    case "chart":
      return (
        <ChartExerciseCard
          exercise={exercise}
          index={index}
          total={total}
          showCount={showCount}
          answer={typeof answer === "number" ? answer : undefined}
          onAnswer={onAnswer}
        />
      );
  }
}
