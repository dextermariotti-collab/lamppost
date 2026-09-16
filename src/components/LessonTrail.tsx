import { useNavigate } from "@tanstack/react-router";
import { Check, Flag, Lock, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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

const TOP = 104;
const STEP = 178;
const UNIT_GAP = 82;
const LESSONS_PER_UNIT = 5;
const X_POSITIONS = [51, 47, 53, 48, 52] as const;

type TrailLesson = { title: string; subtitle?: string };
type TrailState = "completed" | "current" | "locked";
type Node = {
  index: number;
  lesson: TrailLesson;
  state: TrailState;
  unit: number;
  x: number;
  y: number;
};

const shortLabel = (title: string) => {
  const words = title.trim().split(/\s+/);
  let label = "";
  for (const word of words) {
    if (label && `${label} ${word}`.length > 28) break;
    label = label ? `${label} ${word}` : word;
  }
  return label || title.slice(0, 28);
};

export function LessonTrail({
  slug,
  lessons,
  completed,
  companion: _companion,
  unitNames,
}: {
  slug: string;
  lessons: TrailLesson[];
  completed: number;
  companion: { [K in keyof Companion]?: string | null | undefined } | null | undefined;
  /** Region labels, one per unit of five lessons. */
  unitNames?: string[];
}) {
  const navigate = useNavigate();
  const [openNode, setOpenNode] = useState<Node | null>(null);
  const nodes: Node[] = [];
  let y = TOP;

  lessons.forEach((lesson, index) => {
    const unit = Math.floor(index / LESSONS_PER_UNIT);
    if (index > 0) y += STEP + (index % LESSONS_PER_UNIT === 0 ? UNIT_GAP : 0);
    nodes.push({
      index,
      lesson,
      unit,
      x: X_POSITIONS[index % X_POSITIONS.length] ?? 50,
      y,
      state: index < completed ? "completed" : index === completed ? "current" : "locked",
    });
  });

  const height = Math.max(430, y + 148);
  const currentIndex = Math.min(completed, Math.max(0, lessons.length - 1));
  const path = nodes
    .map((node, index) => {
      if (index === 0) return `M ${node.x} ${node.y}`;
      const previous = nodes[index - 1];
      if (!previous) return "";
      const midpoint = (previous.y + node.y) / 2;
      return `C ${previous.x} ${midpoint}, ${node.x} ${midpoint}, ${node.x} ${node.y}`;
    })
    .join(" ");
  const completedPath = nodes
    .slice(0, currentIndex + 1)
    .map((node, index, pathNodes) => {
      if (index === 0) return `M ${node.x} ${node.y}`;
      const previous = pathNodes[index - 1];
      if (!previous) return "";
      const midpoint = (previous.y + node.y) / 2;
      return `C ${previous.x} ${midpoint}, ${node.x} ${midpoint}, ${node.x} ${node.y}`;
    })
    .join(" ");

  const startLesson = (index: number) =>
    navigate({ to: "/course/$slug/lesson/$index", params: { slug, index: String(index + 1) } });

  return (
    <section
      className="expedition-map relative mt-5 overflow-hidden border-y border-border"
      style={{ height }}
    >
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full opacity-35"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
      >
        {Array.from({ length: 8 }, (_, index) => (
          <path
            key={index}
            d={`M -12 ${56 + index * 118} C 18 ${20 + index * 121}, 40 ${100 + index * 109}, 68 ${62 + index * 121} S 112 ${82 + index * 116}, 124 ${38 + index * 121}`}
            className="expedition-contour"
          />
        ))}
      </svg>

      <div className="absolute left-4 top-4 z-10">
        <p className="font-graph text-xs font-bold text-foreground">Expedition route</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {completed} of {lessons.length} checkpoints cleared
        </p>
      </div>

      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
      >
        <path d={path} className="expedition-route-ahead" vectorEffect="non-scaling-stroke" />
        {currentIndex > 0 && (
          <path
            d={completedPath}
            className="expedition-route-traveled"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {nodes.map((node) => {
        const isLeft = node.index % 2 === 0;
        const firstInUnit = node.index % LESSONS_PER_UNIT === 0;
        return (
          <div
            key={node.index}
            className="absolute z-10"
            style={{ left: `${node.x}%`, top: node.y, transform: "translate(-50%, -50%)" }}
          >
            {firstInUnit && (
              <span
                className={cn(
                  "absolute bottom-[4.8rem] whitespace-nowrap text-[10px] font-bold text-muted-foreground",
                  isLeft ? "left-0" : "right-0",
                )}
              >
                {unitNames?.[node.unit] ?? `Region ${node.unit + 1}`}
              </span>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                node.state === "current" ? startLesson(node.index) : setOpenNode(node)
              }
              aria-label={`Lesson ${node.index + 1}: ${node.lesson.title}`}
              className={cn(
                "expedition-node relative h-[4.5rem] w-[4.5rem] rounded-full",
                `expedition-node-${node.state}`,
              )}
            >
              <span className="expedition-node-core flex h-12 w-12 items-center justify-center rounded-full">
                {node.state === "completed" ? (
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                ) : node.state === "current" ? (
                  <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                node.state === "current" ? startLesson(node.index) : setOpenNode(node)
              }
              className={cn(
                "expedition-label absolute top-1/2 h-auto w-[7.5rem] -translate-y-1/2 whitespace-normal p-0 text-left hover:bg-transparent",
                isLeft ? "left-[4.75rem]" : "right-[4.75rem] text-right",
              )}
            >
              <span
                className={cn(
                  "block text-[10px] font-bold",
                  node.state === "locked" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {node.state === "completed"
                  ? "Cleared"
                  : node.state === "current"
                    ? "Current checkpoint"
                    : `Checkpoint ${node.index + 1}`}
              </span>
              <span
                className={cn(
                  "mt-1 block text-xs font-semibold leading-snug",
                  node.state === "locked" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {shortLabel(node.lesson.title)}
              </span>
              {node.lesson.subtitle && node.state === "current" && (
                <span className="mt-1 block line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                  {node.lesson.subtitle}
                </span>
              )}
            </Button>
          </div>
        );
      })}

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center text-muted-foreground">
        <span className="mb-2 h-8 border-l border-dashed border-border" />
        <Flag className="h-5 w-5" />
        <span className="mt-2 text-[10px] font-bold">Course mastery</span>
      </div>

      <Drawer open={Boolean(openNode)} onOpenChange={(open) => !open && setOpenNode(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{openNode?.lesson.title}</DrawerTitle>
            <DrawerDescription>
              {openNode?.state === "completed"
                ? "Checkpoint cleared. Replay it whenever you want a refresher."
                : `Clear checkpoint ${completed + 1} to unlock this lesson.`}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button
              onClick={() => {
                const index = openNode?.state === "completed" ? openNode.index : completed;
                if (typeof index !== "number") return;
                setOpenNode(null);
                startLesson(index);
              }}
            >
              {openNode?.state === "completed" ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {openNode?.state === "completed" ? "Replay checkpoint" : "Go to current checkpoint"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </section>
  );
}
