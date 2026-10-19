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
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  target: Target,
  gauge: Gauge,
  search: Search,
  flame: Flame,
  shield: Shield,
  sunrise: Sunrise,
  rotate: RotateCcw,
};

/**
 * Tier colors: one metal per theme, each at least 4.5:1 against the card, the page and the
 * medallion's own tint (`BadgeIcon.test.ts`). The classes spell the hex values out so Tailwind
 * generates them.
 */
export const TIER_STYLE: Record<
  BadgeTier,
  { label: string; light: string; dark: string; className: string }
> = {
  bronze: {
    label: "Bronze",
    light: "#7a4a1c",
    dark: "#e3a874",
    className:
      "border-[#7a4a1c] bg-[#7a4a1c]/15 text-[#7a4a1c] dark:border-[#e3a874] dark:bg-[#e3a874]/15 dark:text-[#e3a874]",
  },
  silver: {
    label: "Silver",
    light: "#4f5966",
    dark: "#c9d1db",
    className:
      "border-[#4f5966] bg-[#4f5966]/15 text-[#4f5966] dark:border-[#c9d1db] dark:bg-[#c9d1db]/15 dark:text-[#c9d1db]",
  },
  gold: {
    label: "Gold",
    light: "#715300",
    dark: "#f2cc55",
    className:
      "border-[#715300] bg-[#715300]/15 text-[#715300] dark:border-[#f2cc55] dark:bg-[#f2cc55]/15 dark:text-[#f2cc55]",
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

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-2",
        tier ? TIER_STYLE[tier].className : "border-border bg-muted/70 text-muted-foreground",
      )}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: size * 0.44, height: size * 0.44 }} strokeWidth={2.2} />
    </span>
  );
}
