import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BeforeAfterTable } from "@/components/BeforeAfterTable";
import { CheckQuestion } from "@/components/CheckQuestion";
import { LineBullet } from "@/components/LineBullet";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { UNIT_CHECKS } from "@/content/unit-checks";
import { TOTAL_LESSONS, UNITS, unitProgress } from "@/lib/curriculum";
import { playCue } from "@/lib/feedback";
import { useProgress } from "@/lib/progress";
import { holdRewards } from "@/lib/reward-hold";
import { checkAvailability, overallChange, recordCheck, useUnitChecks } from "@/lib/unit-checks";

export const Route = createFileRoute("/final-check")({
  head: () => ({
    meta: [
      { title: "The final check — Lamppost" },
      {
        name: "description",
        content:
          "Every after-check you haven't taken, one line after another, then each line's before and after side by side.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FinalCheckScreen,
});

/**
 * The end of the map: the after-checks still open, back to back, then every line's results side
 * by side. Each unit's result is saved as soon as its three questions are done, so stopping
 * halfway loses nothing.
 */
function FinalCheckScreen() {
  const { doneLessons, hydrated } = useProgress();
  const { checks, hydrated: checksReady } = useUnitChecks();
  const ready = hydrated && checksReady;

  // The queue is fixed once, when the screen opens, so it doesn't shift as results are saved.
  const [queue, setQueue] = useState<string[] | null>(null);
  useEffect(() => {
    if (!ready || queue !== null) return;
    setQueue(
      unitProgress(doneLessons)
        .filter((u) => checkAvailability("after", u, checks[u.unit.id]) === "open")
        .map((u) => u.unit.id),
    );
  }, [ready, queue, doneLessons, checks]);

  const [unitAt, setUnitAt] = useState(0);
  const [step, setStep] = useState(0);
  const [right, setRight] = useState(0);
  const [answered, setAnswered] = useState(false);

  const unitId = queue?.[unitAt];
  const running = queue !== null && unitId !== undefined;
  // Badges and level-ups wait until the last check is done.
  useEffect(() => (running ? holdRewards() : undefined), [running]);

  return (
    <PhoneFrame showNav={!running}>
      <ScreenHeader
        title="The final check"
        description={
          running
            ? "The after-checks you haven't taken, one line after another. Three real-world questions each, none from the lessons. No hints, and only your first answer counts."
            : "Every line, before and after."
        }
        backTo="/"
      />
      <div className="px-5 pb-10">
        {!ready || queue === null ? null : running ? (
          <Running
            key={`${unitId}-${step}`}
            unitId={unitId}
            unitNumber={unitAt + 1}
            unitsLeft={queue.length}
            step={step}
            answered={answered}
            onAnswered={(correct) => {
              setAnswered(true);
              playCue(correct ? "correct" : "wrong");
              if (correct) setRight((n) => n + 1);
            }}
            onNext={() => {
              const total = UNIT_CHECKS[unitId]!.after.length;
              if (step + 1 < total) {
                setStep((n) => n + 1);
              } else {
                recordCheck(unitId, "after", right, total);
                setUnitAt((n) => n + 1);
                setStep(0);
                setRight(0);
              }
              setAnswered(false);
            }}
          />
        ) : (
          <Summary checks={checks} doneAll={doneLessons.size >= TOTAL_LESSONS} />
        )}
      </div>
    </PhoneFrame>
  );
}

function Running({
  unitId,
  unitNumber,
  unitsLeft,
  step,
  answered,
  onAnswered,
  onNext,
}: {
  unitId: string;
  unitNumber: number;
  unitsLeft: number;
  step: number;
  answered: boolean;
  onAnswered: (correct: boolean) => void;
  onNext: () => void;
}) {
  const unit = UNITS.find((u) => u.id === unitId)!;
  const items = UNIT_CHECKS[unitId]!.after;
  const item = items[step]!;
  const lastQuestion = step + 1 >= items.length;
  const lastUnit = unitNumber >= unitsLeft;
  return (
    <>
      <p className="legend flex items-center gap-2 text-muted-foreground">
        <LineBullet unitId={unitId} />
        {unit.title} / check {unitNumber} of {unitsLeft}
      </p>
      <div className="mt-3">
        <CheckQuestion item={item} number={step + 1} total={items.length} onAnswered={onAnswered} />
      </div>
      {answered && (
        <Button
          type="button"
          onClick={onNext}
          className="mt-4 h-12 w-full animate-rise-in justify-between rounded-sm px-4 text-base font-bold"
        >
          {!lastQuestion ? "Next question" : lastUnit ? "See before and after" : "Next line"}
          <ArrowRight aria-hidden className="h-5 w-5" />
        </Button>
      )}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Each line is saved as you finish it, so you can stop and{" "}
        <Link to="/" className="font-bold text-foreground underline underline-offset-2">
          come back later
        </Link>
        .
      </p>
    </>
  );
}

function Summary({
  checks,
  doneAll,
}: {
  checks: ReturnType<typeof useUnitChecks>["checks"];
  doneAll: boolean;
}) {
  const change = useMemo(() => overallChange(checks), [checks]);
  const missingAfter = UNITS.filter((u) => !checks[u.id]?.after).length;
  return (
    <>
      <section className="sign p-5" aria-labelledby="before-after">
        <h2 id="before-after" className="text-xl leading-tight">
          Before and after
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {change.units > 0
            ? `Across the ${change.units} line${change.units === 1 ? "" : "s"} you checked both times: ${change.before} of ${change.beforeTotal} right before, ${change.after} of ${change.afterTotal} after.`
            : "No line has a before and an after yet, so there is nothing to compare. The after-checks still show where you are now."}
        </p>
        <BeforeAfterTable units={UNITS} checks={checks} className="mt-4" />
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          A rough signal, not a grade: three questions can't measure a skill, but a change across
          seven lines is worth noticing.
          {missingAfter > 0 &&
            ` ${missingAfter} line${missingAfter === 1 ? " has" : "s have"} no after-check yet; it opens when the line's five lessons are done.`}
        </p>
      </section>

      {doneAll && (
        <section className="mt-6" aria-labelledby="from-here">
          <h2 id="from-here" className="legend text-muted-foreground">
            From here
          </h2>
          <ul className="mt-2 divide-y divide-border border-y-2 border-edge text-sm">
            <li className="py-3">
              <span className="block font-bold">A case a day</span>
              <span className="text-muted-foreground">
                One real-world text and three questions from three different lines.
              </span>
            </li>
            <li className="py-3">
              <span className="block font-bold">Each line comes back</span>
              <span className="text-muted-foreground">
                Every lesson comes back in your reviews after 30, 60 and 120 days.
              </span>
            </li>
            <li className="py-3">
              <span className="block font-bold">Three months on</span>
              <span className="text-muted-foreground">
                Each after-check asks its questions once more, to see what stuck.
              </span>
            </li>
          </ul>
        </section>
      )}

      <Button asChild className="mt-6 h-12 w-full rounded-sm text-base font-bold">
        <Link to="/">Back to home</Link>
      </Button>
    </>
  );
}
