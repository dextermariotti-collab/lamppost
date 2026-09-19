import { CompanionAvatar, type CompanionPose } from "./CompanionAvatar";
import { streakTier } from "./StreakCalendar";
import type { Companion } from "@/lib/companions";

/**
 * The companion with a streak aura. One visible ring per milestone reached
 * (3, 7, 30, 100 days) — earned, never decorative.
 */
export function CompanionAura({
  companion,
  streak,
  size = 44,
  pose,
  animate,
}: {
  companion: { [K in keyof Companion]?: string | null | undefined } | null | undefined;
  streak: number;
  size?: number;
  pose?: CompanionPose;
  animate?: boolean;
}) {
  const tier = streakTier(streak);

  return (
    <span className="relative inline-flex items-center justify-center">
      {tier > 0 && (
        <span
          aria-hidden
          className={tier >= 3 ? "absolute rounded-full animate-glow-pulse" : "absolute rounded-full"}
          style={{
            width: size * (1.12 + tier * 0.07),
            height: size * (1.12 + tier * 0.07),
            background: `radial-gradient(circle, color-mix(in oklab, var(--flame) ${
              10 + tier * 9
            }%, transparent) 40%, transparent 72%)`,
            border: `1.5px solid color-mix(in oklab, var(--flame) ${18 + tier * 14}%, transparent)`,
          }}
        />
      )}
      <CompanionAvatar
        companion={companion}
        size={size}
        {...(pose ? { pose } : {})}
        {...(animate ? { animate } : {})}
      />
    </span>
  );
}
