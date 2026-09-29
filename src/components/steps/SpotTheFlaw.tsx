import { Check, X } from "lucide-react";
import { useState } from "react";
import { checkFlawTap } from "@/lib/steps/checks";
import type { FlawStep } from "@/lib/steps/types";
import type { StepResult } from "@/lib/steps/scoring";
import { StepFrame } from "./StepFrame";
import { useStepEngine } from "./useStepEngine";

/**
 * Read a short passage and tap the phrase that contains the flaw. Each tappable phrase is a
 * button, so it works by touch, mouse and keyboard alike. A wrong tap marks that phrase with
 * a dashed outline and a cross and says why it isn't the problem; the right one gets a solid
 * outline and a tick, and the mistake is named.
 */
export function SpotTheFlaw({
  step,
  onResolve,
}: {
  step: FlawStep;
  onResolve: (result: StepResult) => void;
}) {
  const engine = useStepEngine(onResolve);
  const [tried, setTried] = useState<Set<number>>(new Set());
  const flawIndex = step.passage.findIndex((p) => p.flaw);
  const settled = engine.phase === "right" || engine.phase === "revealed";

  const tap = (index: number) => {
    const result = checkFlawTap(step, index);
    if (!result) return;
    setTried((prev) => new Set(prev).add(index));
    if (result.correct) {
      engine.right({ tapped: index }, `That's it: ${result.fallacy}. ${step.why}`);
    } else {
      engine.wrong(
        result.whyNot ?? "That part is fine on its own. Look for the step that doesn't follow.",
      );
    }
  };

  return (
    <StepFrame
      label="Spot the flaw"
      prompt={step.prompt}
      hint={step.hint}
      engine={engine}
      onShowAnswer={() => {
        setTried((prev) => new Set(prev).add(flawIndex));
        engine.reveal(
          { tapped: flawIndex },
          `The flaw is in "${step.passage[flawIndex]!.text}": ${step.fallacy}. ${step.why}`,
        );
      }}
    >
      <p className="rounded-2xl bg-primary-soft p-4 text-[15px] font-semibold leading-loose text-accent-foreground">
        {step.passage.map((part, i) => {
          if (!part.tappable) return <span key={i}>{part.text} </span>;
          const isFlaw = i === flawIndex;
          const wasTried = tried.has(i);
          const revealedFlaw = isFlaw && settled;
          const cls = revealedFlaw
            ? "border-success bg-success/15"
            : wasTried
              ? "border-destructive border-dashed bg-destructive/5"
              : "border-primary/50 bg-card hover:bg-primary-soft";
          return (
            <span key={i}>
              <button
                type="button"
                disabled={settled}
                aria-label={`${part.text}${revealedFlaw ? " (the flaw)" : wasTried ? " (not the flaw)" : ""}`}
                onClick={() => tap(i)}
                className={`inline min-h-11 rounded-lg border-2 px-1.5 py-1 text-left align-baseline font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${cls}`}
              >
                {part.text}
                {revealedFlaw && <Check aria-hidden className="ml-1 inline h-4 w-4 text-success" />}
                {wasTried && !revealedFlaw && (
                  <X aria-hidden className="ml-1 inline h-4 w-4 text-destructive" />
                )}
              </button>{" "}
            </span>
          );
        })}
      </p>
    </StepFrame>
  );
}
