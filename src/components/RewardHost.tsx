import { useEffect, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { BadgeIcon, TIER_STYLE } from "./BadgeIcon";
import { Confetti } from "./Confetti";
import { computeBadges, drainNewUnlocks, type BadgeState } from "@/lib/badges";
import { drainLevelUps, unitLevels, type UnitLevel } from "@/lib/levels";
import { playCue } from "@/lib/feedback";
import { useProgress } from "@/lib/progress";
import { unitAccent } from "@/lib/unit-accent";

/**
 * Watches real progress and surfaces the two earned rewards that aren't tied to
 * a single answer: an achievement unlock toast, and a skill level-up card. Both
 * fire once per genuine threshold crossing — never on a hidden roll.
 */
type Item =
  | { sort: "badge"; badge: BadgeState }
  | { sort: "level"; level: UnitLevel };

export function RewardHost() {
  const { state, hydrated } = useProgress();
  const [queue, setQueue] = useState<Item[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    const badges = drainNewUnlocks(computeBadges(state));
    const levels = drainLevelUps(unitLevels());
    if (badges.length === 0 && levels.length === 0) return;
    // Queued in a microtask so a store notification that lands mid-render of
    // another screen never updates this component during that render.
    queueMicrotask(() => {
      setQueue((prev) => [
        ...prev,
        ...badges.map((badge) => ({ sort: "badge" as const, badge })),
        ...levels.map((level) => ({ sort: "level" as const, level })),
      ]);
      playCue("levelup");
    });
  }, [hydrated, state]);

  const current = queue[0];
  const dismiss = () => setQueue((prev) => prev.slice(1));

  // Badge toasts clear themselves; level-up cards wait for a tap.
  useEffect(() => {
    if (!current || current.sort !== "badge") return;
    const timer = window.setTimeout(dismiss, 4200);
    return () => window.clearTimeout(timer);
  }, [current]);

  if (!current) return null;

  if (current.sort === "badge") {
    const { badge } = current;
    const tier = badge.tier ?? "bronze";
    return (
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-4 pt-4"
      >
        <div className="relative w-full max-w-[22rem] overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-float animate-rise-in">
          <Confetti count={20} />
          <div className="relative z-30 flex items-center gap-3">
            <BadgeIcon icon={badge.icon} tier={tier} size={46} />
            <div className="min-w-0">
              <p
                className="text-[11px] font-bold uppercase tracking-wide"
                style={{ color: TIER_STYLE[tier].text }}
              >
                {TIER_STYLE[tier].label} unlocked
              </p>
              <p className="truncate text-sm font-bold text-foreground">{badge.name}</p>
              <p className="truncate text-xs text-muted-foreground">{badge.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { level } = current;
  const accent = unitAccent(level.unitId);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/45 px-6 backdrop-blur-sm">
      <div className="relative w-full max-w-[20rem] animate-pop-in overflow-hidden rounded-3xl border border-border bg-card p-6 text-center shadow-float">
        <Confetti count={26} />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative z-30">
          <span
            aria-hidden
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl"
            style={{ background: accent.wash, border: `2px solid ${accent.border}` }}
          >
            {level.emoji}
          </span>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-wide" style={{ color: accent.color }}>
            Skill level up
          </p>
          <h2 className="mt-1 text-2xl leading-tight">{level.title}</h2>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-bold">
            {level.level.name}
            <ArrowUpRight className="h-3.5 w-3.5" style={{ color: accent.color }} />
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {level.accuracy}% of this unit's drills right across {level.answered} answers.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-5 h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            Keep going
          </button>
        </div>
      </div>
    </div>
  );
}
