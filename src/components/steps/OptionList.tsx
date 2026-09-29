import { Check, X } from "lucide-react";
import { choiceClass } from "./choiceClass";
import type { StepOption } from "@/lib/steps/types";

/**
 * Pick-one answers. After the learner acts, a right answer is marked with a tick and the
 * word "Correct", a wrong pick with a cross and "Not this one" (read out too), so the
 * outcome never rests on colour.
 */
export function OptionList({
  options,
  picked,
  correct,
  locked,
  onPick,
  name,
}: {
  options: readonly StepOption[];
  /** The option the learner last chose, if any. */
  picked: number | null;
  /** Set once the right answer is known (after a right pick, or a show-me). */
  correct: number | null;
  /** No more picking (answered, or the step is finished). */
  locked: boolean;
  onPick: (index: number) => void;
  name: string;
}) {
  return (
    <ul className="space-y-2" aria-label={name}>
      {options.map((option, i) => {
        const isRight = correct === i;
        const isWrongPick = picked === i && correct !== i;
        const state = isRight
          ? "right"
          : isWrongPick
            ? "wrong"
            : locked && correct !== null
              ? "dim"
              : "idle";
        return (
          <li key={option.text}>
            <button
              type="button"
              disabled={locked}
              aria-pressed={picked === i}
              onClick={() => onPick(i)}
              className={choiceClass(state)}
            >
              <span className="flex-1">{option.text}</span>
              {isRight && (
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-success">
                  <Check aria-hidden className="h-4 w-4" /> Correct
                </span>
              )}
              {isWrongPick && (
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-destructive">
                  <X aria-hidden className="h-4 w-4" /> Not this one
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
