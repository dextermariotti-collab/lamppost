import { useEffect, useRef, useState } from "react";

/** Eased count-up for numbers. Re-runs whenever `value` changes. */
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
  const [display, setDisplay] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    const delta = value - origin;
    if (delta === 0) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(origin + delta * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}
