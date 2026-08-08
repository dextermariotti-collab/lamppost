import { useEffect, useState } from "react";

/** Progress bar whose fill eases in from 0 on mount and on every change. */
export function AnimatedBar({ pct, className = "" }: { pct: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  return (
    <div className={`h-2 overflow-hidden rounded-full bg-muted ${className}`}>
      <div
        className="h-full rounded-full bg-hero-gradient"
        style={{
          width: `${width}%`,
          transition: "width 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}
