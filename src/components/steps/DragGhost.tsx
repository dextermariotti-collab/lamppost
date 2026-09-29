import type { DragState } from "./useDragDrop";

/** The label that follows the pointer while something is dragged. Decorative: never announced. */
export function DragGhost<Item extends string, Zone extends string>({
  drag,
}: {
  drag: DragState<Item, Zone> | null;
}) {
  if (!drag) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-50 max-w-[16rem] rounded-2xl border-2 border-primary bg-card px-3 py-2 text-sm font-semibold shadow-card"
      style={{ transform: `translate(${drag.x + 8}px, ${drag.y + 8}px)` }}
    >
      {drag.label}
    </div>
  );
}
