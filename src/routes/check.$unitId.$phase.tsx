import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CheckQuestion } from "@/components/CheckQuestion";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { UNIT_CHECKS } from "@/content/unit-checks";
import { CURRICULUM_SLUG, unitEntryIndex, unitProgress } from "@/lib/curriculum";
import { dayKey, daysBetween } from "@/lib/days";
import { playCue } from "@/lib/feedback";
import { useProgress } from "@/lib/progress";
import { holdRewards } from "@/lib/reward-hold";
import {
  LATER_CHECK_DAYS,
  checkAvailability,
  isCheckPhase,
  recordCheck,
  useUnitChecks,
  type CheckPhase,
} from "@/lib/unit-checks";

export const Route = createFileRoute("/check/$unitId/$phase")({
  beforeLoad: ({ params }) => {
    if (!UNIT_CHECKS[params.unitId] || !isCheckPhase(params.phase)) {
      throw redirect({ to: "/courses", replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "Unit check — Lamppost" },
      {
        name: "description",
        content:
          "Three real-world questions before and after a unit, and again three months later, to see whether a reasoning skill carries over.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UnitCheckScreen,
});

function UnitCheckScreen() {
  const { unitId, phase: rawPhase } = Route.useParams();
  const phase = rawPhase as CheckPhase;
  const check = UNIT_CHECKS[unitId]!;
  // Three months on, the after-check's own questions come back, to see what stuck.
  const items = phase === "later" ? check.after : check[phase];
  const { doneLessons, hydrated } = useProgress();
  const { checks, hydrated: checksReady } = useUnitChecks();
  const unit = useMemo(
    () => unitProgress(doneLessons).find((u) => u.unit.id === unitId)!,
    [doneLessons, unitId],
  );

  const [step, setStep] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [right, setRight] = useState(0);
  const [finished, setFinished] = useState(false);

  const title =
    phase === "later"
      ? `Unit ${unit.index + 1}, 3 months on`
      : `${phase === "before" ? "Before" : "After"} Unit ${unit.index + 1}`;
  const results = checks[unitId];
  const availability = checkAvailability(phase, unit, results);
  const firstLesson = unitEntryIndex(unit.index, doneLessons) + 1;

  // Badges and level-ups wait while the questions are open.
  const asking = hydrated && checksReady && !finished && availability === "open";
  useEffect(() => (asking ? holdRewards() : undefined), [asking]);

  if (!hydrated || !checksReady) {
    return (
      <PhoneFrame showNav={false}>
        <ScreenHeader title={title} backTo="/courses" />
      </PhoneFrame>
    );
  }

  if (finished || availability === "taken") {
    const mine = finished ? { right, total: items.length } : results![phase]!;
    const before = results?.before;
    const after = results?.after;
    return (
      <PhoneFrame showNav={false}>
        <ScreenHeader title={title} description={unit.unit.title} backTo="/courses" />
        <div className="px-5 pb-10">
          <section className="sign p-5 text-center">
            <p className="legend text-muted-foreground">
              {phase === "before"
                ? "Where you're starting"
                : phase === "after"
                  ? "After the unit"
                  : "Three months on"}
            </p>
            <p className="mt-1 font-mono text-5xl font-bold">
              {mine.right} of {mine.total}
            </p>
            {phase === "after" && before && (
              <p className="mt-3 text-sm font-semibold">
                Before the unit: {before.right} of {before.total}.
              </p>
            )}
            {phase === "later" && after && (
              <p className="mt-3 text-sm font-semibold">
                Straight after the unit: {after.right} of {after.total}.
              </p>
            )}
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              {phase === "before"
                ? "Three new questions wait for you at the end of the unit, so you can see what changed."
                : phase === "after"
                  ? `The questions were different each time, so read any change as a rough signal, not a grade. In ${LATER_CHECK_DAYS / 30} months these three come back once more, to see what stuck.`
                  : "The same three questions as your after-check, so this shows what stuck. A rough signal, not a grade."}
            </p>
          </section>
          {phase === "before" ? (
            <Button asChild className="mt-5 h-12 w-full rounded-sm text-base font-semibold">
              <Link
                to="/course/$slug/lesson/$index"
                params={{ slug: CURRICULUM_SLUG, index: String(firstLesson) }}
              >
                Start the unit <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild className="mt-5 h-12 w-full rounded-sm text-base font-semibold">
              <Link to="/courses">Back to your path</Link>
            </Button>
          )}
        </div>
      </PhoneFrame>
    );
  }

  if (availability !== "open") {
    return (
      <PhoneFrame showNav={false}>
        <ScreenHeader title={title} description={unit.unit.title} backTo="/courses" />
        <div className="px-5 pb-10">
          <p className="sign p-5 text-sm text-muted-foreground">
            {phase === "later"
              ? laterNotYet(results?.after?.day)
              : availability === "not-yet"
                ? `This check opens once the unit's ${unit.total} lessons are done. You've done ${unit.completed}.`
                : "The before-check only counts before any of the unit is studied, so it has closed. The after-check opens when the unit is done."}
          </p>
          <Button asChild variant="outline" className="mt-4 h-11 w-full rounded-sm">
            <Link to="/courses">Back to your path</Link>
          </Button>
        </div>
      </PhoneFrame>
    );
  }

  const item = items[step]!;
  const last = step + 1 >= items.length;
  return (
    <PhoneFrame showNav={false}>
      <ScreenHeader
        title={title}
        description={
          phase === "later"
            ? `${unit.unit.title}. The same three questions as your after-check, three months on. No hints, and only your first answer counts.`
            : `${unit.unit.title}. Three real-world questions, none from the lessons. No hints, and only your first answer counts.`
        }
        backTo="/courses"
      />
      <div className="px-5 pb-10">
        <CheckQuestion
          key={item.id}
          item={item}
          number={step + 1}
          total={items.length}
          onAnswered={(correct) => {
            setAnswered(true);
            playCue(correct ? "correct" : "wrong");
            if (correct) setRight((n) => n + 1);
          }}
        />
        {answered && (
          <Button
            type="button"
            onClick={() => {
              if (last) {
                recordCheck(unitId, phase, right, items.length);
                setFinished(true);
              } else {
                setStep((n) => n + 1);
                setAnswered(false);
              }
            }}
            className="mt-4 h-12 w-full animate-rise-in rounded-sm text-base font-semibold"
          >
            {last ? "See how you did" : "Next question"}
          </Button>
        )}
      </div>
    </PhoneFrame>
  );
}

function laterNotYet(afterDay: string | undefined) {
  if (!afterDay)
    return "This check asks the after-check's questions again three months later. Take the after-check first.";
  const days = LATER_CHECK_DAYS - daysBetween(afterDay, dayKey());
  return `This check asks your after-check's questions again three months later, to see what stuck. It opens in ${days} day${days === 1 ? "" : "s"}.`;
}
