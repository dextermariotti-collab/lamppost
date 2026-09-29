import { useCallback, useRef, useState } from "react";
import { canShowAnswer, scoreFor, type StepResult } from "@/lib/steps/scoring";

/**
 * The bookkeeping every interactive step shares: how many misses, whether a hint was used,
 * what is being said to the learner, and reporting the final result exactly once.
 */

export type Phase = "answering" | "wrong" | "right" | "revealed";

export type Message = { tone: "right" | "wrong" | "info"; title: string; body: string };

export function useStepEngine(onResolve: (result: StepResult) => void) {
  const [phase, setPhase] = useState<Phase>("answering");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const resolved = useRef(false);

  const resolve = useCallback(
    (answer: unknown, wrong: number, hint: boolean, revealed: boolean, score?: number) => {
      if (resolved.current) return;
      resolved.current = true;
      onResolve({
        score: score ?? scoreFor({ wrongAttempts: wrong, hintUsed: hint, revealed }),
        answer,
        wrongAttempts: wrong,
        hintUsed: hint,
        revealed,
      });
    },
    [onResolve],
  );

  return {
    phase,
    wrongAttempts,
    hintUsed,
    showHint,
    message,
    done: phase === "right" || phase === "revealed",
    canShow: canShowAnswer(wrongAttempts),

    /**
     * The learner has it. `body` is the explanation (the step's `why`). A step that isn't a
     * single right-or-wrong answer can hand in its own 0-1 score (a hint still halves it).
     */
    right(answer: unknown, body: string, title = "Correct", score?: number) {
      setPhase("right");
      setMessage({ tone: "right", title, body });
      resolve(
        answer,
        wrongAttempts,
        hintUsed,
        false,
        score === undefined ? undefined : hintUsed ? score / 2 : score,
      );
    },

    /** A miss: say specifically what was wrong, and leave them to try again. */
    wrong(body: string, title = "Not quite") {
      setWrongAttempts((n) => n + 1);
      setPhase("wrong");
      setMessage({ tone: "wrong", title, body });
    },

    /** A miss that counts but doesn't stop the learner (a live-checked step): say why. */
    miss(body: string, title = "Not quite") {
      setWrongAttempts((n) => n + 1);
      setMessage({ tone: "wrong", title, body });
    },

    /** The answer is shown, with no marks: after "Show me", or a step that allows one go. */
    reveal(answer: unknown, body: string, title = "Here's how it works") {
      setPhase("revealed");
      setMessage({ tone: "info", title, body });
      resolve(answer, wrongAttempts, hintUsed, true);
    },

    /** Put the step back to being answerable, keeping the miss count. */
    retry() {
      setPhase("answering");
      setMessage(null);
    },

    /** Anything said to the learner outside a right/wrong verdict. */
    say(next: Message | null) {
      setMessage(next);
    },

    toggleHint() {
      setShowHint((shown) => !shown);
      setHintUsed(true);
    },
  };
}

export type StepEngine = ReturnType<typeof useStepEngine>;
