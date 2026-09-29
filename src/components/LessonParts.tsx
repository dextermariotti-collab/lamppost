import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * What the lesson screen shows for the pieces of a lesson that are still being
 * written (see lib/lesson-parts.ts). The idea card is on screen first; these fill
 * the gaps until each drill and the written task arrive, and say plainly when one
 * is slow or limited instead of leaving the learner looking at a blank.
 */

/** A drill or the written task that hasn't arrived yet. */
export function PendingPart({
  what,
  failed,
  notice,
  onRetry,
}: {
  /** "this drill", "your writing task" */
  what: string;
  failed: boolean;
  notice: string | null;
  onRetry: () => void;
}) {
  if (failed) {
    return (
      <div role="alert" className="mt-5 rounded-3xl bg-card p-5 shadow-soft">
        <p className="text-sm font-semibold text-foreground">
          {notice ?? "This is taking longer than usual."} Your progress so far is kept.
        </p>
        <Button type="button" onClick={onRetry} className="mt-4 h-11 w-full rounded-full">
          Try again
        </Button>
      </div>
    );
  }
  return (
    <div className="mt-5 space-y-4" aria-busy="true">
      <p
        role="status"
        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"
      >
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        Writing {what}…
      </p>
      <div className="h-20 animate-pulse rounded-3xl bg-muted" />
      <div className="h-44 animate-pulse rounded-3xl bg-muted" />
    </div>
  );
}

/** Under the idea card: how far the drills are, or why they are late. */
export function PartsStatus({
  ready,
  total,
  complete,
  problem,
  onRetry,
}: {
  ready: number;
  total: number;
  complete: boolean;
  /** Set when something is slow or limited; the message the learner should read. */
  problem: string | null;
  onRetry: () => void;
}) {
  if (complete || (ready === total && !problem)) return null;
  if (problem) {
    return (
      <div role="status" className="mt-3 rounded-2xl bg-muted/60 px-4 py-3">
        <p className="text-[13px] font-semibold leading-snug text-foreground">{problem}</p>
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          className="mt-3 h-11 w-full rounded-full"
        >
          Try again
        </Button>
      </div>
    );
  }
  return (
    <p role="status" className="mt-3 text-[13px] font-semibold text-muted-foreground">
      Getting your drills ready — {ready} of {total}
    </p>
  );
}
