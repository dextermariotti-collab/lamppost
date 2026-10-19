import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GuideMark } from "@/components/LineBullet";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LegalFooter } from "@/components/LegalFooter";
import { PhoneFrame } from "@/components/PhoneFrame";
import { DrillVariant } from "@/components/exercises/DrillVariant";
import { StepView } from "@/components/steps/StepView";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { markOnboardingSeen } from "@/lib/companion-store";
import { companionFromPreset, type Companion } from "@/lib/companions";
import { CURRICULUM_SLUG, CURRICULUM_TITLE, LESSONS, TOTAL_LESSONS, UNITS } from "@/lib/curriculum";
import type { ExerciseKind } from "@/lib/exercises";
import { playCue } from "@/lib/feedback";
import { FIRST_QUESTION, TIME_OPTIONS, saveIntent } from "@/lib/onboarding";
import { useProgress } from "@/lib/progress";
import { holdRewards } from "@/lib/reward-hold";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get set up — Lamppost" },
      {
        name: "description",
        content: "Try one real question, set a daily goal and start. No account needed.",
      },
      { property: "og:title", content: "Get set up — Lamppost" },
      {
        property: "og:description",
        content: "One real question, a daily goal, and you are in.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/onboarding" }],
  }),
  component: Onboarding,
});

/** The three screens, in order. The dots and the flow both read from this. */
const STEPS = ["intro", "question", "setup"] as const;

type Start = "beginning" | "placement" | "choose";

function Onboarding() {
  const navigate = useNavigate();
  const { unlockLessons, setDailyGoal } = useProgress();
  const [step, setStep] = useState(0);
  const [placing, setPlacing] = useState(false);
  const current = STEPS[step];
  const scout = useMemo(() => companionFromPreset("scout"), []);

  const finish = (to: "/" | "/courses" = "/") => {
    markOnboardingSeen();
    navigate({ to, replace: true });
  };

  return (
    <PhoneFrame showNav={false}>
      <div className="flex min-h-full flex-col px-6 pb-4">
        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-1.5">
            <span className="sr-only">
              Step {step + 1} of {STEPS.length}
            </span>
            {STEPS.map((id, i) => (
              <span
                key={id}
                aria-hidden
                className={cn(
                  "h-1.5 transition-all duration-300",
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-border",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => finish()}
            className="flex min-h-11 items-center px-1 text-xs font-bold text-muted-foreground"
          >
            Skip
          </button>
        </div>

        {placing ? (
          <PlacementStep
            companion={scout}
            onDone={(correct, _total, skipped, unlocked) => {
              saveIntent({
                placementScore: skipped ? null : correct,
                placementSkipped: skipped,
              });
              if (!skipped && unlocked > 0) {
                unlockLessons(CURRICULUM_SLUG, CURRICULUM_TITLE, unlocked, TOTAL_LESSONS);
              }
              finish();
            }}
          />
        ) : (
          <>
            {current === "intro" && <IntroStep companion={scout} onNext={() => setStep(1)} />}
            {current === "question" && <QuestionStep onNext={() => setStep(2)} />}
            {current === "setup" && (
              <SetupStep
                onDone={({ minutes, goal }, start) => {
                  saveIntent({ minutesPerDay: minutes });
                  setDailyGoal(goal);
                  if (start === "placement") setPlacing(true);
                  else finish(start === "choose" ? "/courses" : "/");
                }}
              />
            )}
          </>
        )}
      </div>
      <LegalFooter compact />
    </PhoneFrame>
  );
}

function IntroStep({ companion, onNext }: { companion: Companion; onNext: () => void }) {
  return (
    <div className="flex flex-1 animate-rise-in flex-col items-center text-center">
      <div className="mt-10">
        <GuideMark size={72} />
      </div>
      <h1 className="mt-8 text-3xl leading-tight">Practice spotting weak arguments</h1>
      <p className="mt-3 text-base text-muted-foreground">
        Short interactive lessons. No account needed.
      </p>
      <Button
        type="button"
        onClick={onNext}
        className="mt-10 h-14 w-full rounded-sm text-base font-semibold"
      >
        Try one question
      </Button>
    </div>
  );
}

/** A real question with the real feedback, so the app shows itself in about twenty seconds. */
function QuestionStep({ onNext }: { onNext: () => void }) {
  const [answered, setAnswered] = useState(false);
  return (
    <div className="flex flex-1 animate-rise-in flex-col pt-4">
      <StepView
        step={FIRST_QUESTION}
        onResolve={(result) => {
          if (answered) return;
          setAnswered(true);
          playCue(result.score >= 1 ? "correct" : "wrong");
        }}
      />
      {answered && (
        <Button
          type="button"
          onClick={onNext}
          className="mt-4 h-14 w-full animate-rise-in rounded-sm text-base font-semibold"
        >
          Continue <ArrowRight aria-hidden className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * The placement check: a ladder across all seven units, two easy drills to start, then one drill
 * from each unit in order. It climbs while the learner keeps up and stops as soon as two in a row
 * go wrong, so few people see every question.
 */
const PLACEMENT_LADDER = (() => {
  const picks: { lessonId: string; kind: ExerciseKind; lessonIndex: number }[] = [];
  const add = (lesson: (typeof LESSONS)[number] | undefined) => {
    if (!lesson || !lesson.drills[0]) return;
    picks.push({
      lessonId: lesson.id,
      kind: lesson.drills[0] as ExerciseKind,
      lessonIndex: LESSONS.findIndex((l) => l.id === lesson.id) + 1,
    });
  };
  add(LESSONS[0]);
  add(LESSONS[2]);
  for (const unit of UNITS) {
    const inUnit = LESSONS.filter((lesson) => lesson.unitId === unit.id);
    add(inUnit[1] ?? inUnit[0]);
  }
  return picks.slice(0, 10);
})();

const START_OPTIONS: { id: Start; label: string; blurb: string; tag?: string }[] = [
  {
    id: "beginning",
    label: "From the beginning",
    blurb: "Unit 1 of 7. The suggested order.",
    tag: "Recommended",
  },
  {
    id: "placement",
    label: "Skip what I already know",
    blurb: `Up to ${PLACEMENT_LADDER.length} quick questions, no way to fail.`,
  },
  { id: "choose", label: "Choose a unit", blurb: "Every unit is open from day one." },
];

/** The two choices that change anything: how much a day, and where to start. */
function SetupStep({
  onDone,
}: {
  onDone: (time: { minutes: number; goal: number }, start: Start) => void;
}) {
  const [minutes, setMinutes] = useState(15);
  const [start, setStart] = useState<Start>("beginning");
  const time = TIME_OPTIONS.find((o) => o.minutes === minutes) ?? TIME_OPTIONS[1]!;

  return (
    <div className="flex flex-1 animate-rise-in flex-col">
      <h1 className="mt-6 text-3xl leading-tight">Set up your practice</h1>

      <p id="goal-label" className="mt-6 text-sm font-bold">
        Daily goal
      </p>
      <div role="group" aria-labelledby="goal-label" className="mt-2 flex gap-2">
        {TIME_OPTIONS.map((option) => (
          <button
            key={option.minutes}
            type="button"
            aria-pressed={minutes === option.minutes}
            onClick={() => setMinutes(option.minutes)}
            className={cn(
              "min-h-11 flex-1 rounded-xl text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              minutes === option.minutes
                ? "bg-primary text-primary-foreground"
                : "border-2 border-border bg-card text-foreground",
            )}
          >
            {option.minutes} min
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {time.goal === 1 ? "One lesson most days." : `${time.goal} lessons a day.`} You can change
        it in Settings.
      </p>

      <p id="start-label" className="mt-6 text-sm font-bold">
        Where do you want to start?
      </p>
      <RadioGroup
        value={start}
        onValueChange={(next) => setStart(next as Start)}
        aria-labelledby="start-label"
        className="mt-2"
      >
        {START_OPTIONS.map((option) => (
          <label
            key={option.id}
            className={cn(
              "flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3",
              start === option.id ? "border-primary bg-primary-soft" : "border-border bg-card",
            )}
          >
            <RadioGroupItem value={option.id} className="mt-0.5 h-5 w-5" />
            <span>
              <span className="block text-sm font-bold">
                {option.label}
                {option.tag && (
                  <span className="ml-2 text-[11px] font-extrabold text-primary-text">
                    {option.tag}
                  </span>
                )}
              </span>
              <span className="block text-xs text-muted-foreground">{option.blurb}</span>
            </span>
          </label>
        ))}
      </RadioGroup>

      <div className="mt-auto pt-6">
        <Button
          type="button"
          onClick={() => onDone({ minutes: time.minutes, goal: time.goal }, start)}
          className="h-14 w-full rounded-sm text-base font-semibold"
        >
          Start learning
        </Button>
      </div>
    </div>
  );
}

/**
 * Optional quick check, chosen on the setup screen. Only a near-perfect run skips lessons — being
 * pushed past a skill you don't have is worse than repeating one you do.
 */
function PlacementStep({
  companion,
  onDone,
}: {
  companion: Companion;
  onDone: (correct: number, total: number, skipped: boolean, unlocked: number) => void;
}) {
  const pairs = PLACEMENT_LADDER;
  const [step, setStep] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [missRun, setMissRun] = useState(0);
  /** Highest lesson number answered correctly — what gets marked as known. */
  const [reached, setReached] = useState(0);
  const seen = useMemo<number[]>(() => [], []);

  // Badges and level-ups wait until the check is over.
  useEffect(() => holdRewards(), []);

  // Two misses in a row and the check is over; there's nothing more to learn.
  const stopped = missRun >= 2;
  const pair = stopped ? undefined : pairs[step];
  const asked = Math.min(step + (answered ? 1 : 0), pairs.length);

  if (!pair) {
    // Unlock everything below the hardest lesson they actually got right.
    const unlocked = correct >= 2 ? Math.max(reached - 1, 0) : 0;
    return (
      <div className="flex flex-1 animate-pop-in flex-col items-center text-center">
        <div className="mt-8">
          <GuideMark size={72} />
        </div>
        <h1 className="mt-5 text-2xl leading-tight">
          {correct} of {Math.max(asked, 1)}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {unlocked > 0
            ? `Strong start — the first ${unlocked} lessons are marked as known. You can still replay them any time.`
            : "We'll start you at lesson one, where these skills get built properly."}
        </p>
        <Button
          onClick={() => onDone(correct, Math.max(asked, 1), false, unlocked)}
          className="mt-auto h-14 w-full rounded-2xl bg-hero-gradient text-sm font-semibold shadow-card"
        >
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <p className="mt-6 text-xs font-bold text-primary-text">Placement check · drill {step + 1}</p>
      <DrillVariant
        key={`${pair.lessonId}-${step}`}
        lessonId={pair.lessonId}
        kind={pair.kind}
        seen={seen}
        index={step}
        total={pairs.length}
        showCount={false}
        skip={{
          label: "Start at lesson 1",
          onSkip: () => onDone(correct, Math.max(asked, 1), true, 0),
        }}
        onAnswer={(score) => {
          if (answered) return;
          setAnswered(true);
          playCue(score >= 1 ? "correct" : "wrong");
          if (score >= 1) {
            setCorrect((n) => n + 1);
            setMissRun(0);
            setReached((n) => Math.max(n, pair.lessonIndex));
          } else {
            setMissRun((n) => n + 1);
          }
        }}
      />
      {answered && (
        <Button
          onClick={() => {
            setAnswered(false);
            setStep((s) => s + 1);
          }}
          className="mt-auto h-14 w-full rounded-2xl bg-hero-gradient text-sm font-semibold shadow-card"
        >
          {step + 1 >= pairs.length || missRun >= 2 ? "See my result" : "Next drill"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
