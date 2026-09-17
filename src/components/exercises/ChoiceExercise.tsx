import { ExerciseFeedback, ExerciseShell, OptionButton } from "./ExerciseShell";
import type {
  AssumptionExercise,
  ClaimExercise,
  FlawExercise,
  JudgeExercise,
  RewriteExercise,
  SteelmanExercise,
} from "@/lib/exercises";

type ChoiceKindExercise =
  | ClaimExercise
  | FlawExercise
  | AssumptionExercise
  | SteelmanExercise
  | JudgeExercise
  | RewriteExercise;

const passageFor = (exercise: ChoiceKindExercise) => {
  switch (exercise.kind) {
    case "claim":
      return exercise.passage;
    case "flaw":
      return exercise.claim;
    case "assumption":
      return exercise.argument;
    case "steelman":
      return exercise.view;
    case "judge":
      return exercise.passage;
    case "rewrite":
      return exercise.original;
  }
};

const headline = (exercise: ChoiceKindExercise, correct: boolean) => {
  switch (exercise.kind) {
    case "claim":
      return correct
        ? "That's the conclusion everything else was supporting."
        : "That's a premise, not the claim itself.";
    case "flaw":
      return correct
        ? `Exactly — you named it.${exercise.fallacy ? ` (${exercise.fallacy})` : ""}`
        : `Not quite — here's the real break.${exercise.fallacy ? ` (${exercise.fallacy})` : ""}`;
    case "assumption":
      return correct ? "That's the load-bearing one." : "That one isn't doing the work.";
    case "steelman":
      return correct ? "That's the strongest version." : "That version weakens the view.";
    case "judge":
      return correct ? "That's the right call." : "Not the call this one calls for.";
    case "rewrite":
      return correct ? "That rewrite holds up." : "That rewrite still slips away.";
  }
};

/** Every pick-one drill shares this interaction. */
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
  const keyed = exercise.options[exercise.correct];

  return (
    <ExerciseShell
      kind={exercise.kind}
      index={index}
      total={total}
      showCount={showCount}
      question={"question" in exercise ? exercise.question : undefined}
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
          body={
            <>
              {!correct && keyed ? (
                <span className="mb-1 block">
                  The answer is <span className="text-foreground">“{keyed}”</span>.
                </span>
              ) : null}
              {exercise.explanation}
            </>
          }
        />
      )}
    </ExerciseShell>
  );
}
