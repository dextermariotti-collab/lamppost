import { useSyncExternalStore } from "react";
import { dayKey } from "./days";

/**
 * Today's local day key as a store. A screen that shows "today" (the daily goal, the streak,
 * what is due) re-renders at local midnight and when the app comes back to the foreground,
 * instead of keeping the day it was opened on.
 */

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function notify() {
  listeners.forEach((fn) => fn());
}

function msToMidnight(now = new Date()) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}

function schedule() {
  clearTimeout(timer);
  // A second past midnight, so the new day has begun however the timer rounds.
  timer = setTimeout(() => {
    notify();
    schedule();
  }, msToMidnight() + 1000);
}

// A timer can be held back while the device sleeps; coming back is the moment to catch up.
function onVisibility() {
  if (document.visibilityState === "hidden") return;
  notify();
  schedule();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  if (listeners.size === 1) {
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
  }
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) {
      clearTimeout(timer);
      timer = undefined;
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

const today = () => dayKey();

export function useToday(): string {
  return useSyncExternalStore(subscribe, today, today);
}
