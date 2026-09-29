/**
 * The bar across the top of a lesson: one segment per step, filled as steps are finished, with
 * the current one outlined. A visible "Step 3 of 8" says the same in words, and the whole thing
 * is a labelled progress bar for assistive technology.
 */
export function StepProgress({
  total,
  current,
  done,
}: {
  total: number;
  /** Zero-based index of the step on screen. */
  current: number;
  /** How many steps are finished. */
  done: number;
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
        className="flex gap-1.5"
      >
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className={`h-2 flex-1 rounded-full transition-colors duration-500 ${
              i < done
                ? "bg-primary"
                : i === current
                  ? "bg-primary/35 ring-2 ring-primary ring-offset-1 ring-offset-background"
                  : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
        Step {Math.min(current + 1, total)} of {total}
      </p>
    </div>
  );
}
