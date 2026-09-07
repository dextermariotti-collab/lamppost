import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Course } from "@/lib/courses";
import {
  identifyCrossDomainConnections,
  type KnowledgeConnection,
} from "@/lib/knowledge-graph";
import type { ProgressState } from "@/lib/progress";

type GraphCourse = Course & {
  completed: number;
  total: number;
  lastActivityAt?: number | undefined;
};

const POSITIONS = [
  { x: 27, y: 28 },
  { x: 73, y: 45 },
  { x: 40, y: 74 },
] as const;

export function KnowledgeGraph({
  courses,
  progress,
  streak,
  xp,
}: {
  courses: Course[];
  progress: ProgressState["courses"];
  streak: number;
  xp: number;
}) {
  const [selected, setSelected] = useState<KnowledgeConnection | null>(null);
  const graphCourses = useMemo<GraphCourse[]>(
    () =>
      courses
        .map((course) => ({
          ...course,
          completed: progress[course.slug]?.completed ?? 0,
          total: progress[course.slug]?.total ?? course.lessons.length,
          lastActivityAt: progress[course.slug]?.lastActivityAt,
        }))
        .sort(
          (a, b) =>
            (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0) ||
            b.completed / Math.max(1, b.total) - a.completed / Math.max(1, a.total) ||
            a.topic.localeCompare(b.topic),
        )
        .slice(0, 3),
    [courses, progress],
  );
  const connections = useMemo(
    () => identifyCrossDomainConnections(graphCourses),
    [graphCourses],
  );
  const pointBySlug = new Map(
    graphCourses.map((course, index) => [course.slug, POSITIONS[index] ?? POSITIONS[0]]),
  );

  if (graphCourses.length === 0) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center px-8 text-center">
        <span className="h-3 w-3 rounded-full bg-graph-locked" />
        <p className="mt-5 text-base font-bold text-foreground">Your graph starts with one subject.</p>
        <p className="mt-2 max-w-64 text-sm leading-relaxed text-muted-foreground">
          As you learn across domains, shared concepts will connect here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-[390px]" aria-label="Your knowledge graph">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
          {connections.map((connection) => {
            const from = pointBySlug.get(connection.from);
            const to = pointBySlug.get(connection.to);
            if (!from || !to) return null;
            return (
              <line
                key={connection.id}
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

        {connections.map((connection) => {
          const from = pointBySlug.get(connection.from);
          const to = pointBySlug.get(connection.to);
          if (!from || !to) return null;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <Button
              key={`${connection.id}-control`}
              type="button"
              variant="ghost"
              aria-label={`Open connection: ${connection.concept}`}
              onClick={() => setSelected(connection)}
              className="absolute z-10 h-5 origin-left rounded-none bg-transparent p-0 hover:bg-transparent"
              style={{
                left: `${from.x}%`,
                top: `${from.y}%`,
                width: `${length}%`,
                transform: `translateY(-50%) rotate(${angle}deg)`,
              }}
            />
          );
        })}

        {graphCourses.map((course, index) => {
          const point = POSITIONS[index] ?? POSITIONS[0];
          const progressRatio = Math.min(1, course.completed / Math.max(course.total, 1));
          const size = Math.min(126, 88 + course.total * 4);
          const radius = size / 2 - 5;
          const circumference = 2 * Math.PI * radius;
          const recent = course.lastActivityAt
            ? Date.now() - course.lastActivityAt < 7 * 86_400_000
            : false;
          const state = course.completed === 0 ? "locked" : recent ? "recent" : "active";

          return (
            <div
              key={course.slug}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              <Link
                to="/course/$slug"
                params={{ slug: course.slug }}
                className={`knowledge-node knowledge-node-${state} relative flex items-center justify-center rounded-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                style={{ width: size, height: size }}
                aria-label={`${course.topic}, ${course.completed} of ${course.total} lessons complete`}
              >
                <svg className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                  <circle
                    cx="50%"
                    cy="50%"
                    r={radius}
                    className="fill-none stroke-graph-locked"
                    strokeWidth="2"
                  />
                  {progressRatio > 0 && (
                    <circle
                      cx="50%"
                      cy="50%"
                      r={radius}
                      className="knowledge-progress-ring fill-none stroke-primary"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - progressRatio)}
                    />
                  )}
                </svg>
                <span className="relative max-w-[78%] text-balance text-[13px] font-bold leading-tight text-foreground">
                  {course.topic}
                </span>
              </Link>
            </div>
          );
        })}

        <div className="absolute right-1 top-2 text-right text-[11px] leading-relaxed text-muted-foreground">
          <p>
            <span className="font-bold text-foreground">{streak}</span> day streak
          </p>
          <p>{xp.toLocaleString()} XP</p>
        </div>

        {connections.length === 0 && (
          <p className="absolute bottom-1 left-1/2 w-64 -translate-x-1/2 text-center text-xs leading-relaxed text-muted-foreground">
            No cross-domain links yet. Shared concepts will draw themselves here.
          </p>
        )}
      </div>

      {selected && (
        <div role="status" className="border-t border-border py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-primary">{selected.concept}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{selected.detail}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="shrink-0">
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}