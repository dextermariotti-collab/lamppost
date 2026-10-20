import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, X } from "lucide-react";
import { placeOverContent } from "./AnswerFeedback";
import { BadgeIcon } from "./BadgeIcon";
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
  // A lesson, review, case or check in progress holds pop-ups back; they show, and sound, once
  // it is over.
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
    const place = placeOverContent();
    return (
      <div
        role="status"
        style={place ? { top: place.top, left: place.left, width: place.width } : undefined}
        className={`pointer-events-none fixed z-[70] flex justify-center px-4 ${
          place ? "pt-3" : "inset-x-0 top-0 pt-[calc(var(--inset-top)+1rem)]"
        }`}
      >
        <div className="sign relative w-full max-w-[22rem] overflow-hidden p-4 animate-rise-in">
          <div className="relative z-30 flex items-center gap-3">
            <BadgeIcon icon={badge.icon} tier={badge.tier ?? "bronze"} size={46} />
            <div className="min-w-0">
              <p className="legend text-muted-foreground">Badge earned</p>
              <p className="truncate text-sm font-bold text-foreground">{badge.name}</p>
              <p className="truncate text-xs text-muted-foreground">{badge.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <LevelUpCard level={shown.level} onClose={dismiss} />;
}

/** A modal card: focus moves to "Keep going", Escape or either button closes it, and focus
 *  goes back to wherever it was. */
function LevelUpCard({ level, onClose }: { level: UnitLevel; onClose: () => void }) {
  const keepGoing = useRef<HTMLButtonElement>(null);
  // Read during render, before the dialog moves focus inside itself.
  const [before] = useState(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null),
  );
  useEffect(() => () => before?.focus?.(), [before]);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-overlay" />
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center px-6">
          <Dialog.Content
            aria-modal="true"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              keepGoing.current?.focus();
            }}
            onCloseAutoFocus={(event) => event.preventDefault()}
            className="sign pointer-events-auto relative w-full max-w-[20rem] animate-pop-in p-6 text-left outline-none"
          >
            <Dialog.Close
              aria-label="Close"
              className="absolute right-2 top-2 z-40 flex h-11 w-11 items-center justify-center text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X aria-hidden className="h-4 w-4" />
            </Dialog.Close>
            <div className="relative z-30">
              <LineBullet unitId={level.unitId} size="lg" />
              <p className="legend mt-4 text-muted-foreground">Skill level up</p>
              <Dialog.Title className="mt-1 text-2xl leading-tight">{level.title}</Dialog.Title>
              <p className="mt-3 inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 text-sm font-bold">
                {level.level.name}
                <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
              </p>
              <Dialog.Description className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {level.accuracy}% of this unit's drills right across {level.answered} answers.
              </Dialog.Description>
              <Dialog.Close
                ref={keepGoing}
                className="mt-5 h-11 w-full rounded-sm bg-primary text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Keep going
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
