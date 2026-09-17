import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { EXERCISE_LABEL, EXERCISE_QUESTION, type ExerciseKind } from "@/lib/exercises";

/** Shared frame so every drill in the set reads as one family. */
export function ExerciseShell({
  kind,
  index,
  total,
  showCount = true,
  question,
  passage,
  children,
  footer,
}: {
  kind: ExerciseKind;
  index: number;
  total: number;
  /** Single-drill screens hide the counter so it isn't shown twice. */
  showCount?: boolean | undefined;
  /** Lesson-specific instruction, replacing the drill kind's generic one. */
  question?: string | undefined;
  /** The argument, scenario or claim under examination. */
  passage?: ReactNode | undefined;
  children: ReactNode;
  footer?: ReactNode | undefined;
}) {
  return (
    <section className="mt-5 animate-rise-in rounded-3xl bg-card p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold text-primary">{EXERCISE_LABEL[kind]}</p>
        {showCount && total > 1 ? (
          <p className="text-[11px] font-semibold text-muted-foreground">
            {index + 1} of {total}
          </p>
        ) : null}
      </div>

      <h2 className="mt-1 text-xl leading-snug">{question || EXERCISE_QUESTION[kind]}</h2>
      {passage ? (
        <div className="mt-4 rounded-2xl bg-primary-soft p-4 text-[15px] font-semibold leading-relaxed text-accent-foreground">
          {passage}
        </div>
      ) : null}
      {children}
      {footer}
    </section>
  );
}

/** Option row styling shared by every pick-one drill. */
export function OptionButton({
  label,
  picked,
  isAnswer,
  answered,
  onPick,
}: {
  label: string;
  picked: boolean;
  isAnswer: boolean;
  answered: boolean;
  onPick: () => void;
}) {
  const state = !answered
    ? "border-border hover:border-primary/50 hover:-translate-y-0.5"
    : isAnswer
      ? "border-success bg-success/10"
      : picked
        ? "border-destructive bg-destructive/10"
        : "border-border opacity-60";
  return (
    <button
      type="button"
      onClick={() => !answered && onPick()}
      aria-pressed={picked}
      className={`flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all ${state}`}
    >
      <span className="flex-1">{label}</span>
      {answered && isAnswer && (
        <Check className="h-5 w-5 shrink-0 animate-pop-in rounded-full bg-success p-1 text-success-foreground" />
      )}
      {answered && picked && !isAnswer && (
        <X className="h-5 w-5 shrink-0 animate-pop-in rounded-full bg-destructive p-1 text-destructive-foreground" />
      )}
    </button>
  );
}

/** Post-answer explanation panel. */
export function ExerciseFeedback({
  correct,
  headline,
  body,
}: {
  correct: boolean;
  headline: string;
  body: ReactNode;
}) {
  return (
    <div
      aria-live="polite"
      className={`mt-4 animate-pop-in rounded-2xl border-2 p-4 ${
        correct ? "border-success/40 bg-success/10" : "border-primary/30 bg-primary-soft"
      }`}
    >
      <p className="text-[13px] font-bold text-foreground">{headline}</p>
      <div className="mt-1 text-[13px] font-semibold leading-snug text-accent-foreground">
        {body}
      </div>
    </div>
  );
}
