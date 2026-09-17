import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Loader2, Lock, Swords, Trophy, UserMinus, UserPlus, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { achievementIcon } from "@/lib/achievements";
import { useAccount, useRefreshAccount } from "@/lib/account";
import { normalizeCompanion } from "@/lib/companions";
import { monthYear } from "@/lib/days";
import { challengeToDebate } from "@/lib/debate.functions";
import { getFriendProfile, removeFriend, sendFriendRequest } from "@/lib/friends.functions";
import { leagueFor } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/friends/$handle")({
  head: () => ({
    meta: [
      { title: "Learner profile — Lamppost" },
      {
        name: "description",
        content: "A Lamppost learner's streak, XP, league and achievements.",
      },
      { property: "og:title", content: "Learner profile — Lamppost" },
      { property: "og:description", content: "See a friend's streak, XP and badges on Lamppost." },
      { property: "og:type", content: "profile" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FriendProfileScreen,
});

function FriendProfileScreen() {
  const { handle } = useParams({ from: "/friends/$handle" });
  const { signedIn, sessionReady } = useAccount();
  const refresh = useRefreshAccount();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [debateError, setDebateError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionReady && !signedIn) navigate({ to: "/auth", replace: true });
  }, [sessionReady, signedIn, navigate]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["friend-profile", handle],
    queryFn: () => getFriendProfile({ data: { handle } }),
    enabled: signedIn,
  });

  if (isLoading) {
    return (
      <PhoneFrame>
        <ScreenHeader backTo="/friends" />
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </PhoneFrame>
    );
  }

  if (!data) {
    return (
      <PhoneFrame>
        <ScreenHeader title="Not found" backTo="/friends" />
        <p className="px-5 pt-6 text-sm text-muted-foreground">No learner uses @{handle}.</p>
      </PhoneFrame>
    );
  }

  const { person, longestStreak, joinedAt, badges, friendshipId, friendshipStatus } = data;
  const league = leagueFor(person.totalXp ?? 0);
  const isFriend = friendshipStatus === "accepted";

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      refresh();
      await refetch();
    } finally {
      setBusy(false);
    }
  };

  return (
    <PhoneFrame>
      <ScreenHeader title={`@${person.handle}`} backTo="/friends" />
      <div className="px-5 pb-10">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-muted">
            <CompanionAvatar companion={normalizeCompanion(person.companion)} size={56} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{person.displayName ?? person.handle}</p>
            <p className="text-[13px] text-muted-foreground">Joined {monthYear(joinedAt)}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Tile
            icon={<Flame className="h-[18px] w-[18px] text-flame" />}
            value={String(person.currentStreak)}
            label="Day streak"
          />
          <Tile
            icon={<Zap className="h-[18px] w-[18px] text-xp" />}
            value={(person.totalXp ?? 0).toLocaleString()}
            label="Total XP"
          />
          <Tile
            icon={<Trophy className="h-[18px] w-[18px] text-primary" />}
            value={league.name}
            label="League"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Longest streak: {longestStreak} days</p>

        <h2 className="mt-6 text-sm font-bold">Achievements</h2>
        {badges.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No badges yet.</p>
        ) : (
          <div className="-mx-5 mt-3 flex gap-4 overflow-x-auto px-5 pb-1">
            {badges.map((badge) => {
              const Icon = achievementIcon(badge.code);
              return (
                <span
                  key={badge.code}
                  className="flex w-[68px] shrink-0 flex-col items-center gap-1.5"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-hero-gradient text-primary-foreground shadow-card">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-center text-[11px] font-bold leading-tight">
                    {badge.code.replaceAll("_", " ")}
                  </span>
                </span>
              );
            })}
          </div>
        )}

        {isFriend && (
          <div className="mt-8 rounded-3xl bg-card p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <Swords aria-hidden className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold">Debate a friend</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              You both get the same motion and opposite sides. Each case is graded on the same
              rubric, then shown side by side.
            </p>
            {debateError && (
              <p className="mt-2 text-xs font-semibold text-destructive">{debateError}</p>
            )}
            <button
              onClick={() => {
                if (busy) return;
                setBusy(true);
                setDebateError(null);
                void challengeToDebate({ data: { opponentId: person.id } })
                  .then((result) => {
                    if (result.id) navigate({ to: "/debate/$id", params: { id: result.id } });
                    else setDebateError("That couldn't be started. Try again in a moment.");
                  })
                  .catch((error: unknown) =>
                    setDebateError(
                      error instanceof Error
                        ? error.message
                        : "That couldn't be started. Try again in a moment.",
                    ),
                  )
                  .finally(() => setBusy(false));
              }}
              disabled={busy}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-hero-gradient py-3 text-sm font-bold text-primary-foreground shadow-card disabled:opacity-60"
            >
              <Swords className="h-4 w-4" />
              {busy ? "Writing the motion…" : "Challenge to a debate"}
            </button>
            <button
              onClick={() => navigate({ to: "/debates" })}
              className="mt-2 h-9 w-full text-xs font-bold text-muted-foreground underline"
            >
              See all debates
            </button>
          </div>
        )}

        <div className="mt-8">
          {isFriend ? (
            <button
              onClick={() =>
                void act(() => removeFriend({ data: { friendshipId: friendshipId! } }))
              }
              disabled={busy}
              className="flex items-center gap-2 text-xs text-muted-foreground underline disabled:opacity-60"
            >
              <UserMinus className="h-3.5 w-3.5" />
              Remove friend
            </button>
          ) : friendshipStatus === "pending" ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Request pending
            </p>
          ) : (
            <button
              onClick={() => void act(() => sendFriendRequest({ data: { userId: person.id } }))}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-hero-gradient py-3 text-sm font-bold text-primary-foreground shadow-card disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" />
              Add friend
            </button>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

function Tile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-card px-2 py-3 shadow-soft">
      {icon}
      <span className={cn("text-[19px] font-bold leading-none")}>{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
