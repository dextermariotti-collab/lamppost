import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, NotebookText } from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { LineBullet } from "@/components/LineBullet";
import {
  CURRICULUM_SLUG,
  CURRICULUM_TITLE,
  TOTAL_LESSONS,
  lessonIndexOf,
  lessonPlace,
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
import { unitAccent } from "@/lib/unit-accent";

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
      const { unitIndex } = lessonPlace(item.lessonIndex);
      map[unitIndex] = (map[unitIndex] ?? 0) + 1;
    }
    return map;
  }, [dueItems]);

  // The unit holding the next lesson starts open; opening another closes it.
  const [openUnit, setOpenUnit] = useState<number>(lessonPlace(nextIndex).unitIndex);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched) setOpenUnit(lessonPlace(nextIndex).unitIndex);
  }, [nextIndex, touched]);

  const pct = Math.round((completed / TOTAL_LESSONS) * 100);
  void state;

  return (
    <PhoneFrame>
      <div className="relative px-5 pb-8">
        <h1 className="pt-4 text-[32px] leading-tight">My Path</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {CURRICULUM_TITLE} · {completed} of {TOTAL_LESSONS} lessons ({pct}%)
          {dueItems.length > 0 &&
            ` · ${dueItems.length} review${dueItems.length === 1 ? "" : "s"} due`}
        </p>

        <ul className="mt-5 border-b-2 border-edge">
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
          Suggested order. Any line, any stop, whenever you like.
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
  const accent = unitAccent(unit.unit.id);
  // The before-check belongs before the lessons; everything else about checks comes after them.
  const checkFirst = checkAvailability("before", unit, checks) === "open";
  return (
    <li className="border-t-2 border-edge">
      <h2 className="font-sans text-base">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-h-14 w-full items-center gap-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <LineBullet unitId={unit.unit.id} size="lg" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-extrabold leading-tight text-foreground">
              {unit.unit.title}
            </span>
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
              {unit.unit.blurb}
              {due > 0 && ` · ${due} review${due === 1 ? "" : "s"} due`}
            </span>
          </span>
          <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground">
            {unit.completed} / {unit.total}
          </span>
          <ChevronDown
            aria-hidden
            className={`h-5 w-5 shrink-0 text-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h2>

      {/* The line: one bar in the unit's color, lessons as stops, checks as interchanges */}
      <ol
        id={panelId}
        hidden={!open}
        className="relative mb-3 ml-0.5 pl-0"
        style={{ "--line": accent.color } as CSSProperties}
      >
        <span aria-hidden className="absolute top-5 bottom-5 left-[9px] w-1.5 bg-[var(--line)]" />
        {checkFirst && <CheckStop unit={unit} checks={checks} />}
        {unit.lessons.map((lesson) => {
          const index = lessonIndexOf(lesson.id);
          const isDone = done.has(index);
          const isNext = index === nextIndex && !isDone;
          return (
            <li key={lesson.id} className="relative flex items-center">
              <Link
                to="/course/$slug/lesson/$index"
                params={{ slug: CURRICULUM_SLUG, index: String(index + 1) }}
                className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-1.5 pl-9"
              >
                <span
                  aria-hidden
                  className={`absolute top-1/2 -translate-y-1/2 rounded-full ${
                    isNext
                      ? "left-0 h-6 w-6 border-[5px] border-foreground bg-card"
                      : isDone
                        ? "left-[3px] h-[18px] w-[18px] border-[3px] border-[var(--line)] bg-[var(--line)]"
                        : "left-[3px] h-[18px] w-[18px] border-[3px] border-[var(--line)] bg-card"
                  }`}
                />
                <span
                  className={`min-w-0 flex-1 text-sm ${isNext ? "font-extrabold" : "font-semibold"} ${
                    isDone || isNext ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {lesson.title}
                  {isDone && <span className="sr-only">, done</span>}
                </span>
                {isNext ? (
                  <span className="legend shrink-0 bg-primary px-1.5 py-1 text-[10px] leading-none text-primary-foreground">
                    You are here
                  </span>
                ) : (
                  !isDone && (
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {index + 1}
                    </span>
                  )
                )}
              </Link>
              {isDone && (
                <Link
                  to="/notes/$lessonId"
                  params={{ lessonId: lesson.id }}
                  aria-label={`Notes: ${lesson.title}`}
                  className="legend flex min-h-11 shrink-0 items-center gap-1 px-2 text-foreground"
                >
                  <NotebookText aria-hidden className="h-3.5 w-3.5" /> Notes
                </Link>
              )}
            </li>
          );
        })}
        {!checkFirst && <CheckStop unit={unit} checks={checks} />}
      </ol>
    </li>
  );
}

/**
 * The unit's before/after check, drawn as an interchange at the start or end of the line:
 * offered before the unit is started and again once it is done, and once taken, the results
 * side by side.
 */
function CheckStop({ unit, checks }: { unit: UnitProgress; checks: UnitCheckResults | undefined }) {
  const before = checkAvailability("before", unit, checks);
  const after = checkAvailability("after", unit, checks);
  const later = checkAvailability("later", unit, checks);
  const phase =
    before === "open" ? "before" : after === "open" ? "after" : later === "open" ? "later" : null;
  const line = checkLine(checks);
  const marker = (
    <span
      aria-hidden
      className="absolute top-1/2 left-0 h-3.5 w-6 -translate-y-1/2 rounded-full border-[2.5px] border-foreground bg-card"
    />
  );

  if (phase) {
    return (
      <li className="relative">
        <Link
          to="/check/$unitId/$phase"
          params={{ unitId: unit.unit.id, phase }}
          className="flex min-h-12 items-center gap-3 py-1.5 pl-9"
        >
          {marker}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-foreground">
              {phase === "before"
                ? "Before you start: a quick check"
                : phase === "after"
                  ? "Check what changed"
                  : "Three months on: what stuck?"}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {phase === "before"
                ? "Three real-world questions, so you can see what the line changes."
                : phase === "later"
                  ? "Your after-check's three questions, once more."
                  : line
                    ? `${line}. Three new questions.`
                    : "Three new real-world questions."}
            </span>
          </span>
          <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-foreground" />
        </Link>
      </li>
    );
  }
  if (!line) return null;
  return (
    <li className="relative flex min-h-11 items-center pl-9 text-[13px] text-muted-foreground">
      {marker}
      Unit check: {line}
    </li>
  );
}
