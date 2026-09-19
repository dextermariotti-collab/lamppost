import { Link } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { readAttemptStore } from "@/lib/exercise-store";
import { lessonAt } from "@/lib/curriculum";
import { Button } from "@/components/ui/button";
import {
  CURRICULUM_SLUG,
  LESSONS_PER_UNIT,
  lessonIndexOf,
  unitLinks,
  unitProgress,
  type UnitLink,
} from "@/lib/curriculum";

/** Fixed layout for the seven curriculum units, in percent of the graph box. */
const POSITIONS: Record<string, { x: number; y: number }> = {
  claims: { x: 27, y: 12 },
  evidence: { x: 71, y: 23 },
  fallacies: { x: 33, y: 38 },
  biases: { x: 74, y: 51 },
  arguments: { x: 26, y: 64 },
  probability: { x: 67, y: 77 },
  media: { x: 34, y: 91 },
};
/** Rough node footprint in the same percent space, used to route edges around them. */
const NODE_CLEARANCE = 13;

/**
 * Bends an edge away from any unrelated node it would otherwise pass under, and
 * returns the curve plus the point where its tap target sits.
 */
function routeEdge(fromId: string, toId: string) {
  const from = POSITIONS[fromId];
  const to = POSITIONS[toId];
  if (!from || !to) return null;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;

  let bend = 0;
  for (const [id, node] of Object.entries(POSITIONS)) {
    if (id === fromId || id === toId) continue;
    // Signed perpendicular distance and how far along the segment the node sits.
    const along = ((node.x - from.x) * dx + (node.y - from.y) * dy) / (length * length);
    if (along <= 0.08 || along >= 0.92) continue;
    const side = (node.x - from.x) * nx + (node.y - from.y) * ny;
    if (Math.abs(side) >= NODE_CLEARANCE) continue;
    const push = (NODE_CLEARANCE - Math.abs(side) + 5) * (side >= 0 ? -1 : 1);
    if (Math.abs(push) > Math.abs(bend)) bend = push;
  }
  if (bend === 0) bend = length > 45 ? 6 : 3;

  const cx = (from.x + to.x) / 2 + nx * bend * 2;
  const cy = (from.y + to.y) / 2 + ny * bend * 2;
  return {
    d: `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`,
    // Midpoint of a quadratic curve.
    handle: { x: (from.x + to.x) / 4 + cx / 2, y: (from.y + to.y) / 4 + cy / 2 },
  };
}

/**
 * The home skills graph: seven unit nodes, completion rings from real progress,
 * and edges drawn only where the curriculum defines a genuine cross-unit link.
 */
export function ThinkingGraph({
  completed,
  compact = false,
}: {
  completed: number;
  /** Preview mode: no legend or detail panel, just the nodes and lines. */
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<UnitLink | null>(null);
  const units = useMemo(() => unitProgress(completed), [completed]);
  const links = useMemo(() => unitLinks(), []);
  const currentUnitId = units.find((u) => u.state === "current")?.unit.id ?? units[0]?.unit.id;

  // The skill practised most recently gets a soft glow, from real attempt times.
  const recentUnitId = useMemo(() => {
    let best: { unitId: string; at: number } | null = null;
    for (const [key, attempt] of Object.entries(readAttemptStore())) {
      const lessonId = key.split("#")[0] ?? "";
      const index = lessonIndexOf(lessonId);
      const unitId = index >= 0 ? lessonAt(index)?.unitId : undefined;
      if (!unitId) continue;
      if (!best || attempt.at > best.at) best = { unitId, at: attempt.at };
    }
    return best?.unitId ?? null;
  }, [completed]);

  // Edges fade when neither end is reachable yet, so the lit path stays readable.
  const routes = useMemo(() => {
    const lockedUnits = new Set(
      units
        .filter((u) => u.state === "locked" && u.unit.id !== currentUnitId)
        .map((u) => u.unit.id),
    );
    return links.flatMap((link) => {
      const route = routeEdge(link.fromUnit, link.toUnit);
      if (!route) return [];
      return [
        {
          key: `${link.from}-${link.to}`,
          link,
          ...route,
          dim: lockedUnits.has(link.fromUnit) || lockedUnits.has(link.toUnit),
        },
      ];
    });
  }, [links, units, currentUnitId]);

  return (
    <div>
      <div className={`relative ${compact ? "h-[430px]" : "h-[430px]"}`} aria-label="Your critical thinking skills graph">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {routes.map((route) => (
            <path
              key={route.key}
              d={route.d}
              pathLength="1"
              className={`knowledge-connection${route.dim ? " knowledge-connection-dim" : ""}`}
              fill="none"
            />
          ))}
        </svg>

        {routes.map((route) => (
          <Button
            key={`${route.key}-control`}
            type="button"
            variant="ghost"
            aria-label={`Open connection: ${route.link.concept}`}
            onClick={() => setSelected(route.link)}
            className="absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent p-0 hover:bg-primary/10"
            style={{ left: `${route.handle.x}%`, top: `${route.handle.y}%` }}
          />
        ))}

        {units.map((unit) => {
          const point = POSITIONS[unit.unit.id] ?? { x: 50, y: 50 };
          const ratio = unit.total > 0 ? unit.completed / unit.total : 0;
          const size = 84;
          const radius = size / 2 - 5;
          const circumference = 2 * Math.PI * radius;
          const state =
            unit.state === "complete"
              ? "recent"
              : unit.unit.id === currentUnitId
                ? "active"
                : "locked";
          const firstLesson = unit.lessons[0];
          const target = firstLesson
            ? Math.max(
                lessonIndexOf(firstLesson.id) + 1,
                Math.min(completed + 1, unit.index * LESSONS_PER_UNIT + unit.total),
              )
            : 1;

          return (
            <div
              key={unit.unit.id}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              <Link
                to="/course/$slug/lesson/$index"
                params={{
                  slug: CURRICULUM_SLUG,
                  index: String(
                    unit.state === "locked" ? lessonIndexOf(firstLesson?.id ?? "") + 1 : target,
                  ),
                }}
                className={`knowledge-node knowledge-node-${state}${
                  unit.unit.id === recentUnitId ? " knowledge-node-glow" : ""
                } relative flex items-center justify-center rounded-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                style={{ width: size, height: size }}
                aria-label={`${unit.unit.title}, ${unit.completed} of ${unit.total} lessons complete`}
              >
                <svg className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                  <circle
                    cx="50%"
                    cy="50%"
                    r={radius}
                    className="fill-none stroke-graph-locked"
                    strokeWidth="2"
                  />
                  {ratio > 0 && (
                    <circle
                      cx="50%"
                      cy="50%"
                      r={radius}
                      className="knowledge-progress-ring fill-none stroke-primary"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - ratio)}
                    />
                  )}
                </svg>
                <span
                  className={`relative max-w-[80%] text-balance text-[11px] font-bold leading-tight ${
                    state === "locked" ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {unit.unit.title}
                </span>
                {state === "locked" && (
                  <span
                    aria-hidden
                    className="absolute bottom-1.5 flex h-4 w-4 items-center justify-center"
                  >
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                )}
                {unit.state === "complete" && (
                  <span
                    aria-hidden
                    className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-background"
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </Link>
            </div>
          );
        })}

      </div>

      {!compact && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full border border-border" /> locked
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full border-2 border-primary" /> in
            progress
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-primary" /> mastered
          </li>
        </ul>
      )}

      {selected && !compact && (
        <div role="status" className="border-t border-border py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-primary">{selected.concept}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {selected.detail}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(null)}
              className="shrink-0"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
