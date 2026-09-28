import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Eased count-up for numbers.
 *
 * The number on screen is always the real `value`; the animation is only a
 * transient effect layered on top of a *change*. It never starts from a
 * placeholder (the first paint is the real value), it is skipped when the
 * learner prefers reduced motion or the tab is hidden, and a timer guarantees
 * it ends on the real value even if animation frames never run. A count-up
 * that depends on `requestAnimationFrame` alone can leave "0" on screen forever.
 */
export function CountUp({
  value,
  duration = 1100,
  format = (n: number) => n.toLocaleString(),
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  /** Set only while an animation is in flight. */
  const [tween, setTween] = useState<number | null>(null);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (
      from === value ||
      prefersReducedMotion() ||
      (typeof document !== "undefined" && document.visibilityState === "hidden")
    ) {
      setTween(null);
      return;
    }

    const delta = value - from;
    const start = performance.now();
    let frame = 0;
    setTween(from);
    const tick = (now: number) => {
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      if (t < 1) {
        setTween(Math.round(from + delta * eased));
        frame = requestAnimationFrame(tick);
      } else {
        setTween(null);
      }
    };
    frame = requestAnimationFrame(tick);
    // Frames can be paused (offscreen iframe, background tab); never stay mid-count.
    const settle = window.setTimeout(() => setTween(null), duration + 100);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      setTween(null);
    };
  }, [value, duration]);

  return <span className={className}>{format(tween ?? value)}</span>;
}
