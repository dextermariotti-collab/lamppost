import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  Circle,
  ClipboardCheck,
  NotebookText,
  Play,
  Timer,
} from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { AnimatedBar } from "@/components/AnimatedBar";
import {
  CURRICULUM_SLUG,
  CURRICULUM_TITLE,
  LESSONS_PER_UNIT,
  TOTAL_LESSONS,
  lessonIndexOf,
  nextLessonIndex,
  unitProgress,
  type UnitProgress,
} from "@/lib/curriculum";
import { useCurriculumCourse } from "@/lib/curriculum-store";
import { useProgress } from "@/lib/progress";
import { useDueDrills } from "@/lib/review-drills";
import {
  checkAvailability,
  checkLine,
  useUnitChecks,
  type UnitCheckResults,
} from "@/lib/unit-checks";

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
  const { state, doneLessons, registerCourse } = useProgress();
  useCurriculumCourse();

  useEffect(() => {
    registerCourse(CURRICULUM_SLUG, CURRICULUM_TITLE, TOTAL_LESSONS);
  }, [registerCourse]);

  const completed = doneLessons.size;
  const units = useMemo(() => unitProgress(doneLessons), [doneLessons]);
  const nextIndex = nextLessonIndex(doneLessons);
  const { items: dueItems } = useDueDrills(100);
  const { checks } = useUnitChecks();

  /** Reviews due, grouped by which unit the lesson belongs to. */
  const dueByUnit = useMemo(() => {
    const map: Record<number, number> = {};
    for (const item of dueItems) {
      const unitIndex = Math.floor(item.lessonIndex / LESSONS_PER_UNIT);
      map[unitIndex] = (map[unitIndex] ?? 0) + 1;
    }
    return map;
  }, [dueItems]);

  // The unit holding the next lesson starts open; opening another closes it.
  const [openUnit, setOpenUnit] = useState<number>(Math.floor(nextIndex / LESSONS_PER_UNIT));
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched) setOpenUnit(Math.floor(nextIndex / LESSONS_PER_UNIT));
  }, [nextIndex, touched]);

  const pct = Math.round((completed / TOTAL_LESSONS) * 100);
  void state;

  return (
    <PhoneFrame>
      <div className="relative px-5 pb-8">
        <h1 className="pt-4 text-3xl">Your path</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {CURRICULUM_TITLE} · {completed} of {TOTAL_LESSONS} lessons ({pct}%)
          {dueItems.length > 0 &&
            ` · ${dueItems.length} review${dueItems.length === 1 ? "" : "s"} due`}
        </p>

        <ul className="mt-5 space-y-3">
          {units.map((unit) => (
            <UnitCard
              key={unit.unit.id}
              unit={unit}
              due={dueByUnit[unit.index] ?? 0}
              open={openUnit === unit.index}
              nextIndex={nextIndex}
              done={doneLessons}
              checks={checks[unit.unit.id]}
              onToggle={() => {
                setTouched(true);
                setOpenUnit((current) => (current === unit.index ? -1 : unit.index));
              }}
            />
          ))}
        </ul>

        <p className="mt-5 text-[13px] text-muted-foreground">
          Suggested order. Any unit can be opened whenever you like.
        </p>
      </div>
    </PhoneFrame>
  );
}

function UnitCard({
  unit,
  due,
  open,
  nextIndex,
  done,
  checks,
  onToggle,
}: {
  unit: UnitProgress;
  due: number;
  open: boolean;
  nextIndex: number;
  done: ReadonlySet<number>;
  checks: UnitCheckResults | undefined;
  onToggle: () => void;
}) {
  const panelId = `unit-${unit.unit.id}`;
  // The before-check belongs before the lessons; everything else about checks comes after them.
  const checkFirst = checkAvailability("before", unit, checks) === "open";
  const start = unit.index * LESSONS_PER_UNIT;
  return (
    <li
      className={`overflow-hidden rounded-3xl border ${
        unit.state === "complete" ? "border-success/40 bg-success/5" : "border-border bg-card"
      }`}
    >
      <h2 className="font-sans text-base">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-h-16 w-full items-center gap-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
        >
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-xl"
          >
            {unit.state === "complete" ? (
              <Check className="h-5 w-5 text-success" strokeWidth={3} />
            ) : (
              unit.unit.emoji
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="line-clamp-2 text-sm font-bold">
                Unit {unit.index + 1} · {unit.unit.title}
              </span>
              {due > 0 && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary-text">
                  <Timer aria-hidden className="h-3 w-3" />
                  {due} due
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-[11px] font-semibold text-muted-foreground">
              {unit.unit.blurb} · {unit.completed} of {unit.total} lessons
            </span>
            <span className="mt-2 flex items-center gap-2">
              <AnimatedBar pct={unit.pct} className="flex-1" animate={false} />
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h2>

      <ul id={panelId} hidden={!open} className="border-t border-border px-2 pb-2 pt-1">
        {checkFirst && (
          <li className="mb-1">
            <CheckRow unit={unit} checks={checks} />
          </li>
        )}
        {unit.lessons.map((lesson, i) => {
          const index = lessonIndexOf(lesson.id);
          const isDone = done.has(index);
          const isNext = index === nextIndex && !isDone;
          return (
            <li key={lesson.id} className="flex items-center">
              <Link
                to="/course/$slug/lesson/$index"
                params={{ slug: CURRICULUM_SLUG, index: String(start + i + 1) }}
                className={`flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2 ${
                  isNext ? "bg-primary-soft" : ""
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                    isDone
                      ? "border-primary bg-primary text-primary-foreground"
                      : isNext
                        ? "border-primary text-primary-text"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : isNext ? (
                    <Play className="h-3 w-3" fill="currentColor" />
                  ) : (
                    <Circle className="h-2 w-2" />
                  )}
                </span>
                <span
                  className={`min-w-0 flex-1 text-sm ${isNext ? "font-bold" : "font-semibold"} ${
                    isDone || isNext ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {lesson.title}
                </span>
                {isDone ? (
                  <span className="sr-only">, done</span>
                ) : (
                  <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
                    {isNext ? "Up next" : `Lesson ${start + i + 1}`}
                  </span>
                )}
              </Link>
              {isDone && (
                <Link
                  to="/notes/$lessonId"
                  params={{ lessonId: lesson.id }}
                  aria-label={`Notes: ${lesson.title}`}
                  className="flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-[12px] font-bold text-primary-text"
                >
                  <NotebookText aria-hidden className="h-3.5 w-3.5" /> Notes
                </Link>
              )}
            </li>
          );
        })}
        {!checkFirst && (
          <li>
            <CheckRow unit={unit} checks={checks} />
          </li>
        )}
      </ul>
    </li>
  );
}

/**
 * The unit's before/after check: offered before the unit is started and again once it is
 * done, and once taken, the results side by side.
 */
function CheckRow({ unit, checks }: { unit: UnitProgress; checks: UnitCheckResults | undefined }) {
  const before = checkAvailability("before", unit, checks);
  const after = checkAvailability("after", unit, checks);
  const phase = before === "open" ? "before" : after === "open" ? "after" : null;
  const line = checkLine(checks);

  if (phase) {
    return (
      <Link
        to="/check/$unitId/$phase"
        params={{ unitId: unit.unit.id, phase }}
        className="mt-1 flex min-h-12 items-center gap-3 rounded-2xl border border-dashed border-primary/50 px-3 py-2"
      >
        <ClipboardCheck aria-hidden className="h-5 w-5 shrink-0 text-primary-text" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">
            {phase === "before" ? "Before you start: a quick check" : "Check what changed"}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            {phase === "before"
              ? "Three real-world questions, so you can see what the unit changes."
              : line
                ? `${line}. Three new questions.`
                : "Three new real-world questions."}
          </span>
        </span>
      </Link>
    );
  }
  if (!line) return null;
  return (
    <p className="mt-1 flex min-h-11 items-center gap-3 px-3 text-[13px] text-muted-foreground">
      <ClipboardCheck aria-hidden className="h-5 w-5 shrink-0" />
      Unit check: {line}
    </p>
  );
}
