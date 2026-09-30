import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { readAttemptStore } from "@/lib/exercise-store";
import { lessonAt, unitById } from "@/lib/curriculum";
import { Button } from "@/components/ui/button";
import { CURRICULUM_SLUG, lessonIndexOf, unitEntryIndex, unitProgress } from "@/lib/curriculum";
import {
  GRAPH_H,
  GRAPH_W,
  NODE_D,
  NODE_POSITIONS,
  routeAllEdges,
  type RoutedEdge,
} from "@/lib/graph-layout";

/**
 * The skills graph: seven unit nodes, completion rings from real progress, and
 * edges drawn only where the curriculum defines a genuine cross-unit link.
 *
 * The map is drawn at one fixed geometry (see lib/graph-layout.ts) and scales as
 * a whole with its container, so it is the same picture on the Home page, in the
 * full-screen view and on a wide desktop. Labels size off the container width and
 * never drop below 11px, which is what keeps the Home preview readable.
 */
export function ThinkingGraph({
  done,
  compact = false,
}: {
  /** Lesson indexes finished. */
  done: ReadonlySet<number>;
  /** Home preview: same map, without the legend and the connection detail panel. */
  compact?: boolean;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const units = useMemo(() => unitProgress(done), [done]);
  const edges = useMemo(() => routeAllEdges(), []);
  const selected = edges.find((edge) => edge.key === selectedKey) ?? null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // Edges are quieter when either end is not started, so the lit path stands out.
  const lockedUnits = useMemo(
    () =>
      new Set(
        units
          .filter((u) => u.state === "open" && u.unit.id !== currentUnitId)
          .map((u) => u.unit.id),
      ),
    [units, currentUnitId],
  );

  return (
    <div>
      <div
        className="relative mx-auto w-full max-w-[560px]"
        style={{ aspectRatio: `${GRAPH_W} / ${GRAPH_H}`, containerType: "inline-size" }}
        role="group"
        aria-label="Your critical thinking skills graph"
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
          aria-hidden="true"
        >
          {edges.map((edge) => (
            <path
              key={edge.key}
              d={edge.d}
              pathLength="1"
              className={`knowledge-connection${
                lockedUnits.has(edge.from) || lockedUnits.has(edge.to)
                  ? " knowledge-connection-dim"
                  : ""
              }${edge.key === selectedKey ? " knowledge-connection-selected" : ""}`}
            />
          ))}
        </svg>

        {!compact &&
          edges.map((edge) => (
            <Button
              key={`${edge.key}-control`}
              type="button"
              variant="ghost"
              aria-label={`Open connection: ${edge.links.map((l) => l.concept).join("; ")}`}
              aria-pressed={edge.key === selectedKey}
              onClick={() => setSelectedKey(edge.key === selectedKey ? null : edge.key)}
              className="absolute z-10 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent p-0 hover:bg-primary/15"
              style={{
                left: `${(edge.handle.x / GRAPH_W) * 100}%`,
                top: `${(edge.handle.y / GRAPH_H) * 100}%`,
              }}
            />
          ))}

        {units.map((unit) => {
          const point = NODE_POSITIONS[unit.unit.id] ?? { x: GRAPH_W / 2, y: GRAPH_H / 2 };
          const ratio = unit.total > 0 ? unit.completed / unit.total : 0;
          const radius = 44;
          const circumference = 2 * Math.PI * radius;
          const state =
            unit.state === "complete"
              ? "recent"
              : unit.unit.id === currentUnitId
                ? "active"
                : "idle";
          const target = unitEntryIndex(unit.index, done) + 1;

          return (
            <div
              key={unit.unit.id}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(point.x / GRAPH_W) * 100}%`,
                top: `${(point.y / GRAPH_H) * 100}%`,
                width: `${(NODE_D / GRAPH_W) * 100}%`,
                aspectRatio: "1 / 1",
              }}
            >
              <Link
                to="/course/$slug/lesson/$index"
                params={{
                  slug: CURRICULUM_SLUG,
                  index: String(target),
                }}
                className={`knowledge-node knowledge-node-${state}${
                  unit.unit.id === recentUnitId ? " knowledge-node-glow" : ""
                } relative flex h-full w-full items-center justify-center rounded-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                aria-label={`${unit.unit.title}, ${unit.completed} of ${unit.total} lessons complete${
                  state === "idle" ? ", not started" : ""
                }`}
              >
                <svg
                  className="absolute inset-0 h-full w-full -rotate-90"
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="fill-none stroke-graph-locked"
                    strokeWidth="2.5"
                  />
                  {ratio > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      className="knowledge-progress-ring fill-none stroke-primary"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - ratio)}
                    />
                  )}
                </svg>
                <span
                  className="relative max-w-[82%] text-balance font-bold leading-tight"
                  style={{ fontSize: "max(11px, 3.3cqw)" }}
                >
                  {unit.unit.title}
                </span>
                {unit.state === "complete" && (
                  <span
                    aria-hidden
                    className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
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
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs text-foreground/80">
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-3 w-3 rounded-full border-2 border-dashed border-graph-edge"
            />{" "}
            not started
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-3 rounded-full border-2 border-primary" /> in
            progress
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-3 rounded-full bg-primary" /> mastered
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-4 rounded bg-graph-edge" /> a shared idea — tap it
          </li>
        </ul>
      )}

      {selected && !compact && (
        <ConnectionDetail edge={selected} onClose={() => setSelectedKey(null)} />
      )}
    </div>
  );
}

function ConnectionDetail({ edge, onClose }: { edge: RoutedEdge; onClose: () => void }) {
  return (
    <div role="status" className="border-t border-border py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground">
            {unitById(edge.from).title} + {unitById(edge.to).title}
          </p>
          {edge.links.map((link) => (
            <div key={`${link.from}-${link.to}`}>
              <p className="text-sm font-bold text-foreground">{link.concept}</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/80">{link.detail}</p>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
          Close
        </Button>
      </div>
    </div>
  );
}
