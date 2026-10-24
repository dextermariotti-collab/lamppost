import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { checkBuilder, misfitMessage, solveBuilder, type Placement } from "@/lib/steps/checks";
import type { StepResult } from "@/lib/steps/scoring";
import type { BuilderStep } from "@/lib/steps/types";
import { DragGhost } from "./DragGhost";
import { StepFrame } from "./StepFrame";
import { useDragDrop } from "./useDragDrop";
import { useStepEngine } from "./useStepEngine";

const POOL = "pool";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const TARGET = `flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-dashed border-primary text-xs font-bold text-primary-text ${FOCUS_RING}`;

/**
 * Build the argument map: the conclusion at the top, and under it the reasons and evidence that
 * hold it up. Drag pieces into place, or tap a piece and then a slot (Enter works too). A full
 * slot still takes a tapped piece, sending the one there back to the pool, and a placed piece
 * can be tapped and put back, so taps alone can always finish the map.
 *
 * The structure is checked live. A piece in the wrong kind of place is marked with a dashed
 * outline, a cross and the words "Doesn't fit", and the message names what the piece actually
 * is; a piece that fits gets a tick and "Fits". Only pieces that fit count as in place. When
 * every slot fits, the map is complete.
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
  const inPlace = step.slots.filter((s) => state.statuses[s.id] === "fits").length;

  // A piece moved with a tap keeps the keyboard focus, wherever it lands.
  const root = useRef<HTMLDivElement | null>(null);
  const focusAfter = useRef<string | null>(null);
  useEffect(() => {
    const id = focusAfter.current;
    focusAfter.current = null;
    if (id === null || !root.current) return;
    const pieces = root.current.querySelectorAll<HTMLElement>("[data-piece]");
    Array.from(pieces)
      .find((el) => el.dataset["piece"] === id)
      ?.focus();
  }, [placement]);

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
      engine.say({ tone: "info", title: "Fits", body: fitsMessage(step, after.statuses) });
    }
  };

  const dnd = useDragDrop<string, string>({ onDrop: place, disabled: settled });

  /** A tap target: puts the selected piece in `zone`, and keeps focus on it there. */
  const dropHere = (zone: string) => {
    focusAfter.current = dnd.selected;
    dnd.dropSelectedOn(zone);
  };

  const selected = dnd.selected;
  const selectedIsPlaced = selected !== null && placedIds.has(selected);
  const canDrop = selected !== null && !settled;

  const pieceButton = (id: string, slotLabel: string | null) => {
    const piece = pieceById(id);
    return (
      <button
        key={id}
        type="button"
        data-piece={id}
        disabled={settled}
        {...dnd.itemProps(id, piece.text)}
        aria-label={`${piece.text}, ${slotLabel === null ? "not placed" : `in ${slotLabel}`}`}
        className={`flex min-h-11 w-full items-start rounded-xl border-2 px-3 py-2 text-left text-sm font-semibold ${FOCUS_RING} ${
          selected === id ? "border-primary bg-primary-soft" : "border-border bg-card"
        }`}
      >
        {piece.text}
      </button>
    );
  };

  return (
    <StepFrame
      label={step.label ?? "Build the argument"}
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
      <div ref={root}>
        <p className="mb-3 text-xs text-muted-foreground">
          Tap a piece, then tap where it goes. Or hold a piece and drag it into the map.
        </p>

        <div
          data-drop-zone={POOL}
          role="group"
          aria-label="Pieces to place"
          className={`min-h-14 space-y-2 rounded-2xl border-2 border-dashed p-2 ${
            dnd.drag?.over === POOL ? "border-primary bg-primary-soft" : "border-border"
          }`}
        >
          {inPool.map((p) => pieceButton(p.id, null))}
          {canDrop && selectedIsPlaced ? (
            <button type="button" onClick={() => dropHere(POOL)} className={TARGET}>
              Put it back with the pieces
            </button>
          ) : (
            inPool.length === 0 && (
              <p className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground">
                {state.strayPieces.length === 0
                  ? "Every piece is in the map."
                  : "Some pieces are in the wrong place."}
              </p>
            )
          )}
        </div>

        <div className="mt-4" role="group" aria-label="Your argument map">
          <p className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Argument map
            <span aria-live="polite" className="normal-case">
              {inPlace} of {step.slots.length} in place
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
                    <div className="mt-1 space-y-2">
                      {pieceId ? (
                        <>
                          {pieceButton(pieceId, slot.label)}
                          {canDrop && selected !== pieceId && (
                            <button
                              type="button"
                              onClick={() => dropHere(slot.id)}
                              className={TARGET}
                            >
                              Put it here instead
                            </button>
                          )}
                        </>
                      ) : canDrop ? (
                        <button type="button" onClick={() => dropHere(slot.id)} className={TARGET}>
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
          {selected !== null
            ? `Selected: ${pieceById(selected).text}. Choose a place in the map${
                selectedIsPlaced ? ", or put it back with the pieces" : ""
              }.`
            : ""}
        </p>
      </div>
      <DragGhost drag={dnd.drag} />
    </StepFrame>
  );
}

/**
 * What to say when a piece lands where it fits. It never counts down past a slot that doesn't
 * fit: with one still wrong, it names that slot instead, so the words agree with the map.
 */
function fitsMessage(step: BuilderStep, statuses: Record<string, string>): string {
  const misfits = step.slots.filter((s) => statuses[s.id] === "misfit");
  const empty = step.slots.filter((s) => statuses[s.id] === "empty").length;
  if (misfits.length === 0) return `That belongs there. ${empty} to go.`;
  const which =
    misfits.length === 1
      ? `${misfits[0]!.label} still doesn't`
      : `${misfits.length} places still don't`;
  return empty === 0
    ? `That belongs there. ${which} fit: tap another piece, then put it there instead.`
    : `That belongs there. ${which} fit.`;
}
