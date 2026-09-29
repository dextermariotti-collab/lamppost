import { Link } from "@tanstack/react-router";
import { CalendarCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { dayKey, useProgress } from "@/lib/progress";
import { RECAP_DISMISSED_KEY, recapFacts, recapHeadline, weeklyRecap } from "@/lib/recap";

const readDismissed = () => {
  try {
    return window.localStorage.getItem(RECAP_DISMISSED_KEY);
  } catch {
    return null;
  }
};

/**
 * A look back at last week, on Mondays. It states what happened and offers a way to
 * put it away for the week; it doesn't ask for anything, compare the learner to
 * anyone, or say what they should do next. A week with nothing in it shows nothing.
 */
export function WeeklyRecapCard({ className = "" }: { className?: string }) {
  const { state, hydrated } = useProgress();
  // undefined until the device has been asked, so the card never flashes in and out.
  const [dismissed, setDismissed] = useState<string | null | undefined>(undefined);
  useEffect(() => setDismissed(readDismissed()), []);

  if (!hydrated || dismissed === undefined) return null;
  const recap = weeklyRecap(state, dayKey());
  if (!recap || dismissed === recap.weekStart) return null;

  const putAway = () => {
    try {
      window.localStorage.setItem(RECAP_DISMISSED_KEY, recap.weekStart);
    } catch {
      /* the card just comes back next time */
    }
    setDismissed(recap.weekStart);
  };
  const facts = recapFacts(recap);

  return (
    <section
      aria-labelledby="recap-heading"
      className={`rounded-2xl border border-border bg-card p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary-text"
        >
          <CalendarCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="recap-heading" className="text-sm font-bold text-foreground">
            Your week
          </h2>
          <p className="mt-0.5 text-sm text-foreground">{recapHeadline(recap)}</p>
          {facts.length > 0 && (
            <ul className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={putAway}
          aria-label="Put this away"
          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
      <Link
        to="/progress"
        className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary-text"
      >
        See your progress
      </Link>
    </section>
  );
}
