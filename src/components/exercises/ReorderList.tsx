import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * The one interaction behind "rank the evidence" and "put it in order": a list of
 * cards the learner moves up and down.
 *
 * - Every control is a 44px button, so it works with a thumb.
 * - It works from the keyboard: Tab to a card's arrows, press Enter or Space, or
 *   press the arrow keys while one of them has focus. Focus stays on the arrow
 *   that was used, even though the card moves, so a run of moves needs no re-tabbing.
 * - Every move is announced ("Moved “X” to position 2 of 4"), and a card that can
 *   go no further says so instead of doing nothing.
 * - With `dragging`, cards can also be dragged (mouse only; arrows are the touch path).
 */
export function ReorderList({
  order,
  solution,
  answered,
  whyOf,
  onMove,
  dragging = false,
}: {
  /** The cards as the learner has them now. */
  order: string[];
  /** The correct order, used once the drill is answered. */
  solution: string[];
  answered: boolean;
  /** Why a card belongs where it does, shown after answering. */
  whyOf: (text: string) => string | undefined;
  /** Moves a card to a new position (0-based). */
  onMove: (from: number, to: number) => void;
  dragging?: boolean;
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const focusAfter = useRef<{ text: string; direction: "up" | "down" } | null>(null);
  const list = useRef<HTMLOListElement>(null);

  // A moved card is re-inserted into the page, which drops keyboard focus; put it back.
  useEffect(() => {
    const target = focusAfter.current;
    if (!target) return;
    focusAfter.current = null;
    const buttons = list.current?.querySelectorAll<HTMLButtonElement>("button[data-card]") ?? [];
    for (const button of buttons) {
      if (
        button.dataset["card"] === target.text &&
        button.dataset["direction"] === target.direction
      ) {
        button.focus();
        return;
      }
    }
  }, [order]);

  const step = (text: string, direction: "up" | "down") => {
    if (answered) return;
    const from = order.indexOf(text);
    const to = direction === "up" ? from - 1 : from + 1;
    if (from < 0) return;
    if (to < 0 || to >= order.length) {
      setAnnouncement(`“${text}” is already ${direction === "up" ? "first" : "last"}.`);
      return;
    }
    focusAfter.current = { text, direction };
    onMove(from, to);
    setAnnouncement(`Moved “${text}” to position ${to + 1} of ${order.length}.`);
  };

  const control = (text: string, direction: "up" | "down") => {
    const from = order.indexOf(text);
    const atEdge = direction === "up" ? from === 0 : from === order.length - 1;
    const Icon = direction === "up" ? ChevronUp : ChevronDown;
    return (
      <button
        type="button"
        data-card={text}
        data-direction={direction}
        aria-label={`Move “${text}” ${direction}`}
        aria-disabled={atEdge || undefined}
        onClick={() => step(text, direction)}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            step(text, event.key === "ArrowUp" ? "up" : "down");
          }
        }}
        className={`flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          atEdge ? "opacity-40" : ""
        }`}
      >
        <Icon aria-hidden className="h-5 w-5" />
      </button>
    );
  };

  return (
    <>
      <ol ref={list} className="mt-4 space-y-2">
        {order.map((text, i) => {
          const rightSpot = answered && text === solution[i];
          return (
            <li
              key={text}
              draggable={dragging && !answered}
              onDragStart={() => setDragFrom(i)}
              onDragOver={(event) => {
                if (dragFrom === null) return;
                event.preventDefault();
                if (dragFrom !== i) {
                  onMove(dragFrom, i);
                  setDragFrom(i);
                }
              }}
              onDragEnd={() => setDragFrom(null)}
              className={`flex items-start gap-2 rounded-2xl border-2 px-3 py-2 text-sm font-semibold transition-all ${
                answered
                  ? rightSpot
                    ? "border-success bg-success/10"
                    : "border-destructive/50 bg-destructive/5"
                  : "border-border bg-background"
              }`}
            >
              <span
                aria-hidden
                className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-accent-foreground"
              >
                {i + 1}
              </span>
              <span className="flex-1 py-2">
                <span className="sr-only">Position {i + 1}: </span>
                {text}
                {answered && (
                  <span className="mt-1 block text-[12px] font-semibold text-muted-foreground">
                    {rightSpot ? "" : `Belongs at ${solution.indexOf(text) + 1}. `}
                    {whyOf(text)}
                  </span>
                )}
              </span>
              {!answered && (
                <span className="flex shrink-0 items-center">
                  {control(text, "up")}
                  {control(text, "down")}
                  {dragging && (
                    <GripVertical
                      aria-hidden
                      className="hidden h-4 w-4 shrink-0 text-muted-foreground/60 sm:block"
                    />
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
