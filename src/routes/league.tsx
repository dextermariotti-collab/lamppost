import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Trophy } from "lucide-react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { useSessionUser } from "@/lib/companion-store";
import { dayKey } from "@/lib/days";
import { LEAGUE_MIN_GROUP, LEAGUE_MIN_XP, tierName } from "@/lib/league";
import {
  getLeague,
  type LeagueLastWeek,
  type LeagueMember,
  type LeagueView,
} from "@/lib/league.functions";
import { formatWait, isLimited } from "@/lib/rate-limit";

export const Route = createFileRoute("/league")({
  head: () => ({
    meta: [
      { title: "Friends league — Lamppost" },
      {
        name: "description",
        content:
          "A weekly XP comparison among you and the friends you have added, with a tier that moves with the week.",
      },
      { property: "og:title", content: "Friends league — Lamppost" },
      {
        property: "og:description",
        content: "Friends only. No prizes, and a quiet week never costs you a tier.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeagueScreen,
});

const weekLabel = (weekStart: string) =>
  new Date(`${weekStart}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function LeagueScreen() {
  const { userId, ready } = useSessionUser();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["league", userId],
    queryFn: () => getLeague({ data: { today: dayKey() } }),
    enabled: ready && Boolean(userId),
    staleTime: 30_000,
  });

  return (
    <PhoneFrame>
      <ScreenHeader backTo="/friends" />
      <main className="px-5 pb-10">
        <div className="flex items-center gap-2 text-primary-text">
          <Trophy aria-hidden className="h-4 w-4" />
          <p className="text-xs font-bold">Friends league</p>
        </div>
        <h1 className="mt-2 text-3xl leading-tight">This week, together</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You and the friends you have added, compared on the XP each of you earns from Monday.
        </p>

        {!ready ? null : !userId ? (
          <GuestPrompt />
        ) : isLoading ? (
          <div role="status" aria-label="Loading the league" className="flex justify-center py-16">
            <Loader2 aria-hidden className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isError || !data ? (
          <Problem message="The league couldn't load just now." onRetry={() => void refetch()} />
        ) : data.ok ? (
          <League view={data} />
        ) : (
          <Problem
            message={
              isLimited(data)
                ? `${data.reason} Try again in ${formatWait(data.retryAfterSeconds)}.`
                : data.reason
            }
            onRetry={isLimited(data) ? null : () => void refetch()}
          />
        )}

        <HowItWorks />
      </main>
    </PhoneFrame>
  );
}

function GuestPrompt() {
  return (
    <section className="mt-6 rounded-3xl border border-border p-5 text-center">
      <p className="text-sm font-bold">The league lives on your account</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Sign in and add a couple of friends, and you can compare weeks. Everything else in Lamppost
        works without an account.
      </p>
      <Button asChild className="mt-4 h-11 w-full rounded-full font-semibold">
        <Link to="/auth">Sign in</Link>
      </Button>
    </section>
  );
}

function Problem({ message, onRetry }: { message: string; onRetry: (() => void) | null }) {
  return (
    <section className="mt-6 rounded-3xl border border-border p-5 text-center">
      <p role="alert" className="text-sm font-semibold text-foreground">
        {message}
      </p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          className="mt-4 h-11 w-full rounded-full font-semibold"
        >
          Try again
        </Button>
      )}
    </section>
  );
}

function League({ view }: { view: LeagueView }) {
  const ranked = view.members.filter((member) => member.rank !== null);
  const resting = view.members.filter((member) => member.rank === null);
  const alone = view.members.length <= 1;

  return (
    <>
      <p className="mt-5 text-sm font-semibold text-foreground">
        You're in {tierName(view.myTier)}.{" "}
        <span className="font-normal text-muted-foreground">
          Week of {weekLabel(view.weekStart)}.
        </span>
      </p>

      {view.lastWeek && <LastWeek result={view.lastWeek} />}

      {alone ? (
        <section className="mt-6 rounded-3xl border border-border p-5 text-center">
          <p className="text-sm font-bold">Add a friend to start</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The league is only ever the people you have added. It takes {LEAGUE_MIN_GROUP} of you
            earning at least {LEAGUE_MIN_XP} XP in a week for anyone to move.
          </p>
          <Button asChild className="mt-4 h-11 w-full rounded-full font-semibold">
            <Link to="/friends">Find a friend</Link>
          </Button>
        </section>
      ) : (
        <>
          <h2 className="mt-6 text-base">Standings</h2>
          {ranked.length === 0 ? (
            <p className="mt-1 text-[13px] text-muted-foreground">
              Nobody has reached {LEAGUE_MIN_XP} XP yet this week. It's early.
            </p>
          ) : (
            <ol className="mt-2 divide-y divide-border rounded-2xl border border-border">
              {ranked.map((member) => (
                <Row key={member.id} member={member} />
              ))}
            </ol>
          )}

          {resting.length > 0 && (
            <>
              <h2 className="mt-6 text-base">Not yet compared</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                A week counts once it has {LEAGUE_MIN_XP} XP in it.
              </p>
              <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
                {resting.map((member) => (
                  <Row key={member.id} member={member} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  );
}

function Row({ member }: { member: LeagueMember }) {
  const name = member.displayName ?? `@${member.handle}`;
  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-2">
      <span
        className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground"
        aria-label={member.rank === null ? "Not ranked" : `Rank ${member.rank}`}
      >
        {member.rank ?? "–"}
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
        <CompanionAvatar companion={member.companion} size={38} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">
          {name}
          {member.isMe ? <span className="font-normal text-muted-foreground"> · you</span> : null}
        </span>
        <span className="block text-xs text-muted-foreground">{tierName(member.tier)}</span>
      </span>
      <span className="shrink-0 text-sm font-bold text-foreground">
        {member.weeklyXp.toLocaleString("en-GB")} XP
      </span>
    </li>
  );
}

function LastWeek({ result }: { result: LeagueLastWeek }) {
  const headline =
    result.change === "promoted"
      ? `Last week moved you up to ${tierName(result.tierAfter)}.`
      : result.change === "demoted"
        ? `Last week moved you down to ${tierName(result.tierAfter)}.`
        : `Last week you stayed in ${tierName(result.tierAfter)}.`;
  return (
    <section
      aria-label="Last week"
      className="mt-4 rounded-3xl border border-border bg-card p-4 shadow-soft"
    >
      <p className="text-sm font-bold text-foreground">{headline}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {result.reason} Week of {weekLabel(result.weekStart)},{" "}
        {result.weeklyXp.toLocaleString("en-GB")} XP.
      </p>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="mt-8 border-t border-border pt-5" aria-labelledby="how-heading">
      <h2 id="how-heading" className="text-base">
        How it works
      </h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-muted-foreground">
        <li>Weeks run Monday to Sunday, by the day on your device.</li>
        <li>
          Only people you have added are in your league. Nobody else sees it, and there are no
          strangers.
        </li>
        <li>
          Once a week ends, the top third of those who earned {LEAGUE_MIN_XP} XP or more move up a
          tier and the bottom third move down. It takes {LEAGUE_MIN_GROUP} of you for anyone to
          move.
        </li>
        <li>A week off changes nothing. Nobody drops a tier for being away.</li>
        <li>Tiers are just names. They earn nothing and unlock nothing.</li>
        <li>
          Your friends can see your weekly XP and tier here, as they can already see your streak and
          total XP. Removing a friend takes you out of each other's league.
        </li>
      </ul>
    </section>
  );
}
