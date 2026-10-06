import { CheckCircle2, Info, Lightbulb, RotateCcw, XCircle } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Message, StepEngine } from "./useStepEngine";

const TONE = {
  right: {
    box: "bg-success text-success-foreground",
    icon: <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0" />,
  },
  wrong: {
    box: "bg-destructive text-destructive-foreground",
    icon: <XCircle aria-hidden className="h-5 w-5 shrink-0" />,
  },
  info: {
    box: "bg-card text-foreground shadow-[0_0_0_2px_var(--edge)]",
    icon: <Info aria-hidden className="h-5 w-5 shrink-0" />,
  },
} as const;

/**
 * What the learner is told after acting, as a sign: green for right, red for wrong, a plain
 * panel for information. The verdict is a word and an icon as well as a colour, so it never
 * depends on colour alone. It is a polite live region, so a screen reader hears it as it appears.
 */
export function FeedbackPanel({ message }: { message: Message | null }) {
  return (
    <div aria-live="polite" role="status">
      {message && (
        <div className={`mt-4 animate-pop-in rounded-sm p-4 ${TONE[message.tone].box}`}>
          <p className="legend flex items-center gap-2 text-xs">
            {TONE[message.tone].icon}
            {message.title}
          </p>
          <p className="mt-1.5 text-[13.5px] font-semibold leading-snug">{message.body}</p>
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
  noRetry = false,
  showMeAnytime = false,
  hintHidden = false,
  inlineFeedback = false,
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
  /** For steps that stay tappable after a miss: no Try again button, only Show me. */
  noRetry?: boolean;
  /** For steps checked live: offer "Show me" after two misses even though nothing is "wrong". */
  showMeAnytime?: boolean;
  /** Hide the hint while it would no longer help (the current question is already answered). */
  hintHidden?: boolean;
  /** The step draws the feedback itself, next to what it judges, with `FeedbackPanel`. */
  inlineFeedback?: boolean;
}) {
  const headingId = useId();
  const hintId = useId();
  const { phase, showHint, message, canShow, done } = engine;

  return (
    <section
      aria-labelledby={headingId}
      className="lamp-pool animate-rise-in rounded-sm bg-card p-5 shadow-card"
      data-phase={phase}
    >
      <p className="legend text-muted-foreground">{label}</p>
      <h2 id={headingId} className="mt-1 text-xl leading-snug">
        {prompt}
      </h2>

      <div className="mt-4">{children}</div>

      {hint && !done && !hintHidden && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-x-2">
            <button
              type="button"
              onClick={engine.toggleHint}
              aria-expanded={showHint}
              aria-controls={hintId}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-[13px] font-bold text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Lightbulb aria-hidden className="h-4 w-4" />
              {showHint ? "Hide the hint" : "Need a hint?"}
            </button>
            {!showHint && <span className="text-[11px] text-muted-foreground">Halves the XP.</span>}
          </div>
          <p
            id={hintId}
            hidden={!showHint}
            className="mt-1 rounded-2xl bg-primary-soft p-3 text-[13px] font-semibold leading-snug text-accent-foreground"
          >
            {hint}
          </p>
        </div>
      )}

      {!inlineFeedback && <FeedbackPanel message={message} />}

      {showMeAnytime && phase === "answering" && canShow && onShowAnswer && (
        <Button
          type="button"
          variant="secondary"
          onClick={onShowAnswer}
          className="mt-3 h-11 w-full rounded-sm font-semibold"
        >
          Show me
        </Button>
      )}

      {phase === "wrong" && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {!noRetry && (
            <Button
              type="button"
              onClick={() => {
                onRetry?.();
                engine.retry();
              }}
              className="h-11 flex-1 rounded-sm font-bold"
            >
              <RotateCcw aria-hidden className="h-4 w-4" /> {retryLabel}
            </Button>
          )}
          {canShow && onShowAnswer && (
            <Button
              type="button"
              variant="secondary"
              onClick={onShowAnswer}
              className="h-11 flex-1 rounded-sm font-bold"
            >
              Show me
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
