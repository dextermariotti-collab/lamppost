import { useEffect, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { BadgeIcon, TIER_STYLE } from "./BadgeIcon";
import { LineBullet } from "./LineBullet";
import { computeBadges, drainNewUnlocks, type BadgeState } from "@/lib/badges";
import { drainLevelUps, unitLevels, type UnitLevel } from "@/lib/levels";
import { playCue } from "@/lib/feedback";
import { useProgress } from "@/lib/progress";
import { useRewardsHeld } from "@/lib/reward-hold";

/**
 * Watches real progress and surfaces the two earned rewards that aren't tied to
 * a single answer: an achievement unlock toast, and a skill level-up card. Both
 * fire once per genuine threshold crossing — never on a hidden roll.
 */
type Item = { sort: "badge"; badge: BadgeState } | { sort: "level"; level: UnitLevel };

export function RewardHost() {
  const { state, hydrated } = useProgress();
  const held = useRewardsHeld();
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
    });
  }, [hydrated, state]);

  const current = queue[0];
  const dismiss = () => setQueue((prev) => prev.slice(1));
  // A lesson in progress holds pop-ups back; they show, and sound, once it is over.
  const shown = held ? undefined : current;

  useEffect(() => {
    if (shown) playCue("levelup");
  }, [shown]);

  // Badge toasts clear themselves; level-up cards wait for a tap.
  useEffect(() => {
    if (!shown || shown.sort !== "badge") return;
    const timer = window.setTimeout(dismiss, 4200);
    return () => window.clearTimeout(timer);
  }, [shown]);

  if (!shown) return null;

  if (shown.sort === "badge") {
    const { badge } = shown;
    const tier = badge.tier ?? "bronze";
    return (
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-4 pt-4"
      >
        <div className="sign relative w-full max-w-[22rem] overflow-hidden p-4 animate-rise-in">
          <div className="relative z-30 flex items-center gap-3">
            <BadgeIcon icon={badge.icon} tier={tier} size={46} />
            <div className="min-w-0">
              <p className="legend text-muted-foreground">{TIER_STYLE[tier].label} unlocked</p>
              <p className="truncate text-sm font-bold text-foreground">{badge.name}</p>
              <p className="truncate text-xs text-muted-foreground">{badge.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { level } = shown;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/45 px-6">
      <div className="sign relative w-full max-w-[20rem] animate-pop-in p-6 text-left">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-2 top-2 z-40 flex h-11 w-11 items-center justify-center text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative z-30">
          <LineBullet unitId={level.unitId} size="lg" />
          <p className="legend mt-4 text-muted-foreground">Skill level up</p>
          <h2 className="mt-1 text-2xl leading-tight">{level.title}</h2>
          <p className="mt-3 inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 text-sm font-bold">
            {level.level.name}
            <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {level.accuracy}% of this unit's drills right across {level.answered} answers.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-5 h-11 w-full rounded-sm bg-primary text-sm font-semibold text-primary-foreground"
          >
            Keep going
          </button>
        </div>
      </div>
    </div>
  );
}
