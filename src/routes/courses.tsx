import { useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, Timer } from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { AnimatedBar } from "@/components/AnimatedBar";
import {
  CURRICULUM_SLUG,
  CURRICULUM_TITLE,
  LESSONS_PER_UNIT,
  TOTAL_LESSONS,
  lessonIndexOf,
  unitProgress,
} from "@/lib/curriculum";
import { useCurriculumCourse } from "@/lib/curriculum-store";
import { useProgress } from "@/lib/progress";
import { useReviewQueue } from "@/lib/reviews";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Your critical thinking path — Lamppost" },
      {
        name: "description",
        content:
          "The seven units of Lamppost's critical thinking curriculum, with your progress through each one.",
      },
      { property: "og:title", content: "Your critical thinking path — Lamppost" },
      {
        property: "og:description",
        content: "Claims, evidence, fallacies, biases, arguments, probability and media literacy.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/courses" }],
  }),
  component: MyPath,
});

function MyPath() {
  const { state, registerCourse } = useProgress();
  useCurriculumCourse();

  useEffect(() => {
    registerCourse(CURRICULUM_SLUG, CURRICULUM_TITLE, TOTAL_LESSONS);
  }, [registerCourse]);

  const completed = state.courses[CURRICULUM_SLUG]?.completed ?? 0;
  const units = useMemo(() => unitProgress(completed), [completed]);

  const completedBySlug = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(state.courses).map(([slug, c]) => [slug, c.completed]),
      ) as Record<string, number>,
    [state.courses],
  );
  const { items: dueItems } = useReviewQueue(completedBySlug);

  /** Reviews due, grouped by which unit the lesson belongs to. */
  const dueByUnit = useMemo(() => {
    const map: Record<number, number> = {};
    for (const item of dueItems) {
      const unitIndex = Math.floor(item.lessonIndex / LESSONS_PER_UNIT);
      map[unitIndex] = (map[unitIndex] ?? 0) + 1;
    }
    return map;
  }, [dueItems]);

  const pct = Math.round((completed / TOTAL_LESSONS) * 100);

  return (
    <PhoneFrame>
      <div className="relative px-5 pb-8">
        <h1 className="pt-4 text-3xl">Your path</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {CURRICULUM_TITLE} · {completed} of {TOTAL_LESSONS} lessons ({pct}%)
          {dueItems.length > 0 && ` · ${dueItems.length} review${dueItems.length === 1 ? "" : "s"} due`}
        </p>

        <div className="mt-5 space-y-3">
          {units.map((unit, i) => {
            const due = dueByUnit[i] ?? 0;
            const firstLesson = unit.lessons[0];
            const target = unit.completed > 0 && unit.state !== "complete"
              ? completed + 1
              : lessonIndexOf(firstLesson?.id ?? "") + 1;
            return (
              <Link
                key={unit.unit.id}
                to="/course/$slug/lesson/$index"
                params={{ slug: CURRICULUM_SLUG, index: String(Math.max(1, target)) }}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`flex animate-rise-in items-center gap-3 rounded-3xl border-2 p-4 shadow-soft transition-transform hover:-translate-y-0.5 ${
                  unit.state === "complete"
                    ? "border-success/40 bg-success/5"
                    : due > 0
                      ? "border-primary/35 bg-card"
                      : "border-transparent bg-card"
                }`}
              >
                <div className="relative shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-xl">
                    <span aria-hidden>{unit.unit.emoji}</span>
                  </div>
                  {unit.state === "complete" && (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-success-foreground shadow-soft">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold">
                      Unit {i + 1} · {unit.unit.title}
                    </p>
                    {due > 0 && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        <Timer className="h-3 w-3" />
                        {due} due
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                    {unit.unit.blurb} · {unit.completed}/{unit.total} lessons
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <AnimatedBar pct={unit.pct} className="flex-1" />
                    <span className="text-[11px] font-bold text-muted-foreground">{unit.pct}%</span>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>

        <Link
          to="/course/$slug"
          params={{ slug: CURRICULUM_SLUG }}
          className="mt-5 flex items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-primary/40 p-5 text-sm font-bold text-primary"
        >
          See the full route map
        </Link>
      </div>
    </PhoneFrame>
  );
}
