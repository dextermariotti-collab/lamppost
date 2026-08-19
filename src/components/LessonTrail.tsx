import { Link } from "@tanstack/react-router";
import { Check, Lock, Mic, Play } from "lucide-react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import type { Companion } from "@/lib/companions";
import { cn } from "@/lib/utils";

const ROW = 128;
/** Horizontal position of each node, as a percentage, cycled down the trail. */
const XS = [50, 24, 50, 76];

type TrailLesson = { title: string; subtitle?: string };

/**
 * Winding lesson trail: a dashed curve drawn behind alternating nodes.
 * Done nodes are filled with a check, the current node carries the companion
 * plus a floating start callout, and later nodes stay locked.
 */
export function LessonTrail({
  slug,
  lessons,
  completed,
  companion,
}: {
  slug: string;
  lessons: TrailLesson[];
  completed: number;
  companion: { [K in keyof Companion]?: string | null | undefined } | null | undefined;
}) {
  const points = lessons.map((_, i) => ({ x: XS[i % XS.length]!, y: 62 + i * ROW }));
  const height = lessons.length * ROW + 24;

  // Smooth S-curve through every node centre.
  const d = points
    .map((pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      const prev = points[i - 1]!;
      const midY = (prev.y + pt.y) / 2;
      return `C ${prev.x} ${midY}, ${pt.x} ${midY}, ${pt.x} ${pt.y}`;
    })
    .join(" ");

  const doneD = points
    .slice(0, Math.max(1, Math.min(completed + 1, points.length)))
    .map((pt, i, arr) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      const prev = arr[i - 1]!;
      const midY = (prev.y + pt.y) / 2;
      return `C ${prev.x} ${midY}, ${pt.x} ${midY}, ${pt.x} ${pt.y}`;
    })
    .join(" ");

  return (
    <div className="relative mt-4" style={{ height }}>
      {/* backdrop scenery */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-2 top-24 h-16 w-24 rounded-full bg-primary-soft/45 blur-md" />
        <div className="absolute right-3 top-[19rem] h-14 w-20 rounded-full bg-primary-soft/40 blur-md" />
        <div className="absolute left-6 top-[34rem] h-12 w-16 rounded-full bg-primary-soft/35 blur-md" />
      </div>

      <svg
        aria-hidden
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d={d}
          fill="none"
          stroke="var(--border)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="10 12"
          vectorEffect="non-scaling-stroke"
        />
        {completed > 0 && (
          <path
            d={doneD}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="10 12"
            vectorEffect="non-scaling-stroke"
            className="animate-trail-dash opacity-80"
          />
        )}
      </svg>

      {lessons.map((lesson, i) => {
        const done = i < completed;
        const current = i === completed;
        const locked = i > completed;
        const pt = points[i]!;
        const calloutLeft = pt.x >= 50;

        return (
          <div
            key={`${lesson.title}-${i}`}
            className="absolute animate-rise-in"
            style={{
              top: pt.y,
              left: `${pt.x}%`,
              transform: "translate(-50%, -50%)",
              animationDelay: `${i * 70}ms`,
            }}
          >
            <div className="relative">
              {current ? (
                <Link
                  to="/course/$slug/lesson/$index"
                  params={{ slug, index: String(i + 1) }}
                  aria-label={`Start lesson ${i + 1}: ${lesson.title}`}
                  className="flex h-[4.5rem] w-[4.5rem] animate-pulse-ring items-center justify-center rounded-full bg-hero-gradient shadow-card ring-4 ring-primary/25 transition-transform hover:scale-105 active:scale-95"
                >
                  <CompanionAvatar companion={companion} size={54} pose="happy" />
                </Link>
              ) : (
                <Link
                  to="/course/$slug/lesson/$index"
                  params={{ slug, index: String(i + 1) }}
                  disabled={locked}
                  aria-label={`Lesson ${i + 1}: ${lesson.title}`}
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full text-sm font-extrabold transition-transform",
                    done
                      ? "bg-hero-gradient text-primary-foreground shadow-card hover:scale-105"
                      : "cursor-not-allowed border-2 border-dashed border-border bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-6 w-6" strokeWidth={3} /> : <Lock className="h-5 w-5" />}
                </Link>
              )}

              {/* Callout for the active lesson */}
              {current && (
                <div
                  className={cn(
                    "absolute top-1/2 w-44 -translate-y-1/2 animate-pop-in rounded-2xl bg-card p-3 text-left shadow-card",
                    calloutLeft ? "right-[5.5rem]" : "left-[5.5rem]",
                  )}
                >
                  <p className="truncate text-sm font-extrabold">{lesson.title}</p>
                  <p className="text-[11px] font-semibold text-muted-foreground">Earn XP</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Link
                      to="/course/$slug/lesson/$index"
                      params={{ slug, index: String(i + 1) }}
                      className="flex flex-1 items-center justify-center gap-1 rounded-full bg-hero-gradient px-2 py-1.5 text-[11px] font-extrabold text-primary-foreground shadow-soft transition-transform hover:scale-[1.03]"
                    >
                      <Play className="h-3 w-3" />
                      Start +50 XP
                    </Link>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                      <Mic className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              )}

              {/* Titles for non-active nodes sit under the node */}
              {!current && (
                <p
                  className={cn(
                    "absolute left-1/2 top-[3.6rem] w-32 -translate-x-1/2 truncate text-center text-[11px] font-bold",
                    done ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {lesson.title}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
