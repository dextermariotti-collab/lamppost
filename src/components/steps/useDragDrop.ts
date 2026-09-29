import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";

/**
 * Drag and drop that also works without dragging.
 *
 *  - Pointer (mouse, touch, pen): press an item, move a few pixels, and it follows the finger;
 *    let go over a zone to drop it there.
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

export function useDragDrop<Item extends string, Zone extends string>(options: {
  onDrop: (item: Item, zone: Zone) => void;
  disabled?: boolean;
}) {
  const { onDrop, disabled = false } = options;
  const [selected, setSelected] = useState<Item | null>(null);
  const [drag, setDrag] = useState<DragState<Item, Zone> | null>(null);
  const press = useRef<{ item: Item; label: string; x: number; y: number; moved: boolean } | null>(
    null,
  );
  const suppressClick = useRef(false);

  const zoneAt = useCallback((x: number, y: number): Zone | null => {
    const el =
      typeof document.elementFromPoint === "function" ? document.elementFromPoint(x, y) : null;
    const zone = el?.closest<HTMLElement>("[data-drop-zone]");
    return (zone?.dataset["dropZone"] as Zone | undefined) ?? null;
  }, []);

  const finish = useCallback(
    (x: number, y: number, cancelled: boolean) => {
      const started = press.current;
      press.current = null;
      if (!started?.moved) return;
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 0);
      setDrag(null);
      if (cancelled) return;
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
    style: { touchAction: "none" } satisfies CSSProperties,
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
      suppressClick.current = false;
      press.current = { item, label, x: e.clientX, y: e.clientY, moved: false };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const started = press.current;
      if (!started || started.item !== item) return;
      if (!started.moved) {
        if (Math.hypot(e.clientX - started.x, e.clientY - started.y) < DRAG_THRESHOLD) return;
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
