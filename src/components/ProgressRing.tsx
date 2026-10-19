import { CountUp } from "./CountUp";

/** A filling ring that eases toward `pct`. */
export function ProgressRing({
  pct,
  size = 132,
  stroke = 12,
  label,
  sublabel,
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={c}
          strokeDashoffset={c - (c * clamped) / 100}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? (
          <>
            <CountUp
              value={Math.round(clamped)}
              className="text-3xl font-extrabold"
              format={(n) => `${n}%`}
            />
            {label && <span className="text-[11px] font-bold text-muted-foreground">{label}</span>}
            {sublabel && <span className="text-[10px] text-muted-foreground">{sublabel}</span>}
          </>
        )}
      </div>
    </div>
  );
}
