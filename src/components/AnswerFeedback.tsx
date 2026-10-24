import { Check, Flame, X, Zap } from "lucide-react";
import { GuideMark } from "@/components/LineBullet";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { holdRewards } from "@/lib/reward-hold";

/**
 * The visible reward for a single answer: an opaque strip at the top of the screen's content
 * column says right or wrong and shows the XP earned. It sits at the top so it never covers a
 * screen's Continue bar.
 *
 * Any screen can fire it with `celebrateAnswer(...)`, so drills in lessons, reviews and the
 * daily case all look the same. It makes no sound: each screen plays its cue from its own verdict.
 * One verdict shows at a time: a new one replaces any still up, and a screen moving on to its next
 * step calls `clearAnswerFeedback()`, so a verdict never sits over a question it wasn't about.
 */

export type AnswerCelebration = {
  correct: boolean;
  /** XP earned by this answer, shown as the chip. */
  xp: number;
  /** Consecutive correct answers, including this one. */
  combo?: number;
  /** Extra XP paid by the combo. */
  bonus?: number;
  /** One short line, e.g. the skill practiced. */
  note?: string;
};

const EVENT = "lamppost-answer-celebration";
const CLEAR_EVENT = "lamppost-answer-clear";
const VISIBLE_MS = 1900;

export function celebrateAnswer(detail: AnswerCelebration) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AnswerCelebration>(EVENT, { detail }));
}

/** Takes down the verdict showing, if any, before its time is up. */
export function clearAnswerFeedback() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CLEAR_EVENT));
}

/** Combo pays from the third correct answer on, and is capped to stay fair. */
export const COMBO_BONUS_CAP = 25;
export const comboBonus = (combo: number) =>
  combo >= 3 ? Math.min((combo - 2) * 5, COMBO_BONUS_CAP) : 0;

type Place = { top: number; left: number; width: number };

/**
 * Where the screen's content column is (PhoneFrame's `main`), so the strip lines up with the
 * phone frame at every width instead of with the window. Null when there's nothing to measure.
 */
export function placeOverContent(): Place | null {
  const main = document.getElementById("main-content");
  const scroller = main?.parentElement;
  if (!main || !scroller) return null;
  const column = main.getBoundingClientRect();
  if (column.width <= 0) return null;
  return {
    top: Math.max(scroller.getBoundingClientRect().top, 0),
    left: column.left,
    width: column.width,
  };
}

const answerMessage = ({ correct, xp, bonus = 0 }: AnswerCelebration) =>
  `${correct ? "Correct." : "Not this time."} +${xp + bonus} XP.`;

export function AnswerFeedbackHost() {
  const [shown, setShown] = useState<
    (AnswerCelebration & { id: number; place: Place | null }) | null
  >(null);
  const count = useRef(0);

  useEffect(() => {
    const onCelebrate = (event: Event) => {
      const detail = (event as CustomEvent<AnswerCelebration>).detail;
      count.current += 1;
      setShown({ ...detail, id: count.current, place: placeOverContent() });
    };
    const onClear = () => setShown(null);
    window.addEventListener(EVENT, onCelebrate);
    window.addEventListener(CLEAR_EVENT, onClear);
    return () => {
      window.removeEventListener(EVENT, onCelebrate);
      window.removeEventListener(CLEAR_EVENT, onClear);
    };
  }, []);

  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => setShown(null), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [shown]);

  // A badge or level-up waits until the strip has gone, so the two never land on each other.
  const visible = shown !== null;
  useEffect(() => (visible ? holdRewards() : undefined), [visible]);

  const { correct = false, xp = 0, combo = 0, bonus = 0, note } = shown ?? {};
  const placed: CSSProperties | undefined = shown?.place
    ? { top: shown.place.top, left: shown.place.left, width: shown.place.width }
    : undefined;

  return (
    <>
      {/* Mounted for good, so screen readers hear each new verdict when its text changes. */}
      <p role="status" aria-live="polite" className="sr-only">
        {shown ? answerMessage(shown) : ""}
      </p>
      {shown && (
        <div
          aria-hidden
          data-testid="answer-banner"
          style={placed}
          className={`pointer-events-none fixed z-50 px-3 ${
            placed
              ? "pt-2"
              : "inset-x-0 top-0 mx-auto max-w-[420px] pt-[calc(var(--inset-top)+0.5rem)]"
          }`}
        >
          <div
            key={shown.id}
            className={`sign answer-banner flex min-h-12 items-center gap-3 px-3 py-2 ${
              correct ? "answer-banner-right" : "answer-banner-wrong"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${
                correct
                  ? "bg-success text-success-foreground"
                  : "bg-destructive text-destructive-foreground"
              }`}
            >
              {correct ? (
                <Check className="h-5 w-5" strokeWidth={3} />
              ) : (
                <X className="h-5 w-5" strokeWidth={3} />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">
                {correct ? "Correct." : "Not this time."}
              </p>
              {combo >= 3 ? (
                <p className="flex items-center gap-1 text-[11px] font-bold text-primary-text">
                  <Flame className="h-3.5 w-3.5" />
                  {combo} in a row · +{bonus} bonus XP
                </p>
              ) : note ? (
                <p className="truncate text-[11px] font-semibold text-muted-foreground">{note}</p>
              ) : null}
            </div>

            <span className="flex shrink-0 items-center gap-1 rounded-sm bg-primary px-2 py-1 font-mono text-xs font-bold text-primary-foreground">
              <Zap className="h-3.5 w-3.5" />+{xp + bonus} XP
            </span>
            <GuideMark size={32} />
          </div>
        </div>
      )}
    </>
  );
}
