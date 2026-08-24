import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import aiBot from "@/assets/ai-bot.png";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
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

function SetupScreen() {
  const initial = Route.useSearch();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<CourseBrief>(initial);

  // Nothing to build a course from — send them back to enter a topic.
  useEffect(() => {
    if (!brief.topic.trim()) navigate({ to: "/", replace: true });
  }, [brief.topic, navigate]);

  const set = <K extends keyof CourseBrief>(key: K, value: CourseBrief[K]) =>
    setBrief((prev) => ({ ...prev, [key]: value }));

  return (
    <PhoneFrame showNav={false}>
      <ScreenHeader title="Course setup" backTo="/" />
      <div className="px-5 pb-10">
        <div className="flex animate-rise-in items-start gap-3 rounded-3xl bg-primary-soft p-4">
          <img
            src={aiBot}
            alt="Lamppost AI assistant"
            width={816}
            height={816}
            className="h-14 w-14 shrink-0 animate-float object-contain"
          />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-accent-foreground">
              A few quick questions first
            </p>
            <p className="mt-0.5 text-xs font-semibold text-accent-foreground/80">
              Your answers shape every lesson I write about{" "}
              <span className="font-extrabold">{brief.topic}</span>.
            </p>
          </div>
        </div>

        <Field label="How long should the course be?" step={1}>
          <div className="grid grid-cols-3 gap-2">
            {LENGTHS.map((option) => (
              <Choice
                key={option.value}
                active={brief.lessons === option.value}
                label={option.label}
                hint={option.hint}
                onClick={() => set("lessons", option.value)}
              />
            ))}
          </div>
        </Field>

        <Field label="How challenging should it be?" step={2}>
          <div className="space-y-2">
            {DIFFICULTIES.map((option) => (
              <Row
                key={option.value}
                active={brief.difficulty === option.value}
                label={option.label}
                hint={option.hint}
                onClick={() => set("difficulty", option.value)}
              />
            ))}
          </div>
        </Field>

        <Field label="Where are you starting from?" step={3}>
          <div className="space-y-2">
            {EXPERIENCE.map((option) => (
              <Row
                key={option.value}
                active={brief.experience === option.value}
                label={option.label}
                hint={option.hint}
                onClick={() => set("experience", option.value)}
              />
            ))}
          </div>
        </Field>

        <Field label="How do you like to learn?" step={4}>
          <div className="grid grid-cols-3 gap-2">
            {FOCUS.map((option) => (
              <Choice
                key={option.value}
                active={brief.focus === option.value}
                label={option.label}
                hint={option.hint}
                onClick={() => set("focus", option.value)}
              />
            ))}
          </div>
        </Field>

        <Field label="What do you want to be able to do?" step={5}>
          <div className="rounded-3xl border-2 border-primary/30 bg-card p-4 shadow-soft focus-within:border-primary/60">
            <textarea
              value={brief.goal}
              onChange={(e) => set("goal", e.target.value.slice(0, 200))}
              rows={2}
              placeholder="Optional — e.g. shoot sharp photos of my kids indoors"
              aria-label="Your goal"
              className="w-full resize-none bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
            />
            <p className="mt-1 text-right text-[10px] font-bold text-muted-foreground">
              {brief.goal.length}/200
            </p>
          </div>
        </Field>

        <button
          onClick={() => navigate({ to: "/create", search: brief })}
          className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-hero-gradient text-base font-extrabold text-primary-foreground shadow-card transition-transform hover:scale-[1.02] active:scale-95"
        >
          <Wand2 className="h-5 w-5" />
          Build my course
          <Sparkles className="h-4 w-4" />
        </button>
      </div>
    </PhoneFrame>
  );
}

function Field({
  label,
  step,
  children,
}: {
  label: string;
  step: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 animate-rise-in" style={{ animationDelay: `${step * 60}ms` }}>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-[11px] font-extrabold text-primary">
          {step}
        </span>
        {label}
      </h2>
      {children}
    </section>
  );
}

const activeRing = "border-primary bg-primary-soft shadow-soft";

function Choice({
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
      className={`rounded-2xl border-2 bg-card px-2 py-3 text-center transition-all hover:-translate-y-0.5 ${
        active ? activeRing : "border-border"
      }`}
    >
      <span className={`block text-xs font-extrabold ${active ? "text-primary" : ""}`}>
        {label}
      </span>
      <span className="mt-0.5 block text-[10px] font-semibold text-muted-foreground">{hint}</span>
    </button>
  );
}

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
      className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 text-left transition-all hover:-translate-y-0.5 ${
        active ? activeRing : "border-border"
      }`}
    >
      <span
        className={`h-4 w-4 shrink-0 rounded-full border-2 ${
          active ? "border-primary bg-primary" : "border-muted-foreground/40"
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-extrabold ${active ? "text-primary" : ""}`}>
          {label}
        </span>
        <span className="block text-[11px] font-semibold text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
