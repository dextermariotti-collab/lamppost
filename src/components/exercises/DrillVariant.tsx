import { useCallback, useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "./../ui/button";
import { ExerciseRunner } from "./ExerciseRunner";
import { getDrillVariant } from "@/lib/drills.functions";
import { readIntent } from "@/lib/onboarding";
import { markPoolVariantSeen, needsHelp, seenVariants, targetDifficulty } from "@/lib/rating";
import type { Exercise, ExerciseKind } from "@/lib/exercises";

/**
 * Fetches and runs ONE drill of a given skill + type from the pre-validated
 * pool, so a repeat of a skill is never a repeat of a scenario — and never a
 * wait. The difficulty band follows the learner's rating for that skill, the
 * scenario setting follows their goal, and variants they have already seen are
 * skipped until the pool runs out.
 *
 * Failures are never shown: the fetch keeps retrying quietly behind the loading
 * state, because a "couldn't generate" message is not the learner's problem.
 */

const RETRY_MS = [700, 1200, 2000, 3500, 6000];

export function DrillVariant({
  lessonId,
  kind,
  seen,
  index,
  total,
  showCount = true,
  difficulty,
  onAnswer,
}: {
  lessonId: string;
  kind: ExerciseKind;
  seen: number[];
  index: number;
  total: number;
  showCount?: boolean;
  /** Overrides the rating-derived band (used for the easier inserted drill). */
  difficulty?: 1 | 2 | 3;
  onAnswer: (
    score: number,
    variant: number,
    answer: unknown,
    exercise: Exercise,
    difficulty: number,
  ) => void;
}) {
  const [drill, setDrill] = useState<{
    exercise: Exercise;
    variant: number;
    difficulty: number;
  } | null>(null);
  const [answer, setAnswer] = useState<unknown>(undefined);
  const [hint, setHint] = useState(false);
  const [offerHint, setOfferHint] = useState(false);
  const retries = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    setDrill(null);
    setAnswer(undefined);
    setHint(false);
    retries.current = 0;
    setOfferHint(needsHelp(lessonId));

    const band = difficulty ?? targetDifficulty(lessonId);
    const alreadySeen = Array.from(new Set([...seen, ...seenVariants(lessonId)])).slice(-80);
    const motivation = readIntent().motivation;

    const load = () => {
      void getDrillVariant({
        data: {
          lessonId,
          kind,
          seen: alreadySeen,
          difficulty: band,
          ...(motivation ? { motivation } : {}),
        },
      })
        .then((result) => {
          if (cancelled) return;
          if (result.ok) {
            markPoolVariantSeen(lessonId, result.variant);
            setDrill({
              exercise: result.exercise,
              variant: result.variant,
              difficulty: result.difficulty,
            });
            return;
          }
          throw new Error(result.reason);
        })
        .catch(() => {
          if (cancelled) return;
          const wait = RETRY_MS[Math.min(retries.current, RETRY_MS.length - 1)]!;
          retries.current += 1;
          timer = window.setTimeout(load, wait);
        });
    };
    load();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // `seen` is a snapshot for this fetch; changing it mid-drill must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, kind, difficulty]);

  const handleAnswer = useCallback(
    (given: unknown, score: number) => {
      setAnswer(given);
      if (drill) {
        // A hinted drill pays half, so the hint stays a help and not a shortcut.
        onAnswer(
          hint ? score * 0.5 : score,
          drill.variant,
          given,
          drill.exercise,
          drill.difficulty,
        );
      }
    },
    [drill, hint, onAnswer],
  );

  if (!drill) {
    return (
      <div className="mt-5 space-y-4" aria-busy="true">
        <div className="h-20 animate-pulse rounded-3xl bg-muted" />
        <div className="h-44 animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }

  return (
    <>
      {offerHint && answer === undefined && (
        <div className="mt-5 rounded-3xl border border-dashed border-primary/40 bg-primary-soft/50 p-4">
          {hint ? (
            <p className="text-[13px] font-semibold leading-snug text-accent-foreground">
              Guiding question: what would have to be true for this to hold up — and is it actually
              stated anywhere? This one counts for half XP.
            </p>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setHint(true)}
              className="h-9 rounded-full px-3 text-[13px] font-bold text-primary"
            >
              <HelpCircle className="h-4 w-4" /> Give me a nudge (half XP)
            </Button>
          )}
        </div>
      )}
      <ExerciseRunner
        exercise={drill.exercise}
        index={index}
        total={total}
        showCount={showCount}
        answer={answer}
        onAnswer={handleAnswer}
      />
    </>
  );
}
