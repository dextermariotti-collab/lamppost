import { CheckCircle2, Info, Lightbulb, RotateCcw, XCircle } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Message, StepEngine } from "./useStepEngine";

const TONE = {
  right: {
    box: "border-success bg-success/10",
    icon: <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-success" />,
    motion: "animate-pop-in",
  },
  wrong: {
    box: "border-destructive border-dashed bg-destructive/5",
    icon: <XCircle aria-hidden className="h-5 w-5 shrink-0 text-destructive" />,
    motion: "answer-shake",
  },
  info: {
    box: "border-primary/40 bg-primary-soft",
    icon: <Info aria-hidden className="h-5 w-5 shrink-0 text-primary-text" />,
    motion: "animate-pop-in",
  },
} as const;

/**
 * What the learner is told after acting. The verdict is a word and an icon as well as a
 * colour and a border style (solid for right, dashed for wrong), so it never depends on
 * colour alone. It is a polite live region, so a screen reader hears it as it appears.
 */
export function FeedbackPanel({ message }: { message: Message | null }) {
  return (
    <div aria-live="polite" role="status">
      {message && (
        <div
          className={`mt-4 rounded-2xl border-2 p-4 ${TONE[message.tone].box} ${TONE[message.tone].motion}`}
        >
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            {TONE[message.tone].icon}
            {message.title}
          </p>
          <p className="mt-1 text-[13px] font-semibold leading-snug text-foreground/85">
            {message.body}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * The frame every interactive step sits in: what kind of step it is, the instruction (a
 * heading, so it is the first thing a screen reader lands on), the interaction, a hint, the
 * feedback, and the retry / show-me controls.
 */
export function StepFrame({
  label,
  prompt,
  hint,
  engine,
  children,
  onShowAnswer,
  onRetry,
  retryLabel = "Try again",
  showMeAnytime = false,
}: {
  label: string;
  prompt: string;
  hint?: string | undefined;
  engine: StepEngine;
  children: ReactNode;
  /** Called when the learner asks to be shown the answer (offered after two misses). */
  onShowAnswer?: (() => void) | undefined;
  /** Runs when the learner chooses to try again, before the step becomes answerable. */
  onRetry?: (() => void) | undefined;
  retryLabel?: string;
  /** For steps checked live: offer "Show me" after two misses even though nothing is "wrong". */
  showMeAnytime?: boolean;
}) {
  const headingId = useId();
  const hintId = useId();
  const { phase, showHint, message, canShow, done } = engine;

  return (
    <section
      aria-labelledby={headingId}
      className="animate-rise-in rounded-3xl bg-card p-5 shadow-card"
      data-phase={phase}
    >
      <p className="text-[11px] font-semibold text-primary-text">{label}</p>
      <h2 id={headingId} className="mt-1 text-xl leading-snug">
        {prompt}
      </h2>

      <div className="mt-4">{children}</div>

      {hint && !done && (
        <div className="mt-3">
          <button
            type="button"
            onClick={engine.toggleHint}
            aria-expanded={showHint}
            aria-controls={hintId}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-[13px] font-bold text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Lightbulb aria-hidden className="h-4 w-4" />
            {showHint ? "Hide the hint" : "Need a hint?"}
          </button>
          {!showHint && (
            <span className="ml-1 text-[11px] text-muted-foreground">Using one halves the XP.</span>
          )}
          <p
            id={hintId}
            hidden={!showHint}
            className="mt-1 rounded-2xl bg-primary-soft p-3 text-[13px] font-semibold leading-snug text-accent-foreground"
          >
            {hint}
          </p>
        </div>
      )}

      <FeedbackPanel message={message} />

      {showMeAnytime && phase === "answering" && canShow && onShowAnswer && (
        <Button
          type="button"
          variant="secondary"
          onClick={onShowAnswer}
          className="mt-3 h-11 w-full rounded-full font-semibold"
        >
          Show me
        </Button>
      )}

      {phase === "wrong" && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={() => {
              onRetry?.();
              engine.retry();
            }}
            className="h-11 flex-1 rounded-full font-semibold"
          >
            <RotateCcw aria-hidden className="h-4 w-4" /> {retryLabel}
          </Button>
          {canShow && onShowAnswer && (
            <Button
              type="button"
              variant="secondary"
              onClick={onShowAnswer}
              className="h-11 flex-1 rounded-full font-semibold"
            >
              Show me
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
