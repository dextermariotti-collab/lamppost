import { Check, X } from "lucide-react";
import { useId, useState } from "react";
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
 * Sort claims into buckets, one card at a time. The card in hand and every bucket fit one
 * screen: tap a bucket (or drag the card onto it) to file the card and bring the next. Filed
 * cards are listed by bucket underneath, and tapping one picks it up again to move it. Once
 * everything is filed, "Check" marks every card with a tick or a cross and says, beside each
 * wrong one, why it belongs elsewhere; "Try again" sends only the wrong ones back.
 */
export function SortIt({
  step,
  onResolve,
}: {
  step: SortStep;
  onResolve: (result: StepResult) => void;
}) {
  const engine = useStepEngine(onResolve);
  const reasonId = useId();
  const [sorting, setSorting] = useState<Sorting>({});
  const [checked, setChecked] = useState(false);
  const result = checkSort(step, sorting);
  const settled = engine.done;
  const locked = (id: string) => checked && result.correct[id] === true;

  const place = (itemId: string, zone: string) => {
    if (settled || locked(itemId)) return;
    if (engine.phase === "wrong") engine.retry();
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
  const filed = step.items.length - unplaced.length;
  /** The card a bucket will take: the one picked up from the lists below, else the next in line. */
  const inHand = dnd.selected !== null ? itemById(dnd.selected) : (unplaced[0] ?? null);

  const check = () => {
    setChecked(true);
    const wrong = step.items.filter((i) => sorting[i.id] !== i.bucket);
    if (wrong.length === 0) {
      engine.right({ sorting }, step.why);
    } else {
      engine.wrong(
        `${step.items.length - wrong.length} of ${step.items.length} are in the right place. Each one that isn't says why, just below it.`,
      );
    }
  };

  const showAnswer = () => {
    const solved = Object.fromEntries(step.items.map((i) => [i.id, i.bucket]));
    setSorting(solved);
    setChecked(true);
    engine.reveal({ sorting: solved }, step.why);
  };

  const fileInHand = (bucketId: string) => {
    if (!inHand) return;
    dnd.setSelected(null);
    place(inHand.id, bucketId);
  };

  const bucketLabel = (id: string) => step.buckets.find((b) => b.id === id)?.label;

  const filedItem = (id: string, where: string) => {
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
    return (
      <li key={id}>
        <button
          type="button"
          disabled={settled || locked(id)}
          {...dnd.itemProps(id, item.text)}
          aria-label={`${item.text}, in ${bucketLabel(where)}${status === "right" ? ", correct" : status === "wrong" ? ", wrong bucket" : ""}`}
          aria-describedby={status === "wrong" ? `${reasonId}-${id}` : undefined}
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
        {status === "wrong" && (
          <p
            id={`${reasonId}-${id}`}
            className="px-1 pt-1 text-[13px] font-semibold leading-snug text-foreground/85"
          >
            {item.why}
          </p>
        )}
      </li>
    );
  };

  return (
    <StepFrame
      label={step.label ?? "Sort it"}
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
      <div
        data-drop-zone={POOL}
        role="group"
        aria-label="Card to sort"
        className={`rounded-2xl border-2 border-dashed p-2 ${
          dnd.drag?.over === POOL ? "border-primary bg-primary-soft" : "border-border"
        }`}
      >
        {inHand ? (
          <>
            <p className="px-1 pb-1.5 text-xs font-semibold text-muted-foreground">
              {sorting[inHand.id] === undefined
                ? `Card ${filed + 1} of ${step.items.length}`
                : "Moving this one"}
            </p>
            <button
              type="button"
              disabled={settled}
              {...dnd.itemProps(inHand.id, inHand.text)}
              aria-label={`${inHand.text}, ${
                sorting[inHand.id] === undefined
                  ? "not sorted yet"
                  : `in ${bucketLabel(sorting[inHand.id]!)}`
              }`}
              className="flex min-h-20 w-full items-center rounded-2xl border-2 border-primary bg-card px-4 py-3 text-left text-base font-bold shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {inHand.text}
            </button>
          </>
        ) : (
          <div className="px-2 py-3 text-center">
            <p className="text-sm font-bold">
              {settled
                ? "Sorted."
                : checked
                  ? "Some are in the wrong bucket."
                  : "Everything is sorted."}
            </p>
            {!checked && !settled && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Look them over below, or tap one to move it.
              </p>
            )}
            {engine.phase === "answering" && (
              <Button
                type="button"
                onClick={check}
                className="mt-3 h-11 w-full rounded-full font-semibold"
              >
                Check my sorting
              </Button>
            )}
          </div>
        )}
      </div>

      {(inHand || dnd.drag !== null) && (
        <>
          <p className="mt-4 text-xs font-semibold text-muted-foreground">
            {inHand ? "Where does it go? Tap a bucket, or drag the card onto one." : "Buckets"}
          </p>
          <div role="group" aria-label="Buckets" className="mt-1.5 space-y-2">
            {step.buckets.map((bucket) => (
              <button
                key={bucket.id}
                type="button"
                data-drop-zone={bucket.id}
                disabled={settled || (!inHand && dnd.drag === null)}
                aria-label={`Put it in ${bucket.label}`}
                onClick={() => fileInHand(bucket.id)}
                className={`flex min-h-14 w-full flex-col justify-center rounded-2xl border-2 px-4 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  dnd.drag?.over === bucket.id
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-card enabled:hover:border-primary/60"
                } disabled:opacity-70`}
              >
                <span className="text-sm font-bold">{bucket.label}</span>
                {bucket.hint && (
                  <span className="text-xs font-normal text-muted-foreground">{bucket.hint}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {filed > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-muted-foreground">
            Your sorting{unplaced.length > 0 ? `, ${filed} of ${step.items.length} filed` : ""}
          </p>
          <div className="mt-1.5 space-y-3">
            {step.buckets.map((bucket) => {
              const inside = step.items.filter((i) => sorting[i.id] === bucket.id);
              return (
                <div key={bucket.id} role="group" aria-label={`${bucket.label} bucket`}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {bucket.label}
                  </p>
                  {inside.length === 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">Nothing here.</p>
                  ) : (
                    <ul className="mt-1 space-y-1.5">
                      {inside.map((i) => filedItem(i.id, bucket.id))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {dnd.selected !== null ? `Selected: ${itemById(dnd.selected).text}. Choose a bucket.` : ""}
      </p>
      <DragGhost drag={dnd.drag} />
    </StepFrame>
  );
}
