import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseFeedback, ExerciseShell } from "./ExerciseShell";
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

  // Moves by item identity against the latest state, so rapid taps never
  // act on a stale index.
  const move = (text: string, delta: number) => {
    if (answered) return;
    setOrder((prev) => {
      const from = prev.indexOf(text);
      const to = from + delta;
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
      <ol className="mt-4 space-y-2">
        {shown.map((text, i) => {
          const rightSpot = answered && text === solution[i];
          return (
            <li
              key={text}
              className={`flex items-start gap-2 rounded-2xl border-2 px-3 py-3 text-sm font-semibold transition-all ${
                answered
                  ? rightSpot
                    ? "border-success bg-success/10"
                    : "border-destructive/50 bg-destructive/5"
                  : "border-border bg-background"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-accent-foreground">
                {i + 1}
              </span>
              <span className="flex-1">
                {text}
                {answered && (
                  <span className="mt-1 block text-[12px] font-semibold text-muted-foreground">
                    {rightSpot ? "" : `Belongs at ${solution.indexOf(text) + 1}. `}
                    {exercise.items.find((item) => item.text === text)?.why}
                  </span>
                )}
              </span>
              {!answered && (
                <span className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    aria-label={`Move "${text}" up`}
                    onClick={() => move(text, -1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-primary"
                  >
                    <ChevronUp className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move "${text}" down`}
                    onClick={() => move(text, 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-primary"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {!answered ? (
        <Button
          type="button"
          onClick={() =>
            onAnswer(order, order.filter((t, i) => t === solution[i]).length / solution.length)
          }
          className="mt-4 h-11 w-full rounded-full font-semibold"
        >
          Check my order
        </Button>
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
