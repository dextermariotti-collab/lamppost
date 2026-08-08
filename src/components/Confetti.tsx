import { useMemo } from "react";

const COLORS = [
  "bg-primary",
  "bg-primary-glow",
  "bg-success",
  "bg-flame",
  "bg-gem",
  "bg-xp",
];

/** Lightweight CSS confetti burst. Mount it to fire; unmount to stop. */
export function Confetti({ count = 28, big = false }: { count?: number; big?: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: big ? count * 2 : count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        duration: 0.9 + Math.random() * 0.6,
        drift: (Math.random() - 0.5) * 90,
        rotate: Math.random() * 360,
        color: COLORS[i % COLORS.length]!,
        round: i % 3 === 0,
      })),
    [count, big],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`animate-confetti absolute top-0 h-2 w-1.5 ${p.color} ${
            p.round ? "rounded-full" : "rounded-[2px]"
          }`}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--drift" as string]: `${p.drift}px`,
            ["--spin" as string]: `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
