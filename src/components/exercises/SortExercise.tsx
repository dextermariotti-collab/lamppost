import { Check, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseFeedback, ExerciseShell } from "./ExerciseShell";
import type { SortBucket, SortExercise as SortExerciseData } from "@/lib/exercises";

const BUCKETS: { id: SortBucket; label: string }[] = [
  { id: "fact", label: "Fact" },
  { id: "opinion", label: "Opinion" },
  { id: "value", label: "Value" },
];

export type SortAnswer = Record<string, SortBucket>;

/** Drop each statement into fact, opinion or value. */
export function SortExerciseCard({
  exercise,
  index,
  total,
  showCount = true,
  answer,
  onAnswer,
}: {
  exercise: SortExerciseData;
  index: number;
  total: number;
  showCount?: boolean;
  answer: SortAnswer | undefined;
  onAnswer: (answer: SortAnswer, score: number) => void;
}) {
  const [picks, setPicks] = useState<SortAnswer>({});
  const answered = answer !== undefined;
  const shown = answer ?? picks;
  const allPicked = exercise.statements.every((_, i) => shown[String(i)]);
  const correctCount = exercise.statements.filter((s, i) => shown[String(i)] === s.bucket).length;

  return (
    <ExerciseShell kind="sort" index={index} total={total} showCount={showCount}>
      <p className="mt-3 text-[13px] font-semibold text-muted-foreground">
        A fact can be checked, an opinion is a preference, a value says what ought to matter.
      </p>
      <div className="mt-4 space-y-3">
        {exercise.statements.map((statement, i) => {
          const picked = shown[String(i)];
          const isRight = picked === statement.bucket;
          return (
            <div
              key={statement.text}
              className={`rounded-2xl border-2 p-3 transition-all ${
                answered
                  ? isRight
                    ? "border-success bg-success/10"
                    : "border-destructive/50 bg-destructive/5"
                  : "border-border"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">{statement.text}</p>
              <div className="mt-2 flex gap-2">
                {BUCKETS.map((bucket) => {
                  const isPicked = picked === bucket.id;
                  const isSolution = answered && statement.bucket === bucket.id;
                  return (
                    <button
                      key={bucket.id}
                      type="button"
                      onClick={() =>
                        !answered && setPicks((prev) => ({ ...prev, [String(i)]: bucket.id }))
                      }
                      aria-pressed={isPicked}
                      className={`flex-1 rounded-full border-2 px-2 py-1.5 text-[12px] font-bold transition-all ${
                        isSolution
                          ? "border-success bg-success/15 text-foreground"
                          : isPicked
                            ? answered
                              ? "border-destructive bg-destructive/10 text-foreground"
                              : "border-primary bg-primary-soft text-accent-foreground"
                            : "border-border text-muted-foreground"
                      }`}
                    >
                      {bucket.label}
                      {answered && isSolution && <Check className="ml-1 inline h-3 w-3" />}
                      {answered && isPicked && !isRight && <X className="ml-1 inline h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p className="mt-2 text-[12px] font-semibold text-muted-foreground">
                  {statement.why}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!answered ? (
        <Button
          type="button"
          disabled={!allPicked}
          onClick={() =>
            onAnswer(
              picks,
              exercise.statements.filter((s, i) => picks[String(i)] === s.bucket).length /
                exercise.statements.length,
            )
          }
          className="sticky-action mt-4 h-11 w-full rounded-full font-semibold"
        >
          Check my sort
        </Button>
      ) : (
        <ExerciseFeedback
          correct={correctCount === exercise.statements.length}
          headline={`${correctCount} of ${exercise.statements.length} sorted correctly.`}
          body="Arguments go wrong fastest when a value claim is treated as a checkable fact."
        />
      )}
    </ExerciseShell>
  );
}
