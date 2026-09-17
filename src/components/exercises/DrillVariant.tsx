import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseRunner } from "./ExerciseRunner";
import { getDrillVariant } from "@/lib/drills.functions";
import type { Exercise, ExerciseKind } from "@/lib/exercises";

/**
 * Fetches and runs ONE drill of a given skill + type from the pre-validated
 * pool, so a repeat of a skill is never a repeat of a scenario — and never a
 * wait. Transient hiccups are retried quietly rather than shown to the learner.
 */

const AUTO_RETRIES = 2;

export function DrillVariant({
  lessonId,
  kind,
  seen,
  index,
  total,
  showCount = true,
  onAnswer,
}: {
  lessonId: string;
  kind: ExerciseKind;
  seen: number[];
  index: number;
  total: number;
  showCount?: boolean;
  onAnswer: (score: number, variant: number, answer: unknown) => void;
}) {
  const [drill, setDrill] = useState<{ exercise: Exercise; variant: number } | null>(null);
  const [stuck, setStuck] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<unknown>(undefined);
  const autoRetries = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setDrill(null);
    setAnswer(undefined);
    setStuck(false);

    const load = () => {
      void getDrillVariant({ data: { lessonId, kind, seen } })
        .then((result) => {
          if (cancelled) return;
          if (result.ok) {
            setDrill({ exercise: result.exercise, variant: result.variant });
            return;
          }
          throw new Error(result.reason);
        })
        .catch(() => {
          if (cancelled) return;
          if (autoRetries.current < AUTO_RETRIES) {
            autoRetries.current += 1;
            window.setTimeout(load, 900);
            return;
          }
          setStuck(true);
        });
    };
    load();

    return () => {
      cancelled = true;
    };
    // `seen` is a snapshot for this fetch; changing it mid-drill must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, kind, attempt]);

  const handleAnswer = useCallback(
    (given: unknown, score: number) => {
      setAnswer(given);
      if (drill) onAnswer(score, drill.variant, given);
    },
    [drill, onAnswer],
  );

  if (stuck) {
    return (
      <div className="mt-5 rounded-3xl bg-card p-5 shadow-soft">
        <p className="text-sm font-semibold text-foreground">
          This drill is still being prepared. Give it a moment.
        </p>
        <Button
          onClick={() => {
            autoRetries.current = 0;
            setAttempt((n) => n + 1);
          }}
          className="mt-4 w-full rounded-full"
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!drill) {
    return (
      <div className="mt-5 space-y-4" aria-busy="true">
        <div className="h-20 animate-pulse rounded-3xl bg-muted" />
        <div className="h-44 animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }

  return (
    <ExerciseRunner
      exercise={drill.exercise}
      index={index}
      total={total}
      showCount={showCount}
      answer={answer}
      onAnswer={handleAnswer}
    />
  );
}
