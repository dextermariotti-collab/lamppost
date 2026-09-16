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
          {links.map((link) => {
            const from = POSITIONS[link.fromUnit];
            const to = POSITIONS[link.toUnit];
            if (!from || !to) return null;
            return (
              <line
                key={`${link.from}-${link.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                pathLength="1"
                className="knowledge-connection"
              />
            );
          })}
        </svg>

        {links.map((link) => {
          const from = POSITIONS[link.fromUnit];
          const to = POSITIONS[link.toUnit];
          if (!from || !to) return null;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <Button
              key={`${link.from}-${link.to}-control`}
              type="button"
              variant="ghost"
              aria-label={`Open connection: ${link.concept}`}
              onClick={() => setSelected(link)}
              className="absolute z-10 h-4 origin-left rounded-none bg-transparent p-0 hover:bg-transparent"
              style={{
                left: `${from.x}%`,
                top: `${from.y}%`,
                width: `${length}%`,
                transform: `translateY(-50%) rotate(${angle}deg)`,
              }}
            />
          );
        })}

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
