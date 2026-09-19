import { useEffect, useState } from "react";

/**
 * Progress bar. By default the fill eases in from 0 on mount and on change; set
 * `animate={false}` where a percentage label sits beside it, so the number and
 * the fill never disagree while the animation runs.
 */
export function AnimatedBar({
  pct,
  className = "",
  animate = true,
}: {
  pct: number;
  className?: string;
  animate?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const [width, setWidth] = useState(animate ? 0 : clamped);

  useEffect(() => {
    if (!animate) {
      setWidth(clamped);
      return;
    }
    const id = requestAnimationFrame(() => setWidth(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped, animate]);

  return (
    <div className={`h-2 overflow-hidden rounded-full bg-muted ${className}`}>
      <div
        className="h-full rounded-full bg-hero-gradient"
        style={{
          width: `${width}%`,
          transition: animate
            ? "width 1.1s cubic-bezier(0.22, 1, 0.36, 1)"
            : "width 300ms ease-out",
        }}
      />
    </div>
  );
}
