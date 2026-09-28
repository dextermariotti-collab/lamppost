import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Compass, Sparkles, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { DrillVariant } from "@/components/exercises/DrillVariant";
import { Button } from "@/components/ui/button";
import {
  markOnboardingSeen,
  saveCompanionForUser,
  useSessionUser,
  writeDraft,
} from "@/lib/companion-store";
import {
  COMPANION_ACCESSORIES,
  COMPANION_EXPRESSIONS,
  COMPANION_PALETTES,
  COMPANION_PRESETS,
  companionFromPreset,
  paletteById,
  presetById,
  type Companion,
} from "@/lib/companions";
import { CURRICULUM_SLUG, CURRICULUM_TITLE, LESSONS, TOTAL_LESSONS, UNITS } from "@/lib/curriculum";
import type { ExerciseKind } from "@/lib/exercises";
import { MOTIVATIONS, TIME_OPTIONS, saveIntent, type Motivation } from "@/lib/onboarding";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get set up — Lamppost" },
      {
        name: "description",
        content:
          "Tell Lamppost why you want to think sharper, how much time you have each day, and meet the companion who trains with you.",
      },
      { property: "og:title", content: "Get set up — Lamppost" },
      {
        property: "og:description",
        content: "Two questions, an optional placement check, and your companion.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/onboarding" }],
  }),
  component: Onboarding,
});

const INTRO = {
  icon: Wand2,
  title: "Think clearer, argue better",
  body: "Seven units, from naming hidden assumptions to reading charts, headlines and AI answers with a sharper eye. Short daily drills, reviews timed to when you'd forget, and a companion who keeps you honest.",
} as const;

/** Steps, in order. The stepper dots and the flow both read from this. */
const STEPS = ["intro", "why", "time", "placement", "pick"] as const;

function Onboarding() {
  const navigate = useNavigate();
  const { userId } = useSessionUser();
  const { unlockLessons, setDailyGoal } = useProgress();
  const [step, setStep] = useState(0);
  const [companion, setCompanion] = useState<Companion>(companionFromPreset("scout"));

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const current = STEPS[step];

  const finish = async (chosen: Companion) => {
    markOnboardingSeen();
    if (userId) {
      try {
        await saveCompanionForUser(userId, chosen);
      } catch {
        writeDraft(chosen);
      }
      navigate({ to: "/", replace: true });
      return;
    }
    writeDraft(chosen);
    navigate({ to: "/auth" });
  };

  const skip = () => {
    markOnboardingSeen();
    navigate({ to: "/", replace: true });
  };

  return (
    <PhoneFrame showNav={false}>
      <div className="flex min-h-full flex-col px-6 pb-8">
        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-1.5">
            {STEPS.map((id, i) => (
              <span
                key={id}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-border",
                )}
              />
            ))}
          </div>
          <button onClick={skip} className="text-xs font-bold text-muted-foreground">
            Skip
          </button>
        </div>

        {current === "intro" && <IntroStep onNext={next} />}

        {current === "why" && (
          <WhyStep
            companion={companion}
            onDone={(motivation) => {
              saveIntent({ motivation });
              next();
            }}
          />
        )}

        {current === "time" && (
          <TimeStep
            companion={companion}
            onDone={(minutes, goal) => {
              saveIntent({ minutesPerDay: minutes });
              setDailyGoal(goal);
              next();
            }}
          />
        )}

        {current === "placement" && (
          <PlacementStep
            companion={companion}
            onDone={(correct, _total, skipped, unlocked) => {
              saveIntent({
                placementScore: skipped ? null : correct,
                placementSkipped: skipped,
              });
              if (!skipped && unlocked > 0) {
                unlockLessons(CURRICULUM_SLUG, CURRICULUM_TITLE, unlocked, TOTAL_LESSONS);
              }
              next();
            }}
          />
        )}

        {current === "pick" && (
          <PickStep
            selected={companion.preset}
            onSelect={(presetId) => setCompanion(companionFromPreset(presetId))}
            onNext={() => void finish(companion)}
          />
        )}
      </div>
    </PhoneFrame>
  );
}

function IntroStep({ onNext }: { onNext: () => void }) {
  const Icon = INTRO.icon;
  return (
    <div className="flex flex-1 animate-rise-in flex-col items-center text-center">
      <div className="mt-10">
        <CompanionAvatar companion={companionFromPreset("scout")} size={168} animate />
      </div>
      <span className="mt-8 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary-text">
        <Icon className="h-5 w-5" />
      </span>
      <h1 className="mt-4 text-2xl leading-tight">{INTRO.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{INTRO.body}</p>
      <button
        onClick={onNext}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-hero-gradient p-4 text-sm font-semibold text-primary-foreground shadow-card transition-transform hover:-translate-y-0.5"
      >
        Let's go <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/** The companion's line only appears once something has actually been chosen. */
function Reaction({ companion, line }: { companion: Companion; line: string | null }) {
  if (!line) return null;
  return (
    <div className="mt-4 flex animate-rise-in items-end gap-2">
      <CompanionAvatar companion={{ ...companion, expression: "excited" }} size={48} />
      <p className="flex-1 rounded-2xl rounded-bl-sm border-2 border-primary/30 bg-primary-soft px-3 py-2 text-[13px] font-semibold text-accent-foreground">
        {line}
      </p>
    </div>
  );
}

function OptionRow({
  active,
  label,
  blurb,
  onClick,
}: {
  active: boolean;
  label: string;
  blurb: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "w-full rounded-2xl border-2 p-3.5 text-left transition-all",
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
      )}
    >
      <p className="text-sm font-bold text-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{blurb}</p>
    </button>
  );
}

function WhyStep({
  companion,
  onDone,
}: {
  companion: Companion;
  onDone: (motivation: Motivation) => void;
}) {
  const [chosen, setChosen] = useState<Motivation | null>(null);
  const reaction = MOTIVATIONS.find((m) => m.id === chosen)?.reaction ?? null;

  return (
    <div className="flex flex-1 animate-rise-in flex-col">
      <h1 className="mt-6 text-2xl leading-tight">Why do you want to think sharper?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        It shapes the examples you'll see. Pick the closest one.
      </p>

      <div className="mt-4 space-y-2.5">
        {MOTIVATIONS.map((option) => (
          <OptionRow
            key={option.id}
            active={chosen === option.id}
            label={option.label}
            blurb={option.blurb}
            onClick={() => setChosen(option.id)}
          />
        ))}
      </div>

      <Reaction companion={companion} line={reaction} />

      <Button
        disabled={!chosen}
        onClick={() => chosen && onDone(chosen)}
        className="mt-auto h-14 w-full rounded-2xl bg-hero-gradient text-sm font-semibold shadow-card"
      >
        Next <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function TimeStep({
  companion,
  onDone,
}: {
  companion: Companion;
  onDone: (minutes: number, goal: number) => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const option = TIME_OPTIONS.find((o) => o.minutes === chosen);

  return (
    <div className="flex flex-1 animate-rise-in flex-col">
      <h1 className="mt-6 text-2xl leading-tight">How much time per day?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This sets your daily goal. You can change it in settings.
      </p>

      <div className="mt-4 space-y-2.5">
        {TIME_OPTIONS.map((o) => (
          <OptionRow
            key={o.minutes}
            active={chosen === o.minutes}
            label={o.label}
            blurb={o.goal === 1 ? "One lesson most days" : `${o.goal} lessons a day`}
            onClick={() => setChosen(o.minutes)}
          />
        ))}
      </div>

      <Reaction companion={companion} line={option?.reaction ?? null} />

      <Button
        disabled={!option}
        onClick={() => option && onDone(option.minutes, option.goal)}
        className="mt-auto h-14 w-full rounded-2xl bg-hero-gradient text-sm font-semibold shadow-card"
      >
        Next <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Optional five-drill check. Only a near-perfect run skips lessons — being
 * pushed past a skill you don't have is worse than repeating one you do.
 */
function PlacementStep({
  companion,
  onDone,
}: {
  companion: Companion;
  onDone: (correct: number, total: number, skipped: boolean, unlocked: number) => void;
}) {
  /**
   * A ladder across all seven units: two easy drills to start, then one drill
   * from each unit in order. It climbs while the learner keeps up and stops as
   * soon as two in a row go wrong, so nobody sits through ten drills.
   */
  const pairs = useMemo(() => {
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
  }, []);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [missRun, setMissRun] = useState(0);
  /** Highest lesson number answered correctly — what gets marked as known. */
  const [reached, setReached] = useState(0);
  const seen = useMemo<number[]>(() => [], []);

  // Two misses in a row and the check is over; there's nothing more to learn.
  const stopped = missRun >= 2;
  const pair = stopped ? undefined : pairs[step];
  const asked = Math.min(step + (answered ? 1 : 0), pairs.length);

  if (!started) {
    return (
      <div className="flex flex-1 animate-rise-in flex-col">
        <h1 className="mt-6 text-2xl leading-tight">Want to skip what you already know?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Five quick drills from the first unit. Get nearly all of them right and we'll mark those
          lessons as done. Get them wrong and nothing changes — it's not a test you can fail.
        </p>
        <div className="mt-6 flex justify-center">
          <CompanionAvatar companion={companion} size={140} animate />
        </div>
        <div className="mt-auto space-y-2">
          <Button
            onClick={() => setStarted(true)}
            className="h-14 w-full rounded-2xl bg-hero-gradient text-sm font-semibold shadow-card"
          >
            Take the check <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => onDone(0, pairs.length, true, 0)}
            className="h-11 w-full rounded-2xl text-sm font-bold text-muted-foreground"
          >
            Start from lesson one
          </Button>
        </div>
      </div>
    );
  }

  if (!pair) {
    // Unlock everything below the hardest lesson they actually got right.
    const unlocked = correct >= 2 ? Math.max(reached - 1, 0) : 0;
    return (
      <div className="flex flex-1 animate-pop-in flex-col items-center text-center">
        <div className="mt-8">
          <CompanionAvatar
            companion={{ ...companion, expression: unlocked > 0 ? "excited" : "happy" }}
            size={140}
            animate
          />
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
        onAnswer={(score) => {
          if (answered) return;
          setAnswered(true);
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

function PickStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: string;
  onSelect: (presetId: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-1 animate-rise-in flex-col">
      <h1 className="mt-6 text-2xl leading-tight">Who's coming with you?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {presetById(selected).name} — {presetById(selected).blurb}
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {COMPANION_PRESETS.map((preset) => {
          const active = preset.id === selected;
          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset.id)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl p-2 pb-2.5 transition-all duration-200",
                active
                  ? "bg-primary/10 ring-2 ring-primary shadow-soft -translate-y-0.5"
                  : "bg-card shadow-soft hover:-translate-y-0.5",
              )}
            >
              <CompanionAvatar companion={companionFromPreset(preset.id)} size={64} />
              <span className="text-[11px] font-extrabold">{preset.name}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-hero-gradient p-4 text-sm font-semibold text-primary-foreground shadow-card transition-transform hover:-translate-y-0.5"
      >
        That's my companion <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
