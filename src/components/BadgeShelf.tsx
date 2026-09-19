import { BadgeIcon, TIER_STYLE } from "./BadgeIcon";
import type { BadgeState } from "@/lib/badges";

/**
 * Named, tiered achievements with an honest progress bar: the exact count and
 * the exact next threshold are always on screen.
 */
export function BadgeShelf({ badges }: { badges: BadgeState[] | null }) {
  if (!badges) {
    return (
      <ul className="mt-3 space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
        ))}
      </ul>
    );
  }

  const earned = badges.filter((b) => b.tier !== null).length;

  return (
    <div>
      <p className="mt-1 text-xs text-muted-foreground">
        {earned} of {badges.length} started · every tier shows exactly what earns it.
      </p>
      <ul className="mt-3 space-y-3">
        {badges.map((badge, i) => (
          <li
            key={badge.code}
            className="flex animate-rise-in items-center gap-3"
            style={{ animationDelay: `${i * 45}ms` }}
          >
            <BadgeIcon icon={badge.icon} tier={badge.tier} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-bold text-foreground">{badge.name}</p>
                <p
                  className="shrink-0 text-[11px] font-bold"
                  style={badge.tier ? { color: TIER_STYLE[badge.tier].text } : undefined}
                >
                  {badge.tier ? TIER_STYLE[badge.tier].label : "Locked"}
                </p>
              </div>
              <p className="truncate text-xs text-muted-foreground">{badge.description}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${badge.pct}%`,
                    background: badge.tier ? TIER_STYLE[badge.tier].ring : "var(--primary)",
                    transition: "width 1s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {badge.nextAt === null
                  ? `${badge.value} ${badge.unit} · gold, the top tier`
                  : `${badge.value} of ${badge.nextAt} ${badge.unit}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
