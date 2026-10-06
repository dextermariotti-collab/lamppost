import { Check, Crown, Flame, Share2, X } from "lucide-react";
import { LampMark } from "./LineBullet";
import type { Celebration } from "@/lib/progress";

/** A milestone as a sign: what was reached, plainly, with the option to share it. */
export function MilestoneCard({
  celebration,
  streak,
  onClose,
}: {
  celebration: Celebration;
  streak: number;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-foreground/45 px-5">
      <div className="relative w-full max-w-[320px] animate-rise-in">
        <div className="sign relative p-6 text-center">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-2 flex h-11 w-11 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <p className="legend flex items-center justify-center gap-1.5 text-muted-foreground">
            <LampMark className="h-4 w-4" /> Lamppost
          </p>

          <div
            aria-hidden
            className="mx-auto mt-5 flex h-20 w-20 items-center justify-center bg-primary text-primary-foreground"
          >
            {celebration.kind === "streak" ? (
              <Flame className="h-10 w-10" strokeWidth={2} />
            ) : celebration.kind === "mastery" ? (
              <Crown className="h-10 w-10" strokeWidth={2} />
            ) : (
              <Check className="h-10 w-10" strokeWidth={2.4} />
            )}
          </div>

          <h2 className="mt-5 text-2xl leading-tight">{celebration.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{celebration.detail}</p>

          {celebration.bonusXp !== undefined && (
            <p className="mt-4 font-mono text-sm font-bold text-foreground">
              +{celebration.bonusXp} bonus XP
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 border-t-2 border-edge pt-4 font-mono text-xs font-bold">
            <Flame aria-hidden className="h-4 w-4 text-flame" /> {streak}-day streak
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              const text = `${celebration.title} — ${celebration.detail}`;
              if (navigator.share) void navigator.share({ title: "Lamppost", text });
              else void navigator.clipboard?.writeText(text);
            }}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-sm bg-card px-4 text-sm font-bold shadow-card"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
          <button
            onClick={onClose}
            className="flex min-h-12 items-center justify-center gap-2 rounded-sm bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            <Check className="h-4 w-4" /> Done
          </button>
        </div>
      </div>
    </div>
  );
}
