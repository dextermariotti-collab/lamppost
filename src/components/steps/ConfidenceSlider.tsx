import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { calibrationNote, confidenceLabel } from "@/lib/steps/checks";
import type { StepResult } from "@/lib/steps/scoring";
import type { ConfidenceStep } from "@/lib/steps/types";
import { OptionList } from "./OptionList";
import { StepFrame } from "./StepFrame";
import { useStepEngine } from "./useStepEngine";

/**
 * Commit to an answer AND say how sure you are, before anything is revealed. There is one go:
 * the point is whether your confidence matched what happened, so there's no retry. The answer
 * is stored as `{ choice, confidence }`, which is what the calibration chart on the Progress
 * screen reads.
 */
export function ConfidenceSlider({
  step,
  onResolve,
}: {
  step: ConfidenceStep;
  onResolve: (result: StepResult) => void;
}) {
  const engine = useStepEngine(onResolve);
  const sliderId = useId();
  const [picked, setPicked] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(50);
  const [touched, setTouched] = useState(false);
  const [locked, setLocked] = useState(false);

  const lockIn = () => {
    if (picked === null) return;
    setLocked(true);
    const right = picked === step.correct;
    const answer = { choice: picked, confidence };
    const note = calibrationNote(confidence, right);
    if (right) {
      engine.right(answer, `${note} ${step.why}`);
    } else {
      const mistake = step.options[picked]!.whyNot ?? "That isn't the best answer.";
      engine.reveal(answer, `${mistake} ${note} ${step.why}`, "Not this time");
    }
  };

  return (
    <StepFrame
      label={step.label ?? "How sure are you?"}
      prompt={step.prompt}
      hint={step.hint}
      engine={engine}
    >
      <p className="mb-3 rounded-2xl bg-primary-soft p-4 text-[15px] font-semibold leading-relaxed text-accent-foreground">
        {step.question}
      </p>
      <OptionList
        name="Answers"
        options={step.options}
        picked={picked}
        correct={locked ? step.correct : null}
        locked={locked}
        onPick={setPicked}
      />

      <div className="mt-4 rounded-2xl border border-border p-3">
        <label htmlFor={sliderId} className="flex items-baseline justify-between text-sm font-bold">
          How sure are you?
          <span className="text-base text-primary-text">
            {confidence}% · {confidenceLabel(confidence)}
          </span>
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={100}
          step={5}
          value={confidence}
          disabled={locked}
          onChange={(e) => {
            setConfidence(Number(e.target.value));
            setTouched(true);
          }}
          onPointerDown={() => setTouched(true)}
          onKeyDown={() => setTouched(true)}
          aria-valuetext={`${confidence} percent, ${confidenceLabel(confidence)}`}
          className="range-touch mt-2 w-full accent-[var(--primary)]"
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground" aria-hidden>
          <span>Just guessing</span>
          <span>Certain</span>
        </div>
      </div>

      {!locked && (
        <Button
          type="button"
          onClick={lockIn}
          disabled={picked === null || !touched}
          className="mt-4 h-11 w-full rounded-full font-semibold"
        >
          {picked === null ? "Choose an answer" : !touched ? "Set how sure you are" : "Lock it in"}
        </Button>
      )}
    </StepFrame>
  );
}
