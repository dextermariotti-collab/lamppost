import { ExerciseFeedback, ExerciseShell, OptionButton } from "./ExerciseShell";
import type { ChartExercise as ChartExerciseData } from "@/lib/exercises";

/** A small bar chart drawn from the data, with the axis window as the trick. */
function Chart({ exercise }: { exercise: ChartExerciseData }) {
  const span = Math.max(exercise.yMax - exercise.yMin, 0.0001);
  const height = 120;
  return (
    <figure className="mt-4 rounded-2xl border-2 border-border bg-background p-4">
      <figcaption className="text-[13px] font-bold text-foreground">{exercise.title}</figcaption>
      <div className="mt-3 flex items-end gap-2" style={{ height }}>
        {exercise.series.map((point) => {
          const pct = Math.min(100, Math.max(2, ((point.value - exercise.yMin) / span) * 100));
          return (
            <div key={point.label} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-bold text-muted-foreground">{point.value}</span>
              <div
                className="w-full rounded-t-md bg-primary"
                style={{ height: `${pct}%` }}
                aria-hidden
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-2">
        {exercise.series.map((point) => (
          <span
            key={point.label}
            className="flex-1 text-center text-[10px] font-semibold text-muted-foreground"
          >
            {point.label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[10px] font-semibold text-muted-foreground">
        Vertical axis: {exercise.yMin} to {exercise.yMax}
      </p>
    </figure>
  );
}

export function ChartExerciseCard({
  exercise,
  index,
  total,
  showCount = true,
  answer,
  onAnswer,
}: {
  exercise: ChartExerciseData;
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
      kind="chart"
      index={index}
      total={total}
      showCount={showCount}
      question={exercise.question}
    >
      <Chart exercise={exercise} />
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
          headline={correct ? "You spotted the trick." : "The trick is elsewhere."}
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
