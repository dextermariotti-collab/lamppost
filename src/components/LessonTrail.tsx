import { useNavigate } from "@tanstack/react-router";
import { Check, Lock, Play, RotateCcw, Star } from "lucide-react";
import { useState } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { Companion } from "@/lib/companions";
import { cn } from "@/lib/utils";

/** Constant vertical rhythm between node centres. */
const SPACING = 136;
/** Extra room reserved above a unit banner. */
const UNIT_GAP = 118;
const TOP = 64;
/** Node x positions cycled down the trail: right, centre, left, centre. */
const XS = [70, 50, 30, 50];
const LESSONS_PER_UNIT = 5;

/** Per-unit accent tokens so each chapter reads distinctly while staying on-brand. */
const UNIT_ACCENTS = ["var(--primary)", "var(--flame)", "var(--xp)", "var(--accent-foreground)"];

type TrailLesson = { title: string; subtitle?: string };

type Node = {
  index: number;
  lesson: TrailLesson;
  x: number;
  y: number;
  unit: number;
  state: "completed" | "current" | "locked";
};

type Banner = { unit: number; y: number; title: string; completed: boolean };

/** Two-line-safe label: keeps whole words, caps at ~22 characters. */
const shortLabel = (title: string) => {
  const words = title.split(/\s+/);
  let out = "";
  for (const w of words) {
    if (out && (out + " " + w).length > 22) break;
    out = out ? `${out} ${w}` : w;
  }
  return out || title.slice(0, 22);
};


/**
 * Winding lesson path: one circular node per lesson (never a card), a solid
 * traveled connector up to the current node and a dashed one beyond it, with
 * lessons grouped into units.
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
  const navigate = useNavigate();
  const [openNode, setOpenNode] = useState<Node | null>(null);

  const nodes: Node[] = [];
  const banners: Banner[] = [];
  let y = TOP;

  lessons.forEach((lesson, i) => {
    const unit = Math.floor(i / LESSONS_PER_UNIT);
    if (i % LESSONS_PER_UNIT === 0) {
      if (i > 0) y += UNIT_GAP;
      banners.push({
        unit,
        y: y - 58,
        title: shortLabel(lesson.title),
        completed: completed >= Math.min((unit + 1) * LESSONS_PER_UNIT, lessons.length),
      });
    } else {
      y += SPACING;
    }
    nodes.push({
      index: i,
      lesson,
      x: XS[i % XS.length]!,
      y,
      unit,
      state: i < completed ? "completed" : i === completed ? "current" : "locked",
    });
  });

  const height = y + 96;

  const curve = (pts: Node[]) =>
    pts
      .map((pt, i) => {
        if (i === 0) return `M ${pt.x} ${pt.y}`;
        const prev = pts[i - 1]!;
        const midY = (prev.y + pt.y) / 2;
        return `C ${prev.x} ${midY}, ${pt.x} ${midY}, ${pt.x} ${pt.y}`;
      })
      .join(" ");

  const currentIdx = Math.min(completed, lessons.length - 1);
  const traveled = nodes.slice(0, currentIdx + 1);
  const ahead = nodes.slice(Math.max(currentIdx, 0));

  const startLesson = (index: number) =>
    navigate({ to: "/course/$slug/lesson/$index", params: { slug, index: String(index + 1) } });

  return (
    <div className="relative mt-4" style={{ height }}>
      <svg
        aria-hidden
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {ahead.length > 1 && (
          <path
            d={curve(ahead)}
            fill="none"
            stroke="var(--border)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="2 14"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {traveled.length > 1 && (
          <path
            d={curve(traveled)}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="7"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {banners.map((b) => {
        const accent = UNIT_ACCENTS[b.unit % UNIT_ACCENTS.length]!;
        return (
          <div
            key={`unit-${b.unit}`}
            className="absolute left-0 right-0 animate-rise-in px-1"
            style={{ top: b.y }}
          >
            <div
              className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
              style={{
                background: `color-mix(in oklab, ${accent} 14%, var(--card))`,
                color: `color-mix(in oklab, ${accent} 72%, var(--foreground))`,
                opacity: b.completed ? 0.7 : 1,
              }}
            >
              {b.completed && <Check className="h-4 w-4 shrink-0" strokeWidth={3} />}
              <p className="truncate text-xs font-extrabold uppercase tracking-wide">
                Unit {b.unit + 1} · {b.title}
              </p>
            </div>
          </div>
        );
      })}

      {nodes.map((node) => {
        const current = node.state === "current";
        const size = current ? 60 : 48;
        const calloutLeft = node.x >= 50;

        return (
          <div
            key={node.index}
            className="absolute animate-rise-in"
            style={{
              top: node.y,
              left: `${node.x}%`,
              transform: "translate(-50%, -50%)",
              animationDelay: `${node.index * 60}ms`,
            }}
          >
            <div className="relative">
              {current && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 animate-peek-in"
                >
                  <CompanionAvatar companion={companion} size={44} pose="happy" />
                </div>
              )}

              <button
                onClick={() => (current ? startLesson(node.index) : setOpenNode(node))}
                aria-label={`Lesson ${node.index + 1}: ${node.lesson.title}`}
                style={{ height: size, width: size }}
                className={cn(
                  "flex items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95",
                  node.state === "completed" && "bg-primary text-primary-foreground shadow-soft",
                  current && "animate-pulse-ring bg-card ring-[3px] ring-primary text-primary shadow-card",
                  node.state === "locked" && "bg-muted text-muted-foreground",
                )}
              >
                {node.state === "completed" ? (
                  <Check className="h-5 w-5" strokeWidth={3} />
                ) : current ? (
                  <Play className="h-6 w-6" strokeWidth={2.6} />
                ) : (
                  <Lock className="h-4 w-4" strokeWidth={2.6} />
                )}
              </button>

              {current && (
                <button
                  onClick={() => startLesson(node.index)}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 animate-pop-in whitespace-nowrap rounded-full bg-primary px-3.5 py-1.5 text-xs font-extrabold text-primary-foreground shadow-card",
                    calloutLeft ? "right-[4.5rem]" : "left-[4.5rem]",
                  )}
                >
                  Start
                </button>
              )}

              <p
                className={cn(
                  "absolute left-1/2 w-28 -translate-x-1/2 truncate text-center text-[11px]",
                  current ? "font-extrabold text-foreground" : "font-semibold text-muted-foreground",
                )}
                style={{ top: size / 2 + 8 }}
              >
                {shortLabel(node.lesson.title)}
              </p>
            </div>
          </div>
        );
      })}

      <Drawer open={!!openNode} onOpenChange={(o) => !o && setOpenNode(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              {openNode?.state === "completed" ? (
                <Star className="h-4 w-4 text-xp" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
              {openNode?.lesson.title}
            </DrawerTitle>
            <DrawerDescription>
              {openNode?.state === "completed"
                ? "You finished this lesson. Replay it to refresh the key points."
                : `Finish lesson ${completed + 1} to unlock this.`}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            {openNode?.state === "completed" ? (
              <button
                onClick={() => {
                  const i = openNode.index;
                  setOpenNode(null);
                  startLesson(i);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-hero-gradient px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-soft"
              >
                <RotateCcw className="h-4 w-4" />
                Replay lesson
              </button>
            ) : (
              <button
                onClick={() => {
                  setOpenNode(null);
                  startLesson(completed);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-hero-gradient px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-soft"
              >
                <Play className="h-4 w-4" />
                Go to current lesson
              </button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
