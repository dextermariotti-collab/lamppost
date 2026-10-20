import { Snowflake } from "lucide-react";
import { GuideMark } from "@/components/LineBullet";
import type { Companion } from "@/lib/companions";

/**
 * The "streak saved" moment. Shown once, right after a held freeze covered a
 * missed day — plain about what happened and what it cost.
 */
export function StreakSavedCard({
  days,
  streak,
  freezesLeft,
  companion,
  onClose,
}: {
  days: number;
  streak: number;
  freezesLeft: number;
  companion: { [K in keyof Companion]?: string | null | undefined } | null | undefined;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-overlay px-6">
      <div className="sign w-full max-w-[20rem] animate-pop-in p-6 text-center">
        <span
          aria-hidden
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gem/15"
        >
          <Snowflake className="h-9 w-9 text-gem" strokeWidth={2} />
        </span>
        <p className="legend mt-4 text-gem">Streak saved</p>
        <h2 className="mt-1 text-2xl leading-tight">Your {streak}-day streak held</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          A streak freeze covered {days === 1 ? "the day" : `${days} days`} you missed. You have{" "}
          {freezesLeft} {freezesLeft === 1 ? "freeze" : "freezes"} left.
        </p>
        <div className="mt-4 flex justify-center">
          <GuideMark size={72} />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-11 w-full rounded-sm bg-primary text-sm font-semibold text-primary-foreground"
        >
          Back to it
        </button>
      </div>
    </div>
  );
}
