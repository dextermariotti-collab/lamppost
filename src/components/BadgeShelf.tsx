import { BadgeIcon } from "@/components/BadgeIcon";
import type { BadgeState } from "@/lib/badges";

/**
 * All achievements, earned or not, with the real requirement and honest
 * progress toward the next tier. Nothing here is hidden or random.
 */
export function BadgeShelf({ badges }: { badges: BadgeState[] }) {
  return (
    <ul className="mt-3 space-y-2.5">
      {badges.map((badge) => (
        <li
          key={badge.code}
          className={`flex items-center gap-3 rounded-2xl border border-border p-3 ${
            badge.tier ? "bg-card" : "bg-muted/40"
          }`}
        >
          <BadgeIcon icon={badge.icon} tier={badge.tier} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-bold text-foreground">{badge.name}</p>
              <p className="shrink-0 text-[11px] font-bold capitalize text-muted-foreground">
                {badge.tier ?? "locked"}
              </p>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {badge.description}
            </p>
            <div
              className="mt-2 h-1.5 overflow-hidden bg-muted"
              role="progressbar"
              aria-valuenow={badge.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${badge.name} progress`}
            >
              <span
                className="block h-full bg-primary transition-[width] duration-700"
                style={{ width: `${badge.pct}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {badge.nextAt === null
                ? `${badge.value} ${badge.unit} · gold earned`
                : `${badge.value} / ${badge.nextAt} ${badge.unit}`}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
