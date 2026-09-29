import { Check, X } from "lucide-react";
import { useState } from "react";
import { checkBuilder, misfitMessage, solveBuilder, type Placement } from "@/lib/steps/checks";
import type { StepResult } from "@/lib/steps/scoring";
import type { BuilderStep } from "@/lib/steps/types";
import { DragGhost } from "./DragGhost";
import { StepFrame } from "./StepFrame";
import { useDragDrop } from "./useDragDrop";
import { useStepEngine } from "./useStepEngine";

const POOL = "pool";

/**
 * Build the argument map: the conclusion at the top, and under it the reasons and evidence that
 * hold it up. Drag pieces into place, or tap a piece and then a slot (Enter works too).
 *
 * The structure is checked live. A piece in the wrong kind of place is marked with a dashed
 * outline, a cross and the words "Doesn't fit", and the message names what the piece actually
 * is; a piece that fits gets a tick and "Fits". When every slot fits, the map is complete.
 */
export function ArgumentBuilder({
  step,
  onResolve,
}: {
  step: BuilderStep;
  onResolve: (result: StepResult) => void;
}) {
  const engine = useStepEngine(onResolve);
  const [placement, setPlacement] = useState<Placement>({});
  const state = checkBuilder(step, placement);
  const settled = engine.done;
  const pieceById = (id: string) => step.pieces.find((p) => p.id === id)!;
  const placedIds = new Set(Object.values(placement));
  const inPool = step.pieces.filter((p) => !placedIds.has(p.id));
  const filled = step.slots.filter((s) => state.statuses[s.id] !== "empty").length;

  const place = (pieceId: string, zone: string) => {
    if (settled) return;
    const next: Placement = {};
    for (const [slot, id] of Object.entries(placement)) if (id !== pieceId) next[slot] = id;
    if (zone !== POOL) next[zone] = pieceId; // whatever was in the slot goes back to the pool
    setPlacement(next);
    if (zone === POOL) {
      engine.say(null);
      return;
    }
    const after = checkBuilder(step, next);
    if (after.complete) {
      engine.right({ placement: next }, step.why, "The map holds together");
    } else if (after.statuses[zone] === "misfit") {
      engine.miss(misfitMessage(step, zone, pieceId));
    } else {
      engine.say({
        tone: "info",
        title: "Fits",
        body: `That belongs there. ${step.slots.length - Object.values(after.statuses).filter((v) => v === "fits").length} to go.`,
      });
    }
  };

  const dnd = useDragDrop<string, string>({ onDrop: place, disabled: settled });

  const pieceButton = (id: string, zone: string) => {
    const piece = pieceById(id);
    return (
      <button
        key={id}
        type="button"
        disabled={settled}
        {...dnd.itemProps(id, piece.text)}
        aria-label={`${piece.text}${zone === POOL ? ", not placed" : ", placed"}`}
        className={`flex min-h-11 w-full items-start rounded-xl border-2 px-3 py-2 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          dnd.selected === id ? "border-primary bg-primary-soft" : "border-border bg-card"
        }`}
      >
        {piece.text}
      </button>
    );
  };

  return (
    <StepFrame
      label="Build the argument"
      prompt={step.prompt}
      hint={step.hint}
      engine={engine}
      showMeAnytime
      onShowAnswer={() => {
        const solved = solveBuilder(step);
        setPlacement(solved);
        engine.reveal({ placement: solved }, step.why);
      }}
    >
      <p className="mb-3 text-xs text-muted-foreground">
        Drag each piece into the map. Or tap a piece, then tap where it goes.
      </p>

      <div
        data-drop-zone={POOL}
        role="group"
        aria-label="Pieces to place"
        className={`min-h-14 space-y-2 rounded-2xl border-2 border-dashed p-2 ${
          dnd.drag?.over === POOL ? "border-primary bg-primary-soft" : "border-border"
        }`}
      >
        {inPool.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground">
            {state.strayPieces.length === 0
              ? "Every piece is in the map."
              : "Some pieces are in the wrong place."}
          </p>
        ) : (
          inPool.map((p) => pieceButton(p.id, POOL))
        )}
      </div>

      <div className="mt-4" role="group" aria-label="Your argument map">
        <p className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Argument map
          <span aria-live="polite" className="normal-case">
            {filled} of {step.slots.length} in place
          </span>
        </p>
        <ol className="space-y-2">
          {step.slots.map((slot) => {
            const status = state.statuses[slot.id]!;
            const pieceId = placement[slot.id];
            const isConclusion = slot.role === "conclusion";
            const active = dnd.drag?.over === slot.id;
            const box =
              status === "fits"
                ? "border-success bg-success/10"
                : status === "misfit"
                  ? "border-destructive border-dashed bg-destructive/5"
                  : active
                    ? "border-primary bg-primary-soft"
                    : "border-dashed border-primary/50";
            return (
              <li
                key={slot.id}
                className={isConclusion ? "" : "ml-5 border-l-2 border-primary/30 pl-3"}
              >
                {!isConclusion && (
                  <span className="-ml-3 mb-1 block pl-3 text-[11px] font-bold text-muted-foreground">
                    because
                  </span>
                )}
                <div
                  data-drop-zone={slot.id}
                  role="group"
                  aria-label={`${slot.label}: ${status === "empty" ? "empty" : status === "fits" ? "fits" : "doesn't fit"}`}
                  className={`rounded-2xl border-2 p-2 ${box}`}
                >
                  <p className="flex items-center justify-between px-1 text-xs font-bold">
                    {slot.label}
                    {status === "fits" && (
                      <span className="flex items-center gap-1 text-success">
                        <Check aria-hidden className="h-4 w-4" /> Fits
                      </span>
                    )}
                    {status === "misfit" && (
                      <span className="flex items-center gap-1 text-destructive">
                        <X aria-hidden className="h-4 w-4" /> Doesn't fit
                      </span>
                    )}
                  </p>
                  <div className="mt-1">
                    {pieceId ? (
                      pieceButton(pieceId, slot.id)
                    ) : dnd.selected !== null && !settled ? (
                      <button
                        type="button"
                        onClick={() => dnd.dropSelectedOn(slot.id)}
                        className="flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-dashed border-primary text-xs font-bold text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        Put it here
                      </button>
                    ) : (
                      <p className="min-h-11 rounded-xl px-2 py-2.5 text-xs text-muted-foreground">
                        Empty
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="sr-only" aria-live="polite">
        {dnd.selected !== null
          ? `Selected: ${pieceById(dnd.selected).text}. Choose a place in the map.`
          : ""}
      </p>
      <DragGhost drag={dnd.drag} />
    </StepFrame>
  );
}
