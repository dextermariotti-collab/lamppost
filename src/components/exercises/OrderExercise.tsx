import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseFeedback, ExerciseShell } from "./ExerciseShell";
import { ReorderList } from "./ReorderList";
import type { OrderExercise as OrderExerciseData } from "@/lib/exercises";

function scramble(items: string[]) {
  const order = [...items];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order.join("|") === items.join("|") ? [...order].reverse() : order;
}

/** Put cards in order: premises into an argument, checks into a sequence. */
export function OrderExerciseCard({
  exercise,
  index,
  total,
  showCount = true,
  answer,
  onAnswer,
}: {
  exercise: OrderExerciseData;
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
  const rightCount = shown.filter((text, i) => text === solution[i]).length;

  const move = (from: number, to: number) => {
    if (answered) return;
    setOrder((prev) => {
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  };

  return (
    <ExerciseShell
      kind="order"
      index={index}
      total={total}
      showCount={showCount}
      question={exercise.question}
      passage={exercise.passage || undefined}
    >
      <ReorderList
        order={shown}
        solution={solution}
        answered={answered}
        whyOf={(text) => exercise.items.find((item) => item.text === text)?.why}
        onMove={move}
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
          correct={rightCount === solution.length}
          headline={
            rightCount === solution.length
              ? "That's the order."
              : `${rightCount} of ${solution.length} in the right place.`
          }
          body="Order by what supports what, not by how the text happened to read."
        />
      )}
    </ExerciseShell>
  );
}
