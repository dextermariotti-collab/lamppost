import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TodayInput, resolveToday } from "./client-day";
import { LEAGUE_MIN_GROUP, LEAGUE_MIN_XP, MAX_TIER, leagueMove, rankStandings } from "./league";
import { limitedFailure, type LimitedFailure } from "./rate-limit";
import { previousWeekStart, weekStartOf } from "./weeks";

export type LeagueMember = {
  id: string;
  displayName: string | null;
  handle: string;
  companion: { preset: string; palette: string; accessory: string; expression: string };
  tier: number;
  weeklyXp: number;
  /** null until they have earned enough XP this week to be compared. */
  rank: number | null;
  isMe: boolean;
};

export type LeagueLastWeek = {
  weekStart: string;
  rank: number | null;
  taking: number;
  weeklyXp: number;
  tierBefore: number;
  tierAfter: number;
  change: "promoted" | "demoted" | "stayed";
  reason: string;
};

export type LeagueView = {
  ok: true;
  weekStart: string;
  minXp: number;
  myTier: number;
  /** You and your accepted friends, best first. Nobody else is ever in here. */
  members: LeagueMember[];
  /** How many have earned enough this week to be compared. */
  taking: number;
  lastWeek: LeagueLastWeek | null;
};

type StandingRow = {
  id: string;
  display_name: string | null;
  handle: string;
  companion_preset: string;
  companion_palette: string;
  companion_accessory: string;
  companion_expression: string;
  league_tier: number;
  weekly_xp: number;
};

async function standings(userId: string, week: string): Promise<StandingRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("league_standings", {
    _user: userId,
    _week: week,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

type LeagueResult = {
  rank: number | null;
  group_size: number;
  weekly_xp: number;
  tier_before: number;
  tier_after: number;
  week_start: string;
};

/**
 * How many shared the learner's place, as far as a stored result can tell: league_results keeps
 * the rank but not the tie. A top-third learner below the top tier who didn't move up can only
 * have been level with someone in the bottom third, so it is the smallest tie that reaches there.
 */
function tieOnRecord(result: LeagueResult): number {
  const { rank, group_size: taking } = result;
  const zone = Math.floor(taking / 3);
  if (rank === null || rank > zone || taking < LEAGUE_MIN_GROUP) return 1;
  if (result.weekly_xp < LEAGUE_MIN_XP || result.tier_before >= MAX_TIER) return 1;
  return result.tier_after === result.tier_before ? taking - zone - rank + 2 : 1;
}

const describeMove = (result: LeagueResult, tied = tieOnRecord(result)): LeagueLastWeek => ({
  weekStart: result.week_start,
  rank: result.rank,
  taking: result.group_size,
  weeklyXp: result.weekly_xp,
  tierBefore: result.tier_before,
  // What was recorded is what happened; the sentence explaining it comes from the rule.
  tierAfter: result.tier_after,
  change:
    result.tier_after > result.tier_before
      ? "promoted"
      : result.tier_after < result.tier_before
        ? "demoted"
        : "stayed",
  reason: leagueMove({
    tier: result.tier_before,
    weeklyXp: result.weekly_xp,
    rank: result.rank,
    taking: result.group_size,
    tied,
  }).reason,
});

/**
 * Judges last week for this learner if it hasn't been judged yet, once: the result
 * is recorded with the tier change in a single database step, so opening the screen
 * twice, or from two devices, can't move anyone twice. Only the most recent finished
 * week is ever judged, so a learner who was away is never marked down for weeks
 * they weren't here.
 */
async function settleLastWeek(userId: string, lastWeek: string): Promise<LeagueLastWeek> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const read = async () =>
    (
      await supabaseAdmin
        .from("league_results")
        .select("week_start, rank, group_size, weekly_xp, tier_before, tier_after")
        .eq("user_id", userId)
        .eq("week_start", lastWeek)
        .maybeSingle()
    ).data;

  const existing = await read();
  if (existing) return describeMove(existing);

  const ranked = rankStandings(
    (await standings(userId, lastWeek)).map((row) => ({ ...row, weeklyXp: row.weekly_xp })),
  );
  const me = ranked.find((row) => row.id === userId);
  const taking = ranked.filter((row) => row.rank !== null).length;
  const before = me?.league_tier ?? 0;
  const move = leagueMove({
    tier: before,
    weeklyXp: me?.weeklyXp ?? 0,
    rank: me?.rank ?? null,
    taking,
    tied: me?.tied,
  });
  const { data: judgedHere } = await supabaseAdmin.rpc("apply_league_result", {
    _user: userId,
    _week: lastWeek,
    _rank: me?.rank ?? (null as unknown as number),
    _group: taking,
    _xp: me?.weeklyXp ?? 0,
    _before: before,
    _after: move.tier,
  });
  // Another request may have judged the week first; whichever did, this is the record. Only a
  // record made here is sure to come from this tie.
  const stored = await read();
  return stored
    ? describeMove(stored, judgedHere === true ? me?.tied : undefined)
    : {
        weekStart: lastWeek,
        rank: me?.rank ?? null,
        taking,
        weeklyXp: me?.weeklyXp ?? 0,
        tierBefore: before,
        tierAfter: move.tier,
        change: move.change,
        reason: move.reason,
      };
}

/** This week's standings among the learner's friends, after settling last week. */
export const getLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => TodayInput.parse(input))
  .handler(
    async ({
      data,
      context,
    }): Promise<LeagueView | LimitedFailure | { ok: false; reason: string }> => {
      const { limiter } = await import("./rate-limit.server");
      const verdict = await limiter().enforce("leagueView");
      if (!verdict.ok) return limitedFailure(verdict);

      const today = resolveToday(data);
      const thisWeek = weekStartOf(today);
      try {
        const lastWeek = await settleLastWeek(context.userId, previousWeekStart(today));
        const ranked = rankStandings(
          (await standings(context.userId, thisWeek)).map((row) => ({
            ...row,
            weeklyXp: row.weekly_xp,
          })),
        );
        const members: LeagueMember[] = ranked.map((row) => ({
          id: row.id,
          displayName: row.display_name,
          handle: row.handle,
          companion: {
            preset: row.companion_preset,
            palette: row.companion_palette,
            accessory: row.companion_accessory,
            expression: row.companion_expression,
          },
          tier: row.league_tier,
          weeklyXp: row.weeklyXp,
          rank: row.rank,
          isMe: row.id === context.userId,
        }));
        return {
          ok: true,
          weekStart: thisWeek,
          minXp: LEAGUE_MIN_XP,
          myTier: members.find((m) => m.isMe)?.tier ?? 0,
          members,
          taking: members.filter((m) => m.rank !== null).length,
          lastWeek,
        };
      } catch (error) {
        console.error("Opening the league failed", error);
        return { ok: false, reason: "The league couldn't load just now. Try again in a moment." };
      }
    },
  );
