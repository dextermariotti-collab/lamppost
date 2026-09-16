import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  streak,
  xp,
}: {
  completed: number;
  streak: number;
  xp: number;
}) {
  const [selected, setSelected] = useState<UnitLink | null>(null);
  const units = useMemo(() => unitProgress(completed), [completed]);
  const links = useMemo(() => unitLinks(), []);
  const currentUnitId = units.find((u) => u.state === "current")?.unit.id ?? units[0]?.unit.id;

  return (
    <div>
      <div className="relative h-[430px]" aria-label="Your critical thinking skills graph">
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
                className={`knowledge-node knowledge-node-${state} relative flex items-center justify-center rounded-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
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
                <span className="relative max-w-[80%] text-balance text-[11px] font-bold leading-tight text-foreground">
                  {unit.unit.title}
                </span>
              </Link>
            </div>
          );
        })}

        <div className="absolute right-1 top-1 z-30 text-right text-[11px] leading-relaxed text-muted-foreground">
          <p>
            <span className="font-bold text-foreground">{streak}</span> day streak
          </p>
          <p>{xp.toLocaleString()} XP</p>
        </div>
      </div>

      {selected && (
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
