import { Flame, Sparkles, Star, Trophy, UserPlus, Zap, type LucideIcon } from "lucide-react";

/** Icon lookup for the achievement catalog stored in the database. */
const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  flame: Flame,
  zap: Zap,
  star: Star,
  "user-plus": UserPlus,
  trophy: Trophy,
};

export function achievementIcon(icon: string): LucideIcon {
  return ICONS[icon] ?? Trophy;
}

export type Badge = {
  code: string;
  name: string;
  description: string;
  icon: string;
  criteria: string;
  unlockedAt: string | null;
};
