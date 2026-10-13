import { Check, Flame, X, Zap } from "lucide-react";
import { GuideMark } from "@/components/LineBullet";
import { useEffect, useState } from "react";
import { playCue } from "@/lib/feedback";

/**
 * The visible reward for a single answer: a full-width banner slides up, the
 * companion reacts, and the XP earned flies up towards the header counter.
 *
 * Any screen can fire it with `celebrateAnswer(...)`, so drills in lessons,
 * reviews and the daily case all feel the same.
 */

export type AnswerCelebration = {
  correct: boolean;
  /** XP earned by this answer, shown as the flying chip. */
  xp: number;
  /** Consecutive correct answers, including this one. */
  combo?: number;
  /** Extra XP paid by the combo. */
  bonus?: number;
  /** One short line, e.g. the skill practised. */
  note?: string;
};

const EVENT = "lamppost-answer-celebration";
const VISIBLE_MS = 1900;

export function celebrateAnswer(detail: AnswerCelebration) {
  if (typeof window === "undefined") return;
  playCue(detail.correct ? "correct" : "wrong");
  window.dispatchEvent(new CustomEvent<AnswerCelebration>(EVENT, { detail }));
}

/** Combo pays from the third correct answer on, and is capped to stay fair. */
export const COMBO_BONUS_CAP = 25;
export const comboBonus = (combo: number) =>
  combo >= 3 ? Math.min((combo - 2) * 5, COMBO_BONUS_CAP) : 0;

export function AnswerFeedbackHost() {
  const [shown, setShown] = useState<(AnswerCelebration & { at: number }) | null>(null);

  useEffect(() => {
    const onCelebrate = (event: Event) => {
      const detail = (event as CustomEvent<AnswerCelebration>).detail;
      setShown({ ...detail, at: Date.now() });
    };
    window.addEventListener(EVENT, onCelebrate);
    return () => window.removeEventListener(EVENT, onCelebrate);
  }, []);

  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => setShown(null), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [shown]);

  if (!shown) return null;
  const { correct, xp, combo = 0, bonus = 0, note } = shown;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(var(--inset-bottom)+1rem)]"
      aria-live="polite"
    >
      <div
        key={shown.at}
        className={`answer-banner relative w-full max-w-[26rem] rounded-3xl border-2 p-4 shadow-card ${
          correct ? "border-success/50 bg-success/15" : "border-destructive/40 bg-destructive/10"
        }`}
      >
        <span
          key={`${shown.at}-xp`}
          className="xp-fly absolute -top-2 right-5 flex items-center gap-1 rounded-sm bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-card"
        >
          <Zap className="h-3.5 w-3.5" />+{xp + bonus} XP
        </span>

        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              correct
                ? "answer-spring bg-success text-success-foreground"
                : "answer-shake bg-destructive text-destructive-foreground"
            }`}
          >
            {correct ? (
              <Check className="h-6 w-6" strokeWidth={3} />
            ) : (
              <X className="h-6 w-6" strokeWidth={3} />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {correct ? "Correct." : "Not this time."}
            </p>
            {combo >= 3 ? (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-primary-text">
                <Flame className="h-3.5 w-3.5" />
                {combo} in a row · +{bonus} bonus XP
              </p>
            ) : note ? (
              <p className="mt-0.5 truncate text-[11px] font-semibold text-muted-foreground">
                {note}
              </p>
            ) : null}
          </div>

          <GuideMark size={44} />
        </div>
      </div>
    </div>
  );
}
