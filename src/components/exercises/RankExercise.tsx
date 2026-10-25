import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseFeedback, ExerciseShell } from "./ExerciseShell";
import { ReorderList } from "./ReorderList";
import type { RankExercise as RankExerciseData } from "@/lib/exercises";

/** Stable starting order that isn't the answer. */
function scramble(items: string[]) {
  const order = [...items];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order.join("|") === items.join("|") ? [...order].reverse() : order;
}

/** Order evidence strongest to weakest; drag on desktop, arrows anywhere. */
export function RankExerciseCard({
  exercise,
  index,
  total,
  showCount = true,
  answer,
  onAnswer,
}: {
  exercise: RankExerciseData;
  index: number;
  total: number;
  showCount?: boolean;
  answer: string[] | undefined;
  onAnswer: (order: string[], score: number) => void;
}) {
  const solution = exercise.items.map((i) => i.text);
  const [order, setOrder] = useState<string[]>(() => scramble(solution));
  const answered = answer !== undefined;
  const shown = answer ?? order;

  const move = (from: number, to: number) => {
    if (answered || to < 0 || to >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  };

  const correctCount = shown.filter((text, i) => text === solution[i]).length;
  const score = correctCount / solution.length;

  return (
    <ExerciseShell
      kind="rank"
      index={index}
      total={total}
      showCount={showCount}
      passage={exercise.claim}
    >
      <ReorderList
        order={shown}
        solution={solution}
        answered={answered}
        whyOf={(text) => exercise.items.find((item) => item.text === text)?.why}
        onMove={move}
        dragging
      />

      {!answered ? (
        <div className="sticky-action mt-4">
          <Button
            type="button"
            onClick={() =>
              onAnswer(order, order.filter((t, i) => t === solution[i]).length / solution.length)
            }
            className="h-11 w-full rounded-sm font-semibold"
          >
            Check my order
          </Button>
        </div>
      ) : (
        <ExerciseFeedback
          correct={score === 1}
          headline={
            score === 1
              ? "Perfect ordering."
              : `${correctCount} of ${solution.length} in the right place.`
          }
          body="Strength comes from how directly the evidence tests the claim, not how convincing it sounds."
        />
      )}
    </ExerciseShell>
  );
}
