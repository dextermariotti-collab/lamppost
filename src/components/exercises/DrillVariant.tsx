import { useCallback, useEffect, useRef, useState } from "react";
import { AiLabel } from "@/components/AiLabel";
import { HelpCircle } from "lucide-react";
import { Button } from "./../ui/button";
import { ExerciseRunner } from "./ExerciseRunner";
import { getDrillVariant } from "@/lib/drills.functions";
import { readIntent } from "@/lib/onboarding";
import { isLimited } from "@/lib/rate-limit";
import { markPoolVariantSeen, needsHelp, seenVariants, targetDifficulty } from "@/lib/rating";
import type { Exercise, ExerciseKind } from "@/lib/exercises";

/**
 * Fetches and runs ONE drill of a given skill + type from the pre-validated
 * pool, so a repeat of a skill is never a repeat of a scenario — and never a
 * wait. The difficulty band follows the learner's rating for that skill, the
 * scenario setting follows their goal, and variants they have already seen are
 * skipped until the pool runs out.
 *
 * A failed fetch is retried quietly a couple of times, so a blip never shows. After that the
 * learner is told plainly what happened (the drill server couldn't be reached, or a usage limit
 * was reached, in which case asking again sooner cannot help) and can try again or, when the
 * screen offers it, move on without this drill.
 */

const RETRY_MS = [700, 1500];
const QUIET_RETRIES = RETRY_MS.length;
const UNREACHABLE = "Couldn't reach the drill server. Check your connection and try again.";
const NOT_READY = "This drill isn't ready yet. Try again in a minute.";

/** The server answered but had no drill to give: reachable, just not ready. */
class NotReady extends Error {}

export function DrillVariant({
  lessonId,
  kind,
  seen,
  index,
  total,
  showCount = true,
  difficulty,
  skip,
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
  /** A way past a drill that can't be fetched, e.g. "Skip this drill". */
  skip?: { label: string; onSkip: () => void };
  /**
   * `score` is how the answer was marked (1 is right). `xpScale` is what the drill pays, as a
   * share of the usual: a nudge halves the XP, never the verdict.
   */
  onAnswer: (
    score: number,
    variant: number,
    answer: unknown,
    exercise: Exercise,
    difficulty: number,
    xpScale: number,
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
  const [pause, setPause] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const retries = useRef(0);

  useEffect(() => {
    let canceled = false;
    let timer = 0;
    setDrill(null);
    setAnswer(undefined);
    setHint(false);
    setPause(null);
    // Quiet retries are for the first load only: once the learner has seen why and asked again,
    // a failure is reported straight away.
    retries.current = round === 0 ? 0 : QUIET_RETRIES;
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
          if (canceled) return;
          if (result.ok) {
            markPoolVariantSeen(lessonId, result.variant);
            setDrill({
              exercise: result.exercise,
              variant: result.variant,
              difficulty: result.difficulty,
            });
            return;
          }
          if (isLimited(result)) {
            setPause(result.reason);
            return;
          }
          throw new NotReady(result.reason);
        })
        .catch((error: unknown) => {
          if (canceled) return;
          if (retries.current >= QUIET_RETRIES) {
            setPause(error instanceof NotReady ? NOT_READY : UNREACHABLE);
            return;
          }
          const wait = RETRY_MS[Math.min(retries.current, RETRY_MS.length - 1)]!;
          retries.current += 1;
          timer = window.setTimeout(load, wait);
        });
    };
    load();

    return () => {
      canceled = true;
      window.clearTimeout(timer);
    };
    // `seen` is a snapshot for this fetch; changing it mid-drill must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, kind, difficulty, round]);

  const handleAnswer = useCallback(
    (given: unknown, score: number) => {
      setAnswer(given);
      if (drill) {
        // A hinted drill pays half, so the hint stays a help and not a shortcut.
        onAnswer(score, drill.variant, given, drill.exercise, drill.difficulty, hint ? 0.5 : 1);
      }
    },
    [drill, hint, onAnswer],
  );

  if (!drill && pause) {
    return (
      <div className="sign mt-5 p-5" role="status">
        <p className="text-sm font-semibold text-foreground">{pause}</p>
        <Button
          type="button"
          onClick={() => setRound((n) => n + 1)}
          className="mt-4 h-11 w-full rounded-sm"
        >
          Try again
        </Button>
        {skip && (
          <Button
            type="button"
            variant="outline"
            onClick={skip.onSkip}
            className="mt-2 h-11 w-full rounded-sm"
          >
            {skip.label}
          </Button>
        )}
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
    <>
      <AiLabel className="mt-4" />
      {answer === undefined && offerHint && (
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
              className="h-11 rounded-sm px-3 text-[13px] font-bold text-primary-text"
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
