import { Check, Flame, Share2, Sparkles, X } from "lucide-react";
import { Confetti } from "./Confetti";
import type { Celebration } from "@/lib/progress";

/** Vertical, screenshot-ready milestone card for streaks and topic mastery. */
export function MilestoneCard({
  celebration,
  streak,
  onClose,
}: {
  celebration: Celebration;
  streak: number;
  onClose: () => void;
}) {
  const big = celebration.big ?? false;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-foreground/45 px-5 backdrop-blur-sm">
      <div className="relative w-full max-w-[320px] animate-pop-in">
        {big && <Confetti big />}
        <div className="relative overflow-hidden rounded-[2rem] bg-hero-gradient p-6 text-center text-primary-foreground shadow-float">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20 transition-transform hover:scale-105"
          >
            <X className="h-4 w-4" />
          </button>

          <p className="text-[10px] font-extrabold tracking-[0.18em] uppercase opacity-80">
            Lamppost
          </p>

          <div
            aria-hidden
            className={`mx-auto mt-5 flex h-24 w-24 items-center justify-center rounded-full bg-primary-foreground/20 text-5xl ${
              big ? "animate-float" : "animate-pop-in"
            }`}
          >
            {celebration.emoji}
          </div>

          <h2 className="mt-5 text-2xl leading-tight">{celebration.title}</h2>
          <p className="mt-2 text-sm font-semibold opacity-90">{celebration.detail}</p>

          {celebration.bonusXp !== undefined && (
            <p className="mt-4 inline-flex animate-pop-in items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1.5 text-xs font-extrabold">
              <Sparkles className="h-3.5 w-3.5" /> +{celebration.bonusXp} bonus XP
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-primary-foreground/25 pt-4 text-xs font-extrabold">
            <Flame className="h-4 w-4" /> {streak}-day streak
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              const text = `${celebration.title} — ${celebration.detail}`;
              if (navigator.share) void navigator.share({ title: "Lamppost", text });
              else void navigator.clipboard?.writeText(text);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-card px-4 py-3 text-sm font-extrabold shadow-soft transition-transform hover:-translate-y-0.5"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-card transition-transform hover:-translate-y-0.5"
          >
            <Check className="h-4 w-4" /> Nice
          </button>
        </div>
      </div>
    </div>
  );
}
