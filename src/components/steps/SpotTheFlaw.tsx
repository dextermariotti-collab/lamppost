import { Check, X } from "lucide-react";
import { useState } from "react";
import { checkFlawTap } from "@/lib/steps/checks";
import type { FlawStep } from "@/lib/steps/types";
import type { StepResult } from "@/lib/steps/scoring";
import { StepFrame } from "./StepFrame";
import { useStepEngine } from "./useStepEngine";

/**
 * Read a short passage and tap the phrase that contains the flaw. The passage stays one
 * paragraph: tappable phrases are underlined where they sit, and each is a button, so it works
 * by touch, mouse and keyboard alike. A wrong tap marks that phrase with a dashed underline and
 * a cross and says why it isn't the problem; the passage stays live, so the next tap is the
 * next try. The right one gets a solid underline and a tick, and the mistake is named.
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
        "Not quite",
      );
    }
  };

  return (
    <StepFrame
      label={step.label ?? "Spot the flaw"}
      prompt={step.prompt}
      hint={step.hint}
      engine={engine}
      noRetry
      onShowAnswer={() => {
        setTried((prev) => new Set(prev).add(flawIndex));
        engine.reveal(
          { tapped: flawIndex },
          `The flaw is in "${step.passage[flawIndex]!.text}": ${step.fallacy}. ${step.why}`,
        );
      }}
    >
      <p className="rounded-2xl bg-primary-soft p-4 text-[15px] font-semibold leading-[2.2] text-accent-foreground">
        {step.passage.map((part, i) => {
          if (!part.tappable) return <span key={i}>{part.text} </span>;
          const isFlaw = i === flawIndex;
          const wasTried = tried.has(i);
          const revealedFlaw = isFlaw && settled;
          // Keep the mark glued to the last word so it never wraps onto a line of its own.
          const cut = part.text.lastIndexOf(" ") + 1;
          const head = part.text.slice(0, cut);
          const tail = part.text.slice(cut);
          const cls = revealedFlaw
            ? "bg-success/15 decoration-success"
            : wasTried
              ? "bg-destructive/10 decoration-destructive decoration-dashed"
              : "bg-card decoration-primary/60 hover:bg-card/70";
          return (
            <span key={i}>
              <button
                type="button"
                disabled={settled || wasTried}
                aria-label={`${part.text}${revealedFlaw ? " (the flaw)" : wasTried ? " (not the flaw)" : ""}`}
                onClick={() => tap(i)}
                className={`inline rounded-md px-1 py-1 text-left align-baseline font-semibold underline decoration-2 underline-offset-4 box-decoration-clone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${cls}`}
              >
                {head}
                <span className="whitespace-nowrap">
                  {tail}
                  {revealedFlaw && (
                    <Check aria-hidden className="ml-1 inline h-4 w-4 text-success" />
                  )}
                  {wasTried && !revealedFlaw && (
                    <X aria-hidden className="ml-1 inline h-4 w-4 text-destructive" />
                  )}
                </span>
              </button>{" "}
            </span>
          );
        })}
      </p>
    </StepFrame>
  );
}
