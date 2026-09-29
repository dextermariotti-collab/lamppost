import { useState } from "react";
import type { ChoiceStep as ChoiceStepData } from "@/lib/steps/types";
import type { StepResult } from "@/lib/steps/scoring";
import { OptionList } from "./OptionList";
import { StepFrame } from "./StepFrame";
import { useStepEngine } from "./useStepEngine";

/** A plain question with a short stimulus, for the few places nothing more specific fits. */
export function ChoiceStep({
  step,
  onResolve,
}: {
  step: ChoiceStepData;
  onResolve: (result: StepResult) => void;
}) {
  const engine = useStepEngine(onResolve);
  const [picked, setPicked] = useState<number | null>(null);
  const known = engine.phase === "right" || engine.phase === "revealed" ? step.correct : null;

  return (
    <StepFrame
      label={step.label ?? "Your call"}
      prompt={step.prompt}
      hint={step.hint}
      engine={engine}
      onRetry={() => setPicked(null)}
      onShowAnswer={() => {
        setPicked(step.correct);
        engine.reveal({ choice: step.correct }, step.why);
      }}
    >
      {step.stimulus && (
        <blockquote className="mb-4 rounded-2xl bg-primary-soft p-4 text-[15px] font-semibold leading-relaxed text-accent-foreground">
          {step.stimulus}
        </blockquote>
      )}
      <OptionList
        name="Answers"
        options={step.options}
        picked={picked}
        correct={known}
        locked={engine.done}
        onPick={(i) => {
          setPicked(i);
          if (i === step.correct) engine.right({ choice: i }, step.why);
          else engine.wrong(step.options[i]!.whyNot ?? "That isn't it.");
        }}
      />
    </StepFrame>
  );
}
