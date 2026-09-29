import { Check, X } from "lucide-react";
import { useState } from "react";
import type { StrongerStep } from "@/lib/steps/types";
import type { StepResult } from "@/lib/steps/scoring";
import { choiceClass } from "./choiceClass";
import { StepFrame } from "./StepFrame";
import { useStepEngine } from "./useStepEngine";

type Side = "a" | "b";

/**
 * Two arguments side by side. Pick the stronger one; the deciding factor is then named. Pick
 * the weaker one and the step says what is wrong with it specifically, then lets you choose again.
 */
export function WhichIsStronger({
  step,
  onResolve,
}: {
  step: StrongerStep;
  onResolve: (result: StepResult) => void;
}) {
  const engine = useStepEngine(onResolve);
  const [picked, setPicked] = useState<Side | null>(null);
  const settled = engine.phase === "right" || engine.phase === "revealed";
  const cards: { side: Side; label: string; text: string }[] = [
    { side: "a", label: "Argument A", text: step.a },
    { side: "b", label: "Argument B", text: step.b },
  ];

  const factorNote = `The deciding factor: ${step.factor}. ${step.why}`;

  return (
    <StepFrame
      label="Which is stronger?"
      prompt={step.prompt}
      hint={step.hint}
      engine={engine}
      onRetry={() => setPicked(null)}
      onShowAnswer={() => {
        setPicked(step.stronger);
        engine.reveal({ choice: step.stronger }, factorNote);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="The two arguments">
        {cards.map(({ side, label, text }) => {
          const isStronger = side === step.stronger;
          const state = settled
            ? isStronger
              ? "right"
              : "dim"
            : picked === side && engine.phase === "wrong"
              ? "wrong"
              : "idle";
          return (
            <button
              key={side}
              type="button"
              disabled={settled}
              aria-pressed={picked === side}
              onClick={() => {
                setPicked(side);
                if (side === step.stronger) engine.right({ choice: side }, factorNote);
                else engine.wrong(step.weakerWhy);
              }}
              className={`${choiceClass(state)} flex-col`}
            >
              <span className="flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-wide text-primary-text">
                {label}
                {settled && isStronger && (
                  <span className="flex items-center gap-1 text-xs normal-case text-success">
                    <Check aria-hidden className="h-4 w-4" /> Stronger
                  </span>
                )}
                {picked === side && engine.phase === "wrong" && (
                  <span className="flex items-center gap-1 text-xs normal-case text-destructive">
                    <X aria-hidden className="h-4 w-4" /> Weaker
                  </span>
                )}
              </span>
              <span className="block text-[15px] leading-relaxed">{text}</span>
            </button>
          );
        })}
      </div>
    </StepFrame>
  );
}
