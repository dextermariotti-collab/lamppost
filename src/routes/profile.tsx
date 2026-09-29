import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  Flame,
  Gift,
  Lock,
  LogIn,
  LogOut,
  Pencil,
  Repeat,
  Settings,
  Sparkles,
  Target,
  Trophy,
  UserPlus,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { achievementIcon, type Badge } from "@/lib/achievements";
import { displayNameFor, useAccount, useAchievements, useFriends } from "@/lib/account";
import { useCompanion } from "@/lib/companion-store";
import { companionName } from "@/lib/companions";
import { monthYear } from "@/lib/days";
import { leagueFor, useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Lamppost" },
      {
        name: "description",
        content:
          "Your Lamppost profile: streak, XP, league, achievements, friends and shared streaks.",
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
  const { state, streak } = useProgress();
  const { companion, signedIn } = useCompanion();
  const { data: account } = useAccount();
  const { data: achievements } = useAchievements();
  const { data: friends } = useFriends();
  const navigate = useNavigate();
  const [openBadge, setOpenBadge] = useState<Badge | null>(null);

  const name = displayNameFor(account ?? null);
  const league = leagueFor(state.xp);
  const friendCount = friends?.friends.length ?? 0;
  const badges: Badge[] = achievements?.badges ?? [];

  return (
    <PhoneFrame>
      <div className="px-5 pb-10">
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
              <span className="block truncate text-[13px] text-muted-foreground">
                Learning with {companionName(companion)}
                {account?.joinedAt ? ` · Joined ${monthYear(account.joinedAt)}` : ""}
              </span>
            </span>
          </Link>
          <Link
            to="/settings"
            aria-label="Account settings"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </header>

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
            icon={<Trophy className="h-4 w-4 text-primary-text" strokeWidth={2.2} />}
            value={league.name}
            label="League"
          />
        </div>

        {/* Achievements */}
        <section className="mt-6">
          <h2 className="text-sm font-bold">Achievements</h2>
          <div className="-mx-5 mt-3 flex gap-4 overflow-x-auto px-5 pb-1">
            {badges.length === 0
              ? Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
                    <span className="h-11 w-11 animate-pulse rounded-full bg-muted" />
                    <span className="h-2.5 w-12 animate-pulse rounded bg-muted" />
                  </div>
                ))
              : badges.map((badge) => {
                  const Icon = achievementIcon(badge.icon);
                  const unlocked = Boolean(badge.unlockedAt);
                  return (
                    <button
                      key={badge.code}
                      onClick={() => setOpenBadge(badge)}
                      className="flex w-[68px] shrink-0 flex-col items-center gap-1.5"
                    >
                      <span
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-full transition-transform hover:scale-105",
                          unlocked
                            ? "bg-hero-gradient text-primary-foreground shadow-card"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                      </span>
                      <span
                        className={cn(
                          "text-center text-[11px] leading-tight",
                          unlocked ? "font-bold" : "text-muted-foreground",
                        )}
                      >
                        {badge.name}
                      </span>
                    </button>
                  );
                })}
          </div>
        </section>

        {/* Friends */}
        <Link to="/friends" className="mt-6 flex items-center gap-3 border-t border-border pt-4">
          <UserPlus className="h-5 w-5 text-primary-text" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Add friends</span>
            <span className="block truncate text-xs text-muted-foreground">
              Learn together and keep each other&apos;s streak alive
            </span>
          </span>
          {friendCount > 0 ? (
            <span className="flex items-center gap-2">
              <span className="flex">
                {friends!.friends.slice(0, 3).map((friend, i) => (
                  <span
                    key={friend.id}
                    className="-ml-2 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted first:ml-0"
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

        <Link
          to="/rewards"
          className="flex min-h-14 items-center gap-3 border-t border-border py-3"
        >
          <Gift className="h-5 w-5 text-primary-text" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Rewards</span>
            <span className="block truncate text-xs text-muted-foreground">
              Chests, streak freezes, hint tokens and cosmetics
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        {/* Settings list */}
        <ul className="mt-2">
          <SettingsRow
            to="/settings"
            icon={<Target className="h-5 w-5 text-muted-foreground" />}
            label="Daily goal"
            value={`${state.dailyGoal} lesson${state.dailyGoal === 1 ? "" : "s"}`}
          />
          <SettingsRow
            to="/companion"
            icon={<Repeat className="h-5 w-5 text-muted-foreground" />}
            label="Change companion"
            value={companionName(companion)}
          />
          <SettingsRow
            to="/settings"
            icon={<Bell className="h-5 w-5 text-muted-foreground" />}
            label="Notifications"
          />
          <SettingsRow
            to="/settings"
            icon={<Pencil className="h-5 w-5 text-muted-foreground" />}
            label="Edit profile"
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
        <SheetContent side="bottom" className="rounded-t-3xl border-border">
          {openBadge ? <BadgeDetail badge={openBadge} /> : null}
        </SheetContent>
      </Sheet>
    </PhoneFrame>
  );
}

function BadgeDetail({ badge }: { badge: Badge }) {
  const Icon = achievementIcon(badge.icon);
  const unlocked = Boolean(badge.unlockedAt);
  const share = async () => {
    const text = `I unlocked "${badge.name}" on Lamppost.`;
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ text }).catch(() => undefined);
    } else if (typeof navigator !== "undefined") {
      await navigator.clipboard?.writeText(text).catch(() => undefined);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 pb-2 text-center">
      <span
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full",
          unlocked
            ? "bg-hero-gradient text-primary-foreground shadow-card"
            : "bg-muted text-muted-foreground",
        )}
      >
        {unlocked ? <Icon className="h-7 w-7" /> : <Lock className="h-6 w-6" />}
      </span>
      <SheetHeader className="space-y-1">
        <SheetTitle className="text-center text-lg">{badge.name}</SheetTitle>
      </SheetHeader>
      <p className="text-sm text-muted-foreground">
        {unlocked ? badge.description : badge.criteria}
      </p>
      {unlocked ? (
        <>
          <p className="text-xs text-muted-foreground">
            Earned {new Date(badge.unlockedAt!).toLocaleDateString()}
          </p>
          <button
            onClick={share}
            className="mt-1 rounded-full bg-hero-gradient px-5 py-2 text-sm font-bold text-primary-foreground shadow-card"
          >
            Share
          </button>
        </>
      ) : (
        <p className="text-xs font-bold text-muted-foreground">Not unlocked yet</p>
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
