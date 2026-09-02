import { Check, Sparkles } from "lucide-react";

export function SuccessBurst({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`success-burst pointer-events-none absolute z-20 ${
        compact ? "inset-y-0 right-4 w-16" : "inset-0"
      }`}
    >
      <span className="success-burst-ring absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-2 border-primary" />
      <span className="success-burst-core absolute left-1/2 top-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float">
        <Check className="h-5 w-5" strokeWidth={3} />
      </span>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Sparkles
          key={i}
          className="success-spark absolute left-1/2 top-1/2 h-4 w-4 text-primary"
          style={{ "--spark-angle": `${i * 60}deg` } as React.CSSProperties}
        />
      ))}
    </span>
  );
}