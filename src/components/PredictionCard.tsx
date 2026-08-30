import { Check, X } from "lucide-react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import type { Companion } from "@/lib/companions";
import type { Prediction } from "@/lib/courses";

type Props = {
  prediction: Prediction;
  companion: Companion;
  /** Persisted choice, if the learner already answered this lesson's beat. */
  choice: number | undefined;
  onPick: (index: number) => void;
};

/** "Predict before reveal" beat closing the reading part of a lesson. */
export function PredictionCard({ prediction, companion, choice, onPick }: Props) {
  const answered = choice !== undefined;
  const isCorrect = choice === prediction.correct;

  return (
    <section className="mt-4 animate-rise-in rounded-3xl bg-card p-5 shadow-card">
      <p className="text-[11px] font-extrabold tracking-wide text-primary uppercase">
        Predict first
      </p>
      <h2 className="mt-1 text-xl leading-snug">{prediction.question}</h2>

      <div className="mt-4 space-y-2">
        {prediction.options.map((option, i) => {
          const isPicked = choice === i;
          const isAnswer = i === prediction.correct;
          const state = !answered
            ? "bg-primary-soft text-accent-foreground hover:-translate-y-0.5"
            : isAnswer
              ? "bg-primary text-primary-foreground"
              : "bg-primary-soft text-accent-foreground opacity-50";
          return (
            <button
              key={option}
              type="button"
              onClick={() => !answered && onPick(i)}
              aria-pressed={isPicked}
              className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-sm font-semibold transition-all ${state}`}
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
          <div aria-live="polite" className="flex-1 rounded-2xl border-2 border-primary/30 bg-primary-soft px-4 py-2.5">
            <p className="text-[13px] font-extrabold leading-snug text-foreground">
              {isCorrect ? "Called it!" : "So close — that's the usual trap."}
            </p>
            <p className="mt-1 text-[13px] font-semibold leading-snug text-accent-foreground">
              {prediction.explanation}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
