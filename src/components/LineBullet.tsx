import { unitAccent } from "@/lib/unit-accent";

const SIZES = {
  sm: "h-4 w-4 text-[10px]",
  md: "h-5 w-5 text-xs",
  lg: "h-7 w-7 text-sm",
  xl: "h-14 w-14 text-3xl",
} as const;

/**
 * A unit's bullet: its line number on its line color, the way a transit map marks a route.
 * Decorative by default, because the unit's name always sits beside it.
 */
export function LineBullet({
  unitId,
  size = "md",
  className = "",
}: {
  unitId: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const accent = unitAccent(unitId);
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center pt-px font-extrabold leading-none ${SIZES[size]} ${className}`}
      style={{ background: accent.color, color: accent.on }}
    >
      {accent.line}
    </span>
  );
}

/** A unit's lessons as stops: filled when done, open when not. */
export function Stops({ done, total = 5 }: { done: number; total?: number }) {
  return (
    <span aria-hidden className="flex shrink-0 gap-[3px]">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full border-[1.5px] border-foreground ${i < done ? "bg-foreground" : ""}`}
        />
      ))}
    </span>
  );
}

/** The app's mark: a lamppost. Used where a mascot would be shouting. */
export function LampMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M9.5 1.5h5v2h-5z" />
      <path d="M7.5 4h9l-2 5h-5z" />
      <path d="M11 9h2v12h-2z" />
      <path d="M7.5 21h9v2h-9z" />
    </svg>
  );
}

/**
 * The guide: the lamp on a small sign, black by day and lit amber at night. It stands where a
 * mascot used to cheer (beside feedback, in the tutor chat, at the end of a lesson). A person's
 * chosen companion still shows where it identifies them: profile, friends, league.
 */
export function GuideMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center bg-primary text-primary-foreground ${className}`}
      style={{ width: size, height: size }}
    >
      <LampMark className="h-[62%] w-[62%]" />
    </span>
  );
}
