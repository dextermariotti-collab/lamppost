import { Check, Quote, X } from "lucide-react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import type { Companion } from "@/lib/companions";
import type { FlawDrill } from "@/lib/courses";

type Props = {
  drill: FlawDrill;
  companion: Companion;
  /** Persisted choice, if the learner already answered this lesson's drill. */
  choice: number | undefined;
  onPick: (index: number) => void;
};

/** The core critical-thinking beat: read an argument, name what's wrong with it. */
export function SpotTheFlawCard({ drill, companion, choice, onPick }: Props) {
  const answered = choice !== undefined;
  const isCorrect = choice === drill.correct;

  return (
    <section className="mt-5 animate-rise-in rounded-3xl bg-card p-5 shadow-card">
      <p className="text-[11px] font-semibold text-primary">Spot the flaw</p>
      <h2 className="mt-1 text-xl leading-snug">What's wrong with this reasoning?</h2>

      <blockquote className="mt-4 flex gap-3 rounded-2xl bg-primary-soft p-4">
        <Quote aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-[15px] leading-relaxed font-semibold text-accent-foreground">
          {drill.claim}
        </p>
      </blockquote>

      <div className="mt-4 space-y-2">
        {drill.options.map((option, i) => {
          const isPicked = choice === i;
          const isAnswer = i === drill.correct;
          const state = !answered
            ? "border-border hover:border-primary/50 hover:-translate-y-0.5"
            : isAnswer
              ? "border-success bg-success/10"
              : isPicked
                ? "border-destructive bg-destructive/10"
                : "border-border opacity-60";
          return (
            <button
              key={option}
              type="button"
              onClick={() => !answered && onPick(i)}
              aria-pressed={isPicked}
              className={`flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all ${state}`}
            >
              <span className="flex-1">{option}</span>
              {answered && isAnswer && (
                <Check className="h-5 w-5 shrink-0 animate-pop-in rounded-full bg-success p-1 text-success-foreground" />
              )}
              {answered && isPicked && !isAnswer && (
                <X className="h-5 w-5 shrink-0 animate-pop-in rounded-full bg-destructive p-1 text-destructive-foreground" />
              )}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4 flex items-end gap-2 animate-pop-in">
          <CompanionAvatar companion={companion} size={56} className="shrink-0" />
          <div
            aria-live="polite"
            className="flex-1 rounded-2xl border-2 border-primary/30 bg-primary-soft px-4 py-2.5"
          >
            <p className="text-[13px] font-semibold leading-snug text-foreground">
              {isCorrect ? "Exactly — you named it." : "Not quite — here's the real break."}
              {drill.fallacy ? ` (${drill.fallacy})` : ""}
            </p>
            <p className="mt-1 text-[13px] font-semibold leading-snug text-accent-foreground">
              {drill.explanation}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
