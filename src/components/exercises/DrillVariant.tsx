import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseRunner } from "./ExerciseRunner";
import { getDrillVariant } from "@/lib/drills.functions";
import type { Exercise, ExerciseKind } from "@/lib/exercises";

/**
 * Fetches and runs ONE fresh drill of a given skill + type. Reviews and the daily
 * challenge both use this, so a repeat of a skill is never a repeat of a scenario.
 */
export function DrillVariant({
  lessonId,
  kind,
  seen,
  index,
  total,
  onAnswer,
}: {
  lessonId: string;
  kind: ExerciseKind;
  seen: number[];
  index: number;
  total: number;
  onAnswer: (score: number, variant: number, answer: unknown) => void;
}) {
  const [drill, setDrill] = useState<{ exercise: Exercise; variant: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<unknown>(undefined);

  useEffect(() => {
    let cancelled = false;
    setDrill(null);
    setAnswer(undefined);
    setError(null);
    void getDrillVariant({ data: { lessonId, kind, seen } })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setDrill({ exercise: result.exercise, variant: result.variant });
        else setError(result.reason);
      })
      .catch(() => {
        if (!cancelled) setError("That drill couldn't be loaded. Try again in a moment.");
      });
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

  if (error) {
    return (
      <div className="mt-5 rounded-3xl bg-card p-5 shadow-soft">
        <p className="text-sm font-semibold text-foreground">{error}</p>
        <Button onClick={() => setAttempt((n) => n + 1)} className="mt-4 w-full rounded-full">
          Try again
        </Button>
      </div>
    );
  }

  if (!drill) {
    return (
      <div className="mt-5 space-y-4" aria-busy="true">
        <p className="text-sm font-semibold text-muted-foreground">Writing you a fresh drill…</p>
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
      answer={answer}
      onAnswer={handleAnswer}
    />
  );
}
