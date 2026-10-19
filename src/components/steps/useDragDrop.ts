import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from "react";

/**
 * Drag and drop that also works without dragging.
 *
 *  - Pointer (mouse, pen): press an item, move a few pixels, and it follows the pointer; let
 *    go over a zone to drop it there.
 *  - Touch: the same, after holding the item still for a moment. A finger that moves straight
 *    away is scrolling the page, and the page scrolls, even when the swipe starts on a card.
 *  - Tap or keyboard: activate an item to select it, then activate a zone to put it there.
 *    Escape clears the selection.
 *
 * Both paths end in the same `onDrop(item, zone)`, so a component decides what a drop means
 * once. Zones are found by a `data-drop-zone` attribute under the pointer, so nothing here
 * knows how a component lays itself out.
 */

export type DragState<Item extends string, Zone extends string> = {
  item: Item;
  label: string;
  x: number;
  y: number;
  over: Zone | null;
};

/** How far a press has to move before it counts as a drag rather than a tap. */
const DRAG_THRESHOLD = 8;
/** How long a finger rests on an item before moving it drags instead of scrolling. */
export const TOUCH_HOLD_MS = 180;

export function useDragDrop<Item extends string, Zone extends string>(options: {
  onDrop: (item: Item, zone: Zone) => void;
  disabled?: boolean;
}) {
  const { onDrop, disabled = false } = options;
  const [selected, setSelected] = useState<Item | null>(null);
  const [drag, setDrag] = useState<DragState<Item, Zone> | null>(null);
  const press = useRef<{
    item: Item;
    label: string;
    x: number;
    y: number;
    moved: boolean;
    /** False for a finger until it has rested long enough to pick the item up. */
    armed: boolean;
  } | null>(null);
  const holdTimer = useRef(0);
  const suppressClick = useRef(false);

  // Once a finger has picked an item up, the page must not scroll under it. touch-action can't
  // change mid-gesture, so a non-passive listener cancels the moves instead; it has to exist
  // before the touch starts for iOS to honor it.
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable && press.current?.armed) e.preventDefault();
    };
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.clearTimeout(holdTimer.current);
    };
  }, []);

  const zoneAt = useCallback((x: number, y: number): Zone | null => {
    const el =
      typeof document.elementFromPoint === "function" ? document.elementFromPoint(x, y) : null;
    const zone = el?.closest<HTMLElement>("[data-drop-zone]");
    return (zone?.dataset["dropZone"] as Zone | undefined) ?? null;
  }, []);

  const finish = useCallback(
    (x: number, y: number, canceled: boolean) => {
      const started = press.current;
      press.current = null;
      window.clearTimeout(holdTimer.current);
      if (!started?.moved) return;
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 0);
      setDrag(null);
      if (canceled) return;
      const zone = zoneAt(x, y);
      if (zone) {
        setSelected(null);
        onDrop(started.item, zone);
      }
    },
    [onDrop, zoneAt],
  );

  // Escape puts a selected item back down.
  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const itemProps = (item: Item, label: string) => ({
    "aria-pressed": selected === item,
    style: { touchAction: "manipulation", WebkitTouchCallout: "none" } satisfies CSSProperties,
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
      suppressClick.current = false;
      const touch = e.pointerType === "touch";
      const started = { item, label, x: e.clientX, y: e.clientY, moved: false, armed: !touch };
      press.current = started;
      window.clearTimeout(holdTimer.current);
      if (touch) holdTimer.current = window.setTimeout(() => (started.armed = true), TOUCH_HOLD_MS);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const started = press.current;
      if (!started || started.item !== item) return;
      if (!started.moved) {
        if (Math.hypot(e.clientX - started.x, e.clientY - started.y) < DRAG_THRESHOLD) return;
        if (!started.armed) {
          // Moved before the hold: a scroll, which the browser is already handling.
          press.current = null;
          window.clearTimeout(holdTimer.current);
          return;
        }
        started.moved = true;
      }
      setDrag({ item, label, x: e.clientX, y: e.clientY, over: zoneAt(e.clientX, e.clientY) });
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => finish(e.clientX, e.clientY, false),
    onPointerCancel: (e: PointerEvent<HTMLElement>) => finish(e.clientX, e.clientY, true),
    onClick: () => {
      if (disabled || suppressClick.current) return;
      setSelected((current) => (current === item ? null : item));
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === "Escape") setSelected(null);
    },
    // A held finger would otherwise open the long-press menu over the item.
    onContextMenu: (e: MouseEvent<HTMLElement>) => {
      if (press.current?.item === item) e.preventDefault();
    },
  });

  /** Activating a zone with an item selected puts the item there. */
  const dropSelectedOn = (zone: Zone) => {
    if (disabled || selected === null) return;
    const item = selected;
    setSelected(null);
    onDrop(item, zone);
  };

  return {
    selected,
    setSelected,
    drag,
    itemProps,
    dropSelectedOn,
    /** True while something is being moved, by pointer or selected for a tap. */
    carrying: selected !== null || drag !== null,
  };
}
