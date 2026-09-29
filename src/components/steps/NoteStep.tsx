import { Lightbulb } from "lucide-react";
import { useEffect } from "react";
import type { StepResult } from "@/lib/steps/scoring";
import type { NoteStep as NoteStepData } from "@/lib/steps/types";

/**
 * A short text card: the only step that asks nothing of the learner, so it is resolved as
 * soon as it is seen. Used sparingly, to say the one thing worth carrying away.
 */
export function NoteStep({
  step,
  onResolve,
}: {
  step: NoteStepData;
  onResolve: (result: StepResult) => void;
}) {
  useEffect(() => {
    onResolve({ score: 1, answer: null, wrongAttempts: 0, hintUsed: false, revealed: false });
    // Resolved once, when the card first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      className="animate-rise-in rounded-3xl bg-card p-5 shadow-card"
      aria-label="Worth remembering"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-text">
        <Lightbulb aria-hidden className="h-3.5 w-3.5" /> Worth remembering
      </p>
      <p className="mt-2 text-lg font-semibold leading-snug">{step.prompt}</p>
    </section>
  );
}
