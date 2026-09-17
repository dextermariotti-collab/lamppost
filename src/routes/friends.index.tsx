import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Copy, Flame, Link2, Loader2, Search, UserPlus, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { Confetti } from "@/components/Confetti";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAccount, useFriends, useIncomingNudges, useRefreshAccount } from "@/lib/account";
import { normalizeCompanion } from "@/lib/companions";
import {
  proposeSharedStreak,
  removeFriend,
  respondToRequest,
  respondToSharedStreak,
  markNudgesRead,
  searchPeople,
  sendFriendRequest,
  sendNudge,
  type PersonCard,
} from "@/lib/friends.functions";
import { MAX_SHARED_STREAKS, SHARED_STREAK_MILESTONES } from "@/lib/shared-streak";

export const Route = createFileRoute("/friends/")({
  head: () => ({
    meta: [
      { title: "Friends — Lamppost" },
      {
        name: "description",
        content:
          "Add friends on Lamppost, start a shared streak and keep each other learning every day.",
      },
      { property: "og:title", content: "Friends — Lamppost" },
      {
        property: "og:description",
        content: "Shared streaks make showing up a promise you keep to someone else.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/friends" }],
  }),
  component: FriendsScreen,
});

function FriendsScreen() {
  const { signedIn, sessionReady } = useAccount();
  const { data, isLoading } = useFriends();
  const { data: nudges } = useIncomingNudges();
  const refresh = useRefreshAccount();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (sessionReady && !signedIn) navigate({ to: "/auth", replace: true });
  }, [sessionReady, signedIn, navigate]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(() => {
      void searchPeople({ data: { query: q } })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const run = async (key: string, action: () => Promise<unknown>, celebrateAfter = false) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      refresh();
      if (celebrateAfter) {
        setCelebrate(true);
        window.setTimeout(() => setCelebrate(false), 2200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const inviteLink =
    data?.inviteCode && typeof window !== "undefined"
      ? `${window.location.origin}/invite/${data.inviteCode}`
      : "";

  const atCap = (data?.activeSharedStreaks ?? 0) >= MAX_SHARED_STREAKS;

  return (
    <PhoneFrame>
      {celebrate ? <Confetti big /> : null}
      <ScreenHeader title="Friends" backTo="/profile" />
      <div className="px-5 pb-10">
        {(nudges?.length ?? 0) > 0 ? (
          <div className="mb-4 flex items-start gap-3 rounded-3xl bg-flame/10 p-4">
            <Flame className="mt-0.5 h-5 w-5 shrink-0 text-flame" />
            <p className="flex-1 text-sm font-bold">
              {nudges!.length === 1
                ? `${nudges![0]!.from} nudged you — a lesson keeps your shared streak alive.`
                : `${nudges!.length} friends nudged you today.`}
            </p>
            <button
              onClick={() => void run("nudges", () => markNudgesRead())}
              className="text-xs text-muted-foreground underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {/* Search */}
        <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or handle"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {searching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>

        {error ? <p className="mt-2 text-xs text-flame">{error}</p> : null}

        {results.length > 0 ? (
          <ul className="mt-3">
            {results.map((person) => (
              <li key={person.id} className="flex items-center gap-3 border-b border-border py-3">
                <Avatar person={person} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {person.displayName ?? person.handle}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{person.handle} · {person.currentStreak} day streak
                  </span>
                </span>
                <button
                  onClick={() =>
                    void run(person.id, () => sendFriendRequest({ data: { userId: person.id } }))
                  }
                  disabled={busy === person.id}
                  className="rounded-full bg-hero-gradient px-4 py-2 text-xs font-bold text-primary-foreground shadow-card disabled:opacity-60"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        ) : query.trim().length >= 2 && !searching ? (
          <p className="mt-3 text-xs text-muted-foreground">
            No one matches that yet. Share your invite link instead.
          </p>
        ) : null}

        {/* Debates — badged when it's your move or a result is waiting */}
        <RouterLink
          to="/debates"
          className="mt-6 flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft"
        >
          <Swords aria-hidden className="h-4 w-4 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Debates</span>
            <span className="block text-xs text-muted-foreground">
              {debateAlerts > 0
                ? `${debateAlerts} need${debateAlerts === 1 ? "s" : ""} you — your turn or a result is in`
                : "Same motion, opposite sides, one rubric"}
            </span>
          </span>
          {debateAlerts > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
              {debateAlerts}
            </span>
          )}
        </RouterLink>

        {/* Invite link */}

        <section className="mt-6 rounded-3xl bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <h2 className="flex-1 text-sm font-bold">Invite link</h2>
            <button
              onClick={async () => {
                if (!inviteLink) return;
                if (typeof navigator !== "undefined" && navigator.share) {
                  await navigator.share({ url: inviteLink, text: "Learn with me on Lamppost" }).catch(
                    () => undefined,
                  );
                } else {
                  await navigator.clipboard?.writeText(inviteLink).catch(() => undefined);
                }
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              }}
              className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-bold"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Share"}
            </button>
          </div>
          <p className="mt-2 break-all text-xs text-muted-foreground">{inviteLink || "—"}</p>
          {inviteLink ? (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(inviteLink)}`}
              alt="QR code for your Lamppost invite link"
              loading="lazy"
              width={120}
              height={120}
              className="mx-auto mt-3 rounded-xl bg-background p-2"
            />
          ) : null}
        </section>

        {/* Requests */}
        {(data?.incoming.length ?? 0) > 0 ? (
          <section className="mt-6">
            <h2 className="text-sm font-bold">Friend requests</h2>
            <ul className="mt-2">
              {data!.incoming.map((person) => (
                <li
                  key={person.friendshipId}
                  className="flex items-center gap-3 border-b border-border py-3"
                >
                  <Avatar person={person} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {person.displayName ?? person.handle}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      @{person.handle} wants to learn together
                    </span>
                  </span>
                  <button
                    aria-label="Accept request"
                    onClick={() =>
                      void run(
                        person.friendshipId,
                        () =>
                          respondToRequest({
                            data: { friendshipId: person.friendshipId, accept: true },
                          }),
                        true,
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-hero-gradient text-primary-foreground shadow-card"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Decline request"
                    onClick={() =>
                      void run(person.friendshipId, () =>
                        respondToRequest({
                          data: { friendshipId: person.friendshipId, accept: false },
                        }),
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {(data?.outgoing.length ?? 0) > 0 ? (
          <section className="mt-6">
            <h2 className="text-sm font-bold">Sent</h2>
            <ul className="mt-2">
              {data!.outgoing.map((person) => (
                <li
                  key={person.friendshipId}
                  className="flex items-center gap-3 border-b border-border py-3"
                >
                  <Avatar person={person} />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                    {person.displayName ?? person.handle}
                  </span>
                  <span className="text-xs text-muted-foreground">Waiting</span>
                  <button
                    onClick={() =>
                      void run(person.friendshipId, () =>
                        removeFriend({ data: { friendshipId: person.friendshipId } }),
                      )
                    }
                    className="text-xs text-muted-foreground underline"
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Friends list */}
        <section className="mt-6">
          <h2 className="text-sm font-bold">Your friends</h2>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (data?.friends.length ?? 0) === 0 ? (
            <div className="mt-3 rounded-3xl bg-card p-5 text-center shadow-soft">
              <UserPlus className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 text-sm font-bold">Add friends to keep each other&apos;s streak alive</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Search a handle above or send your invite link.
              </p>
            </div>
          ) : (
            <ul className="mt-2">
              {data!.friends.map((friend) => {
                const shared = friend.sharedStreak;
                const key = friend.friendshipId;
                return (
                  <li key={key} className="border-b border-border py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        to="/friends/$handle"
                        params={{ handle: friend.handle }}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <Avatar person={friend} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">
                            {friend.displayName ?? friend.handle}
                          </span>
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Flame className="h-3 w-3 text-flame" />
                            {friend.currentStreak}
                            <Zap className="h-3 w-3 text-xp" />
                            {(friend.totalXp ?? 0).toLocaleString()}
                          </span>
                        </span>
                      </Link>
                      {shared?.status === "active" ? (
                        <span className="flex items-center gap-1 rounded-full bg-flame/10 px-2.5 py-1 text-xs font-bold text-flame">
                          <Flame className="h-3.5 w-3.5" />
                          {shared.count}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 pl-12">
                      {shared === null ? (
                        <button
                          onClick={() =>
                            void run(key, () => proposeSharedStreak({ data: { friendshipId: key } }))
                          }
                          disabled={busy === key || atCap}
                          className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                        >
                          {atCap ? `Max ${MAX_SHARED_STREAKS} shared streaks` : "Start a shared streak"}
                        </button>
                      ) : shared.status === "pending" ? (
                        shared.proposedByMe ? (
                          <span className="text-xs text-muted-foreground">
                            Shared streak invite sent
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                void run(
                                  key,
                                  () =>
                                    respondToSharedStreak({
                                      data: { sharedStreakId: shared.id, accept: true },
                                    }),
                                  true,
                                )
                              }
                              className="rounded-full bg-hero-gradient px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-card"
                            >
                              Accept shared streak
                            </button>
                            <button
                              onClick={() =>
                                void run(key, () =>
                                  respondToSharedStreak({
                                    data: { sharedStreakId: shared.id, accept: false },
                                  }),
                                )
                              }
                              className="text-xs text-muted-foreground underline"
                            >
                              Decline
                            </button>
                          </>
                        )
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground">
                            {friend.activeToday
                              ? "They've learned today"
                              : "They haven't learned today"}
                          </span>
                          {!friend.activeToday ? (
                            <button
                              onClick={() =>
                                void run(key, () =>
                                  sendNudge({
                                    data: { toUserId: friend.id, sharedStreakId: shared.id },
                                  }),
                                )
                              }
                              disabled={friend.nudgedToday || busy === key}
                              className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                            >
                              {friend.nudgedToday ? "Nudged today" : "Nudge"}
                            </button>
                          ) : null}
                          {SHARED_STREAK_MILESTONES.includes(shared.count) ? (
                            <span className="text-xs font-bold text-flame">
                              {shared.count}-day milestone
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </PhoneFrame>
  );
}

function Avatar({ person }: { person: PersonCard }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
      <CompanionAvatar companion={normalizeCompanion(person.companion)} size={38} />
    </span>
  );
}
