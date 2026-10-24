import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronRight,
  Flame,
  LogIn,
  LogOut,
  Repeat,
  Settings,
  Sparkles,
  UserPlus,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { BadgeIcon, TIER_STYLE } from "@/components/BadgeIcon";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { displayNameFor, useAccount, useFriends } from "@/lib/account";
import { earnedFirst, useBadges, type BadgeState } from "@/lib/badges";
import { useCompanion } from "@/lib/companion-store";
import { companionName } from "@/lib/companions";
import { monthYear } from "@/lib/days";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Lamppost" },
      {
        name: "description",
        content:
          "Your Lamppost profile: streak, XP, lessons, achievements, friends and shared streaks.",
      },
      { property: "og:title", content: "Your profile — Lamppost" },
      {
        property: "og:description",
        content: "Track your streak, earn achievements and keep a friend's streak alive.",
      },
      { property: "og:type", content: "profile" },
    ],
    links: [{ rel: "canonical", href: "/profile" }],
  }),
  component: ProfileScreen,
});

function ProfileScreen() {
  const { state, streak, doneLessons } = useProgress();
  const { companion, signedIn } = useCompanion();
  const { data: account, isError: accountFailed, refetch: refetchAccount } = useAccount();
  const { data: friends, isError: friendsFailed, refetch: refetchFriends } = useFriends();
  const navigate = useNavigate();
  const [openBadge, setOpenBadge] = useState<BadgeState | null>(null);
  // The same achievements, counted the same way, as Progress and the unlock toasts.
  const badges = useBadges(state);
  const earned = badges?.filter((badge) => badge.tier).length ?? 0;
  // What has been earned leads the shelf, newest first, so it is never scrolled out of view.
  const shelf = useMemo(() => (badges ? earnedFirst(badges) : null), [badges]);

  const name = displayNameFor(account ?? null);
  const friendCount = friends?.friends.length ?? 0;
  const accountProblem = signedIn && ((accountFailed && !account) || (friendsFailed && !friends));

  return (
    <PhoneFrame>
      <div className="px-5 pb-10">
        <h1 className="sr-only">Profile</h1>
        {/* Identity */}
        <header className="flex items-center gap-3 pt-5">
          <Link
            to="/companion"
            aria-label="Change companion"
            className="flex flex-1 items-center gap-3 text-left"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              <CompanionAvatar companion={companion} size={56} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold">{name}</span>
              {account?.joinedAt ? (
                <span className="block truncate text-[13px] text-muted-foreground">
                  Joined {monthYear(account.joinedAt)}
                </span>
              ) : null}
            </span>
          </Link>
          <Link
            to="/settings"
            aria-label="Account settings"
            className="flex h-11 w-11 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </header>

        {accountProblem && (
          <div className="mt-4 flex items-center gap-3 border-y border-border py-2">
            <p role="alert" className="flex-1 text-[13px] text-muted-foreground">
              Your account details couldn&apos;t load just now.
            </p>
            <button
              type="button"
              onClick={() => {
                void refetchAccount();
                void refetchFriends();
              }}
              className="min-h-11 px-2 text-xs font-bold text-foreground underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Stats — quiet, unboxed, one hairline band */}
        <div className="mt-5 grid grid-cols-3 divide-x divide-border border-y border-border py-4">
          <Stat
            icon={<Flame className="h-4 w-4 text-primary-text" strokeWidth={2.2} />}
            value={String(streak)}
            label="Day streak"
          />
          <Stat
            icon={<Zap className="h-4 w-4 text-primary-text" strokeWidth={2.2} />}
            value={state.xp.toLocaleString()}
            label="Total XP"
          />
          <Stat
            icon={<BookOpen className="h-4 w-4 text-primary-text" strokeWidth={2.2} />}
            value={String(doneLessons.size)}
            label="Lessons"
          />
        </div>

        {/* Achievements */}
        <section className="mt-6">
          <h2 className="text-sm font-bold">Achievements</h2>
          {badges && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              {earned === 0
                ? "None earned yet. Each one shows exactly what it asks for."
                : `${earned} of ${badges.length} earned.`}
            </p>
          )}
          <div className="-mx-5 mt-3 flex gap-4 overflow-x-auto px-5 pb-1">
            {shelf?.map((badge) => (
              <button
                key={badge.code}
                type="button"
                onClick={() => setOpenBadge(badge)}
                className="flex w-[68px] shrink-0 flex-col items-center gap-1.5"
              >
                <BadgeIcon icon={badge.icon} tier={badge.tier} size={44} />
                <span
                  className={cn(
                    "text-center text-[11px] leading-tight",
                    badge.tier ? "font-bold" : "text-muted-foreground",
                  )}
                >
                  {badge.name}
                  <span className="sr-only">
                    , {badge.tier ? TIER_STYLE[badge.tier].label : "not earned yet"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Friends */}
        <Link
          to="/friends"
          className="mt-6 flex min-h-14 items-center gap-3 border-t border-border py-3"
        >
          <UserPlus className="h-5 w-5 text-primary-text" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Add friends</span>
            <span className="block truncate text-xs text-muted-foreground">
              Keep each other&apos;s streak alive
            </span>
          </span>
          {friendCount > 0 ? (
            <span className="flex items-center gap-2">
              <span className="flex">
                {friends!.friends.slice(0, 3).map((friend, i) => (
                  <span
                    key={friend.id}
                    className="-ml-2 flex h-7 w-7 items-center justify-center overflow-hidden rounded-sm border-2 border-background bg-muted first:ml-0"
                    style={{ zIndex: 3 - i }}
                  >
                    <CompanionAvatar companion={friend.companion} size={26} />
                  </span>
                ))}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {friendCount} {friendCount === 1 ? "friend" : "friends"}
              </span>
            </span>
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </Link>

        {/* Settings list */}
        <ul className="mt-2">
          <SettingsRow
            to="/companion"
            icon={<Repeat className="h-5 w-5 text-muted-foreground" />}
            label="Change companion"
            value={companionName(companion)}
          />
          <SettingsRow
            to="/settings"
            icon={<Settings className="h-5 w-5 text-muted-foreground" />}
            label="Settings"
            value={`Goal: ${state.dailyGoal} lesson${state.dailyGoal === 1 ? "" : "s"} a day`}
          />
        </ul>

        {signedIn ? (
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
            className="mt-8 flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        ) : (
          <Link
            to="/auth"
            className="mt-8 flex items-center gap-2 text-xs font-bold text-primary-text"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign in to save your progress
            <Sparkles className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <Sheet open={openBadge !== null} onOpenChange={(open) => !open && setOpenBadge(null)}>
        <SheetContent side="bottom" className="border-border">
          {openBadge ? <BadgeDetail badge={openBadge} /> : null}
        </SheetContent>
      </Sheet>
    </PhoneFrame>
  );
}

function BadgeDetail({ badge }: { badge: BadgeState }) {
  const tier = badge.tier ? TIER_STYLE[badge.tier].label : null;
  const share = async () => {
    const text = `I earned ${tier} in "${badge.name}" on Lamppost.`;
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ text }).catch(() => undefined);
    } else if (typeof navigator !== "undefined") {
      await navigator.clipboard?.writeText(text).catch(() => undefined);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 pb-2 text-center">
      <BadgeIcon icon={badge.icon} tier={badge.tier} size={64} />
      <SheetHeader className="space-y-1">
        <SheetTitle className="text-center text-lg">{badge.name}</SheetTitle>
      </SheetHeader>
      <p className="legend text-muted-foreground">{tier ?? "Not earned yet"}</p>
      <p className="text-sm text-muted-foreground">{badge.description}</p>
      <p className="font-mono text-xs text-muted-foreground">
        {badge.nextAt === null
          ? `${badge.value} ${badge.unit} · gold earned`
          : `${badge.value} / ${badge.nextAt} ${badge.unit}`}
      </p>
      {tier && (
        <Button type="button" onClick={share} className="mt-1 h-11 rounded-sm px-5 font-bold">
          Share
        </Button>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2">
      {icon}
      <span className="text-[19px] leading-none font-bold text-foreground">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function SettingsRow({
  to,
  icon,
  label,
  value,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <li className="border-b border-border last:border-0">
      <Link to={to} className="flex items-center gap-3 py-4">
        {icon}
        <span className="flex-1 text-sm font-bold">{label}</span>
        {value ? <span className="text-xs text-muted-foreground">{value}</span> : null}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </li>
  );
}
