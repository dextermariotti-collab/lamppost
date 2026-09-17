import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseFeedback, ExerciseShell } from "./ExerciseShell";
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
  const [dragging, setDragging] = useState<number | null>(null);
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
      <ol className="mt-4 space-y-2">
        {shown.map((text, i) => {
          const rightSpot = answered && text === solution[i];
          return (
            <li
              key={text}
              draggable={!answered}
              onDragStart={() => setDragging(i)}
              onDragOver={(event) => {
                event.preventDefault();
                if (dragging !== null && dragging !== i) {
                  move(dragging, i);
                  setDragging(i);
                }
              }}
              onDragEnd={() => setDragging(null)}
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
                    onClick={() => move(i, i - 1)}
                    className="rounded-full p-1 text-muted-foreground hover:text-primary"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move "${text}" down`}
                    onClick={() => move(i, i + 1)}
                    className="rounded-full p-1 text-muted-foreground hover:text-primary"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </span>
              )}
              {!answered && (
                <GripVertical
                  aria-hidden
                  className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/60"
                />
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
          Check my ordering
        </Button>
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
