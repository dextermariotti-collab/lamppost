import { useSyncExternalStore } from "react";

/**
 * Lets a screen ask for reward pop-ups (badges, level-ups) to wait. A lesson does this so a
 * level-up card never lands in the middle of a step; whatever was earned appears when the
 * lesson is over. Holds nest, so two screens holding at once are both respected.
 */
let holders = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function holdRewards(): () => void {
  holders += 1;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders = Math.max(0, holders - 1);
    emit();
  };
}

export const rewardsHeld = () => holders > 0;

export function useRewardsHeld(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    rewardsHeld,
    () => false,
  );
}
