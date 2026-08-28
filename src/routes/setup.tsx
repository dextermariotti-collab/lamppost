import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import aiBot from "@/assets/ai-bot.png";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useCompanion } from "@/lib/companion-store";

import {
  DIFFICULTIES,
  EXPERIENCE,
  FOCUS,
  LENGTHS,
  QUIZ_RIGOR,
  clampBrief,
  type CourseBrief,
} from "@/lib/course-brief";

export const Route = createFileRoute("/setup")({
  validateSearch: (search: Record<string, unknown>) =>
    clampBrief({
      topic: search["topic"],
      lessons: search["lessons"],
      difficulty: search["difficulty"],
      quizRigor: search["quizRigor"],
      experience: search["experience"],
      focus: search["focus"],
      goal: search["goal"],
    }),
  head: () => ({
    meta: [
      { title: "Shape your course — Lamppost" },
      {
        name: "description",
        content:
          "Tell Lamppost how long, how deep and how hands-on you want your course before the AI writes it.",
      },
      { property: "og:title", content: "Shape your course — Lamppost" },
      {
        property: "og:description",
        content: "Pick your course length, difficulty and learning style in a few taps.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/setup" }],
  }),
  component: SetupScreen,
});

type OptionRow = { value: string; label: string; hint: string; reaction: string };

type Step = {
  key: keyof CourseBrief;
  question: string;
  options?: OptionRow[];
  required: boolean;
  /** Shown before the learner picks anything on this step. */
  idle: string;
};

const asRows = (
  list: { value: string | number; label: string; hint: string; reaction: string }[],
): OptionRow[] =>
  list.map((o) => ({
    value: String(o.value),
    label: o.label,
    hint: o.hint,
    reaction: o.reaction,
  }));


const STEPS: Step[] = [
  {
    key: "lessons",
    question: "How long should the course be?",
    options: asRows(LENGTHS),
    required: true,
    idle: "Pick a length and I'll tell you what I think.",
  },
  {
    key: "difficulty",
    question: "How challenging should it be?",
    options: asRows(DIFFICULTIES),
    required: true,
    idle: "Set the difficulty and I'll match my writing to it.",
  },
  {
    key: "quizRigor",
    question: "How tough should the quiz questions be?",
    options: asRows(QUIZ_RIGOR),
    required: true,
    idle: "Choose how hard I should make the questions.",
  },
  {
    key: "experience",
    question: "Where are you starting from?",
    options: asRows(EXPERIENCE),
    required: true,
    idle: "Tell me your starting point so I pitch it right.",
  },
  {
    key: "focus",
    question: "How do you like to learn?",
    options: asRows(FOCUS),
    required: true,
    idle: "Pick a style and I'll shape the lessons around it.",
  },
  {
    key: "goal",
    question: "What do you want to be able to do?",
    required: false,
    idle: "Name the outcome and I'll aim every lesson at it.",
  },
];


function SetupScreen() {
  const initial = Route.useSearch();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<CourseBrief>(initial);
  // -1 is the one-time intro screen; 0..STEPS.length-1 are questions.
  const [step, setStep] = useState(-1);

  // Nothing to build a course from — send them back to enter a topic.
  useEffect(() => {
    if (!brief.topic.trim()) navigate({ to: "/", replace: true });
  }, [brief.topic, navigate]);

  const set = <K extends keyof CourseBrief>(key: K, value: CourseBrief[K]) =>
    setBrief((prev) => ({ ...prev, [key]: value }));

  const total = STEPS.length;
  const current = STEPS[Math.max(0, step)]!;
  const isLast = step === total - 1;
  const rawValue = brief[current.key];
  const selected = typeof rawValue === "number" ? String(rawValue) : rawValue;
  const canContinue = !current.required || Boolean(selected);

  const goBack = () => setStep((s) => s - 1);
  const finish = () => navigate({ to: "/create", search: brief });
  const advance = () => (isLast ? finish() : setStep((s) => s + 1));

  const choose = (value: string) => {
    if (current.key === "lessons") set("lessons", Number(value));
    else set(current.key as "difficulty", value);
  };

  if (step < 0) {
    return (
      <PhoneFrame showNav={false}>
        <ScreenHeader title="Course setup" backTo="/" />
        <div className="flex min-h-[calc(100%-3.75rem)] flex-col px-5 pb-8">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <img
              src={aiBot}
              alt="Lamppost AI assistant"
              width={816}
              height={816}
              className="h-28 w-28 animate-float object-contain"
            />
            <h2 className="mt-5 animate-rise-in text-xl font-extrabold">
              A few quick questions first
            </h2>
            <p className="mt-2 max-w-[17rem] animate-rise-in text-sm font-semibold text-muted-foreground">
              Your answers shape every lesson I write about{" "}
              <span className="font-extrabold text-foreground">{brief.topic}</span>. Six steps, about
              a minute.
            </p>
          </div>
          <PrimaryButton onClick={() => setStep(0)} label="Continue" />
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame showNav={false}>
      <ScreenHeader title="Course setup" backTo="/" />
      <div className="flex min-h-[calc(100%-3.75rem)] flex-col px-5 pb-8">
        <StepProgress step={step} total={total} />

        <h2 className="mt-6 animate-rise-in text-lg font-extrabold">{current.question}</h2>
        {!current.required && (
          <p className="mt-1 text-xs font-semibold text-muted-foreground">Optional</p>
        )}

        <div className="mt-4 space-y-2">
          {current.options?.map((option) => (
            <Row
              key={option.value}
              active={selected === option.value}
              label={option.label}
              hint={option.hint}
              onClick={() => choose(option.value)}
            />
          ))}

          {current.key === "goal" && (
            <div className="rounded-3xl border-2 border-primary/30 bg-card p-4 shadow-soft focus-within:border-primary/60">
              <textarea
                value={brief.goal}
                onChange={(e) => set("goal", e.target.value.slice(0, 200))}
                rows={3}
                placeholder="e.g. shoot sharp photos of my kids indoors"
                aria-label="Your goal"
                className="w-full resize-none bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
              />
              <p className="mt-1 text-right text-[10px] font-bold text-muted-foreground">
                {brief.goal.length}/200
              </p>
            </div>
          )}

          {current.key === "quizRigor" && (
            <p className="pt-1 text-[11px] font-semibold text-muted-foreground">
              This only changes how the answer choices are written — not course length or reading
              level.
            </p>
          )}
        </div>

        <MascotReaction
          line={
            current.options?.find((o) => o.value === selected)?.reaction ??
            (current.key === "goal" && brief.goal.trim()
              ? "Good — that's the target I'll write toward."
              : null)
          }
          idle={current.idle}
        />


        <div className="mt-6 space-y-3">
          <PrimaryButton
            onClick={advance}
            disabled={!canContinue}
            label={isLast ? "Build my course" : "Continue"}
            finishing={isLast}
          />
          <div className="flex items-center justify-center gap-6">
            {step > 0 && (
              <button
                onClick={goBack}
                className="text-xs font-extrabold text-muted-foreground transition-colors hover:text-foreground"
              >
                Back
              </button>
            )}
            {!current.required && (
              <button
                onClick={() => {
                  set("goal", "");
                  advance();
                }}
                className="text-xs font-extrabold text-primary transition-opacity hover:opacity-70"
              >
                Skip this step
              </button>
            )}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

/**
 * Fills the gap between the options and the continue button: the learner's own
 * companion reacting to the option they just picked.
 */
function MascotReaction({ line, idle }: { line: string | null; idle: string }) {
  const { companion } = useCompanion();
  const text = line ?? idle;

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-6">
      <div
        aria-live="polite"
        className="relative max-w-[15rem] text-center"
        key={text}
        style={{ animation: "bubble-in 180ms ease-out both" }}
      >
        <p
          className={`rounded-2xl border-2 px-4 py-2.5 text-[13px] font-bold leading-snug ${
            line
              ? "border-primary/30 bg-primary-soft text-foreground"
              : "border-border bg-card text-muted-foreground"
          }`}
        >
          {text}
        </p>
        <span
          className={`absolute left-1/2 top-full -mt-[7px] h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 ${
            line ? "border-primary/30 bg-primary-soft" : "border-border bg-card"
          }`}
        />
      </div>
      <CompanionAvatar
        companion={companion}
        size={64}
        className="mt-3"
        pose={line ? "happy" : "idle"}
      />
    </div>
  );
}


function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="pt-1">
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i <= step ? "bg-hero-gradient" : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] font-extrabold text-muted-foreground">
        Step {step + 1} of {total}
      </p>
    </div>
  );
}

function PrimaryButton({
  onClick,
  label,
  disabled,
  finishing,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  finishing?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-hero-gradient text-base font-extrabold text-primary-foreground shadow-card transition-transform hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
    >
      {finishing && <Wand2 className="h-5 w-5" />}
      {label}
      {finishing && <Sparkles className="h-4 w-4" />}
    </button>
  );
}

const activeRing = "border-primary bg-primary-soft shadow-soft";

function Row({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-card px-4 py-4 text-left transition-all hover:-translate-y-0.5 ${
        active ? activeRing : "border-border"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          active ? "border-primary" : "border-muted-foreground/40"
        }`}
      >
        {active && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-extrabold ${active ? "text-primary" : ""}`}>
          {label}
        </span>
        <span className="block text-[11px] font-semibold text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
