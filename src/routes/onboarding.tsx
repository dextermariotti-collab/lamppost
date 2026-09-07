import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Compass, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Meet your companion — Lamppost" },
      {
        name: "description",
        content:
          "Pick and customise the companion that learns alongside you in Lamppost's AI-built courses.",
      },
      { property: "og:title", content: "Meet your companion — Lamppost" },
      {
        property: "og:description",
        content: "Choose a mascot companion, then start your first AI-built course.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/onboarding" }],
  }),
  component: Onboarding,
});

const INTRO = [
  {
    icon: Wand2,
    title: "Any topic, a real course",
    body: "Tell Lamppost what you want to learn and it builds a full path — lessons, examples and quizzes.",
  },
  {
    icon: Compass,
    title: "One step at a time",
    body: "Short multi-part lessons keep momentum, and your streak, XP and gems track every win.",
  },
  {
    icon: Sparkles,
    title: "You won't learn alone",
    body: "Pick a companion to travel the path with you. It shows up on your home screen and celebrates your streaks.",
  },
] as const;

function Onboarding() {
  const navigate = useNavigate();
  const { userId } = useSessionUser();
  const [step, setStep] = useState(0);
  const [companion, setCompanion] = useState<Companion>(companionFromPreset("scout"));

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
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
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

        {step < 3 ? (
          <IntroStep index={step} onNext={() => setStep(step + 1)} />
        ) : step === 3 ? (
          <PickStep
            selected={companion.preset}
            onSelect={(presetId) => setCompanion(companionFromPreset(presetId))}
            onNext={() => setStep(4)}
          />
        ) : (
          <CustomizeStep
            companion={companion}
            onChange={setCompanion}
            onDone={() => void finish(companion)}
          />
        )}
      </div>
    </PhoneFrame>
  );
}

function IntroStep({ index, onNext }: { index: number; onNext: () => void }) {
  const slide = INTRO[index]!;
  const Icon = slide.icon;
  return (
    <div key={index} className="flex flex-1 animate-rise-in flex-col items-center text-center">
      <div className="mt-10">
        <CompanionAvatar
          companion={companionFromPreset(["scout", "pip", "sage"][index] ?? "scout")}
          size={168}
          animate
        />
      </div>
      <span className="mt-8 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h1 className="mt-4 text-2xl leading-tight">{slide.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{slide.body}</p>
      <button
        onClick={onNext}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-hero-gradient p-4 text-sm font-semibold text-primary-foreground shadow-card transition-transform hover:-translate-y-0.5"
      >
        {index === 2 ? "Pick my companion" : "Next"} <ArrowRight className="h-4 w-4" />
      </button>
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
        Make it mine <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function CustomizeStep({
  companion,
  onChange,
  onDone,
}: {
  companion: Companion;
  onChange: (c: Companion) => void;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-1 animate-rise-in flex-col">
      <div className="mt-4 flex flex-col items-center rounded-3xl bg-card p-4 shadow-soft">
        <CompanionAvatar companion={companion} size={140} animate />
        <p className="mt-1 text-sm font-extrabold">{presetById(companion.preset).name}</p>
      </div>

      <Row label="Colour">
        {COMPANION_PALETTES.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange({ ...companion, palette: p.id })}
            aria-label={p.name}
            aria-pressed={companion.palette === p.id}
            className={cn(
              "h-9 w-9 rounded-full transition-transform",
              companion.palette === p.id
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                : "hover:scale-105",
            )}
            style={{ background: paletteById(p.id).base }}
          />
        ))}
      </Row>

      <Row label="Accessory">
        {COMPANION_ACCESSORIES.map((a) => (
          <Chip
            key={a.id}
            active={companion.accessory === a.id}
            onClick={() => onChange({ ...companion, accessory: a.id })}
          >
            {a.name}
          </Chip>
        ))}
      </Row>

      <Row label="Mood">
        {COMPANION_EXPRESSIONS.map((e) => (
          <Chip
            key={e.id}
            active={companion.expression === e.id}
            onClick={() => onChange({ ...companion, expression: e.id })}
          >
            {e.name}
          </Chip>
        ))}
      </Row>

      <button
        onClick={onDone}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-hero-gradient p-4 text-sm font-semibold text-primary-foreground shadow-card transition-transform hover:-translate-y-0.5"
      >
        <Check className="h-4 w-4" /> That's the one
      </button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold   text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-2 text-xs font-semibold transition-all",
        active ? "bg-primary text-primary-foreground shadow-soft" : "bg-card shadow-soft",
      )}
    >
      {children}
    </button>
  );
}
