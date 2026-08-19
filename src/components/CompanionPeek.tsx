import type { ReactNode } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import type { Companion } from "@/lib/companions";

/**
 * Anchors the companion to the top edge of a card so it always overlaps the
 * border instead of floating loose in whitespace.
 */
export function CompanionPeek({
  companion,
  children,
  size = 72,
  side = "right",
  className,
}: {
  companion: { [K in keyof Companion]?: string | null | undefined } | null | undefined;
  children: ReactNode;
  size?: number;
  side?: "left" | "right" | "center";
  className?: string;
}) {
  const position =
    side === "left" ? "left-5" : side === "center" ? "left-1/2 -translate-x-1/2" : "right-5";

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        aria-hidden
        className={`pointer-events-none absolute z-10 ${position}`}
        style={{ top: -size * 0.44 }}
      >
        <CompanionAvatar companion={companion} size={size} pose="peek" />
      </div>
      {children}
    </div>
  );
}
