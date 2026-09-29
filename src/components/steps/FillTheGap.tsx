import { useState } from "react";
import type { GapStep } from "@/lib/steps/types";
import type { StepResult } from "@/lib/steps/scoring";
import { OptionList } from "./OptionList";
import { StepFrame } from "./StepFrame";
import { useStepEngine } from "./useStepEngine";

/**
 * "Because … [missing assumption] … so …": choose the assumption that makes the argument
 * work. The gap fills in when it is right; a wrong pick names why that one doesn't bridge it.
 */
export function FillTheGap({
  step,
  onResolve,
}: {
  step: GapStep;
  onResolve: (result: StepResult) => void;
}) {
  const engine = useStepEngine(onResolve);
  const [picked, setPicked] = useState<number | null>(null);
  const known = engine.phase === "right" || engine.phase === "revealed" ? step.correct : null;
  const shown = known ?? picked;
  const gapFilled = known !== null;

  return (
    <StepFrame
      label="Fill the gap"
      prompt={step.prompt}
      hint={step.hint}
      engine={engine}
      onRetry={() => setPicked(null)}
      onShowAnswer={() => {
        setPicked(step.correct);
        engine.reveal({ choice: step.correct }, step.why);
      }}
    >
      <div className="space-y-1.5 text-sm font-semibold">
        <div className="rounded-2xl bg-primary-soft p-3 text-accent-foreground">
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary-text">
            Because
          </span>
          <p className="mt-0.5">{step.reason}</p>
        </div>
        <div
          className={`rounded-2xl border-2 p-3 ${
            gapFilled ? "border-success bg-success/10" : "border-dashed border-primary/60"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            The missing link
          </span>
          <p className="mt-0.5 min-h-6">
            {shown !== null ? (
              step.options[shown]!.text
            ) : (
              <span className="text-muted-foreground">Choose what has to be true…</span>
            )}
          </p>
        </div>
        <div className="rounded-2xl bg-primary-soft p-3 text-accent-foreground">
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary-text">
            So
          </span>
          <p className="mt-0.5">{step.conclusion}</p>
        </div>
      </div>

      <div className="mt-4">
        <OptionList
          name="What has to be true"
          options={step.options}
          picked={picked}
          correct={known}
          locked={engine.done}
          onPick={(i) => {
            setPicked(i);
            if (i === step.correct) engine.right({ choice: i }, step.why);
            else engine.wrong(step.options[i]!.whyNot ?? "That doesn't bridge the gap.");
          }}
        />
      </div>
    </StepFrame>
  );
}
