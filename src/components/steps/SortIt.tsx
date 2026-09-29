import { Check, X } from "lucide-react";
import { useState } from "react";
import { checkSort, type Sorting } from "@/lib/steps/checks";
import type { StepResult } from "@/lib/steps/scoring";
import type { SortStep } from "@/lib/steps/types";
import { Button } from "@/components/ui/button";
import { DragGhost } from "./DragGhost";
import { StepFrame } from "./StepFrame";
import { useDragDrop } from "./useDragDrop";
import { useStepEngine } from "./useStepEngine";

const POOL = "pool";

/**
 * Sort claims into buckets. Drag an item to a bucket, or tap it and then tap the bucket (or
 * use the keyboard: Enter on an item, Enter on the bucket). "Check" marks every item with a
 * tick or a cross and says why each wrong one belongs elsewhere; "Try again" sends only the
 * wrong ones back, leaving what was right in place.
 */
export function SortIt({
  step,
  onResolve,
}: {
  step: SortStep;
  onResolve: (result: StepResult) => void;
}) {
  const engine = useStepEngine(onResolve);
  const [sorting, setSorting] = useState<Sorting>({});
  const [checked, setChecked] = useState(false);
  const result = checkSort(step, sorting);
  const settled = engine.done;
  const locked = (id: string) => checked && result.correct[id] === true;

  const place = (itemId: string, zone: string) => {
    if (settled || locked(itemId)) return;
    setChecked(false);
    setSorting((prev) => {
      const next = { ...prev };
      if (zone === POOL) delete next[itemId];
      else next[itemId] = zone;
      return next;
    });
  };

  const dnd = useDragDrop<string, string>({ onDrop: place, disabled: settled });
  const itemById = (id: string) => step.items.find((i) => i.id === id)!;
  const unplaced = step.items.filter((i) => sorting[i.id] === undefined);

  const check = () => {
    setChecked(true);
    const wrong = step.items.filter((i) => sorting[i.id] !== i.bucket);
    if (wrong.length === 0) {
      engine.right({ sorting }, step.why);
    } else {
      const lines = wrong.map((i) => `"${i.text}" — ${i.why}`).join(" ");
      engine.wrong(
        `${step.items.length - wrong.length} of ${step.items.length} are in the right place. ${lines}`,
      );
    }
  };

  const showAnswer = () => {
    const solved = Object.fromEntries(step.items.map((i) => [i.id, i.bucket]));
    setSorting(solved);
    setChecked(true);
    engine.reveal({ sorting: solved }, step.why);
  };

  const itemButton = (id: string, where: "pool" | string) => {
    const item = itemById(id);
    const correct = checked ? result.correct[id] : undefined;
    const status = correct === true ? "right" : correct === false ? "wrong" : "idle";
    const cls =
      status === "right"
        ? "border-success bg-success/10"
        : status === "wrong"
          ? "border-destructive border-dashed bg-destructive/5"
          : dnd.selected === id
            ? "border-primary bg-primary-soft"
            : "border-border bg-card";
    const whereLabel =
      where === POOL ? "not sorted yet" : `in ${step.buckets.find((b) => b.id === where)?.label}`;
    return (
      <button
        key={id}
        type="button"
        disabled={settled || locked(id)}
        {...dnd.itemProps(id, item.text)}
        aria-label={`${item.text}, ${whereLabel}${status === "right" ? ", correct" : status === "wrong" ? ", wrong bucket" : ""}`}
        className={`flex min-h-11 w-full items-start gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${cls}`}
      >
        <span className="flex-1">{item.text}</span>
        {status === "right" && (
          <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        )}
        {status === "wrong" && (
          <X aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        )}
      </button>
    );
  };

  return (
    <StepFrame
      label="Sort it"
      prompt={step.prompt}
      hint={step.hint}
      engine={engine}
      onShowAnswer={showAnswer}
      onRetry={() => {
        setChecked(false);
        setSorting((prev) => {
          const kept: Sorting = {};
          for (const [id, bucket] of Object.entries(prev))
            if (itemById(id).bucket === bucket) kept[id] = bucket;
          return kept;
        });
      }}
    >
      <p className="mb-3 text-xs text-muted-foreground">
        Drag each one into a bucket. Or tap it, then tap the bucket.
      </p>

      <div
        data-drop-zone={POOL}
        role="group"
        aria-label="Still to sort"
        className={`min-h-14 space-y-2 rounded-2xl border-2 border-dashed p-2 ${
          dnd.drag?.over === POOL ? "border-primary bg-primary-soft" : "border-border"
        }`}
      >
        {unplaced.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground">
            Everything is sorted.
          </p>
        ) : (
          unplaced.map((i) => itemButton(i.id, POOL))
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {step.buckets.map((bucket) => {
          const inside = step.items.filter((i) => sorting[i.id] === bucket.id);
          const active = dnd.drag?.over === bucket.id;
          return (
            <div
              key={bucket.id}
              data-drop-zone={bucket.id}
              role="group"
              aria-label={`${bucket.label} bucket`}
              className={`rounded-2xl border-2 p-2 ${active ? "border-primary bg-primary-soft" : "border-border"}`}
            >
              <p className="px-1 text-sm font-bold">{bucket.label}</p>
              {bucket.hint && (
                <p className="px-1 text-[11px] text-muted-foreground">{bucket.hint}</p>
              )}
              <div className="mt-2 space-y-2">{inside.map((i) => itemButton(i.id, bucket.id))}</div>
              {dnd.selected !== null && !settled && (
                <button
                  type="button"
                  onClick={() => dnd.dropSelectedOn(bucket.id)}
                  className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-dashed border-primary text-xs font-bold text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Put it in {bucket.label}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {dnd.selected !== null ? `Selected: ${itemById(dnd.selected).text}. Choose a bucket.` : ""}
      </p>
      <DragGhost drag={dnd.drag} />

      {engine.phase === "answering" && (
        <Button
          type="button"
          onClick={check}
          disabled={!result.allPlaced}
          className="mt-4 h-11 w-full rounded-full font-semibold"
        >
          {result.allPlaced ? "Check my sorting" : `${unplaced.length} left to sort`}
        </Button>
      )}
    </StepFrame>
  );
}
