import {
  Flame,
  Gauge,
  RotateCcw,
  Search,
  Shield,
  Sunrise,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { BadgeTier } from "@/lib/badges";

const ICONS: Record<string, LucideIcon> = {
  target: Target,
  gauge: Gauge,
  search: Search,
  flame: Flame,
  shield: Shield,
  sunrise: Sunrise,
  rotate: RotateCcw,
};

/** Tier colors: metal tones, readable in both themes. */
export const TIER_STYLE: Record<
  BadgeTier,
  { ring: string; fill: string; text: string; label: string }
> = {
  bronze: {
    ring: "oklch(0.62 0.1 55)",
    fill: "oklch(0.62 0.1 55 / 0.16)",
    text: "oklch(0.68 0.1 55)",
    label: "Bronze",
  },
  silver: {
    ring: "oklch(0.74 0.02 250)",
    fill: "oklch(0.74 0.02 250 / 0.18)",
    text: "oklch(0.78 0.02 250)",
    label: "Silver",
  },
  gold: {
    ring: "oklch(0.78 0.14 85)",
    fill: "oklch(0.78 0.14 85 / 0.2)",
    text: "oklch(0.8 0.14 85)",
    label: "Gold",
  },
};

/** A badge medallion: earned badges take their tier's metal, locked ones stay gray. */
export function BadgeIcon({
  icon,
  tier,
  size = 52,
}: {
  icon: string;
  tier: BadgeTier | null;
  size?: number;
}) {
  const Icon = ICONS[icon] ?? Trophy;
  const style = tier ? TIER_STYLE[tier] : null;

  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: style ? style.fill : "color-mix(in oklab, var(--muted) 70%, transparent)",
        border: `2px solid ${style ? style.ring : "var(--border)"}`,
      }}
    >
      <Icon
        style={{ width: size * 0.44, height: size * 0.44, color: style ? style.text : undefined }}
        className={style ? "" : "text-muted-foreground"}
        strokeWidth={2.2}
      />
    </span>
  );
}
