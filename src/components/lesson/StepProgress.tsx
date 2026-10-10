import type { CSSProperties } from "react";
import { unitAccent } from "@/lib/unit-accent";

/**
 * A lesson's progress as a stretch of its unit's line: one stop per step, filled as steps are
 * finished, with the current one ringed. A visible "Step 3 of 8" says the same in words, and
 * the whole thing is a labelled progress bar for assistive technology. A daily case mixes units,
 * so each of its stops can take its own unit's colour instead (`stopUnits`).
 */
export function StepProgress({
  total,
  current,
  done,
  unitId = "claims",
  stopUnits,
}: {
  total: number;
  /** Zero-based index of the step on screen. */
  current: number;
  /** How many steps are finished. */
  done: number;
  /** Whose line colour to draw it in. */
  unitId?: string;
  /** One unit per stop, to colour each stop by its own unit. */
  stopUnits?: readonly string[] | undefined;
}) {
  return (
    <div className="px-5">
      <div
        role="progressbar"
        aria-label="Lesson progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={`${done} of ${total} steps done`}
        className="relative flex h-6 items-center justify-between"
        style={{ "--line": unitAccent(unitId).color } as CSSProperties}
      >
        <span
          aria-hidden
          className={`absolute inset-x-1 top-1/2 h-1 -translate-y-1/2 ${stopUnits ? "bg-edge" : "bg-[var(--line)]"}`}
        />
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            style={
              stopUnits?.[i]
                ? ({ "--line": unitAccent(stopUnits[i]).color } as CSSProperties)
                : undefined
            }
            className={`relative rounded-full transition-colors duration-500 ${
              i === current && i >= done
                ? "h-[18px] w-[18px] border-4 border-foreground bg-card"
                : i < done
                  ? "h-3 w-3 border-2 border-[var(--line)] bg-[var(--line)]"
                  : "h-3 w-3 border-2 border-[var(--line)] bg-background"
            }`}
          />
        ))}
      </div>
      <p className="mt-1 font-mono text-[11px] font-bold text-muted-foreground">
        Step {Math.min(current + 1, total)} of {total}
      </p>
    </div>
  );
}
