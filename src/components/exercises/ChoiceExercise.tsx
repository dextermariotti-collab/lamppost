import { ExerciseFeedback, ExerciseShell, OptionButton } from "./ExerciseShell";
import type {
  AssumptionExercise,
  ClaimExercise,
  FlawExercise,
  SteelmanExercise,
} from "@/lib/exercises";

type ChoiceKindExercise = ClaimExercise | FlawExercise | AssumptionExercise | SteelmanExercise;

const passageFor = (exercise: ChoiceKindExercise) =>
  exercise.kind === "claim"
    ? exercise.passage
    : exercise.kind === "flaw"
      ? exercise.claim
      : exercise.kind === "assumption"
        ? exercise.argument
        : exercise.view;

const headline = (exercise: ChoiceKindExercise, correct: boolean) => {
  if (exercise.kind === "claim") {
    return correct
      ? "That's the conclusion everything else was supporting."
      : "That's a premise, not the claim itself.";
  }
  if (exercise.kind === "flaw") {
    return correct
      ? `Exactly — you named it.${exercise.fallacy ? ` (${exercise.fallacy})` : ""}`
      : `Not quite — here's the real break.${exercise.fallacy ? ` (${exercise.fallacy})` : ""}`;
  }
  if (exercise.kind === "assumption") {
    return correct ? "That's the load-bearing one." : "That one isn't doing the work.";
  }
  return correct ? "That's the strongest version." : "That version weakens the view.";
};

/** Flaw, hidden assumption and steelman all share the pick-one interaction. */
export function ChoiceExercise({
  exercise,
  index,
  total,
  showCount = true,
  answer,
  onAnswer,
}: {
  exercise: ChoiceKindExercise;
  index: number;
  total: number;
  showCount?: boolean;
  answer: number | undefined;
  onAnswer: (choice: number, score: number) => void;
}) {
  const answered = answer !== undefined;
  const correct = answer === exercise.correct;

  return (
    <ExerciseShell
      kind={exercise.kind}
      index={index}
      total={total}
      showCount={showCount}
      passage={passageFor(exercise)}
    >
      <div className="mt-4 space-y-2">
        {exercise.options.map((option, i) => (
          <OptionButton
            key={option}
            label={option}
            picked={answer === i}
            isAnswer={i === exercise.correct}
            answered={answered}
            onPick={() => onAnswer(i, i === exercise.correct ? 1 : 0)}
          />
        ))}
      </div>
      {answered && (
        <ExerciseFeedback
          correct={correct}
          headline={headline(exercise, correct)}
          body={exercise.explanation}
        />
      )}
    </ExerciseShell>
  );
}
