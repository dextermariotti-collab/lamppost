/**
 * The friends league: a weekly comparison of XP among the people you have added
 * as friends, with a tier that moves up or down by how the week went.
 *
 * It is deliberately gentle. There are no prizes attached to a tier (so nothing
 * to game), a quiet week never costs anyone a tier, and a group too small to
 * mean anything doesn't move anyone at all. Nothing here is a countdown.
 */

export const LEAGUE_TIERS = ["Bronze", "Silver", "Gold", "Sapphire", "Diamond"] as const;
export const MAX_TIER = LEAGUE_TIERS.length - 1;

/** XP a week must have earned to take part in the comparison at all. */
export const LEAGUE_MIN_XP = 50;
/** Fewer than this many taking part (you and two friends) and nobody moves. */
export const LEAGUE_MIN_GROUP = 3;

export const tierName = (tier: number) =>
  LEAGUE_TIERS[Math.min(Math.max(Math.trunc(tier) || 0, 0), MAX_TIER)]!;

export type Standing = { id: string; weeklyXp: number };

/**
 * Ranks the people who took part this week. Ties share a rank (1, 2, 2, 4), and
 * anyone under the XP minimum is listed but not ranked (rank null).
 */
export function rankStandings<T extends Standing>(
  rows: readonly T[],
): (T & { rank: number | null })[] {
  const taking = rows.filter((row) => row.weeklyXp >= LEAGUE_MIN_XP);
  return [...rows]
    .sort((a, b) => b.weeklyXp - a.weeklyXp)
    .map((row) => ({
      ...row,
      rank:
        row.weeklyXp >= LEAGUE_MIN_XP
          ? 1 + taking.filter((other) => other.weeklyXp > row.weeklyXp).length
          : null,
    }));
}

export type LeagueMove = {
  tier: number;
  change: "promoted" | "demoted" | "stayed";
  /** A sentence for the learner, plain about why. */
  reason: string;
};

/**
 * How one learner's week moves them. The top third of those taking part move up,
 * the bottom third move down, everyone else stays. A learner who didn't reach the
 * XP minimum stays put: a week off is not a mark against anyone.
 */
export function leagueMove(input: {
  tier: number;
  weeklyXp: number;
  rank: number | null;
  taking: number;
}): LeagueMove {
  const tier = Math.min(Math.max(Math.trunc(input.tier) || 0, 0), MAX_TIER);
  const stay = (reason: string): LeagueMove => ({ tier, change: "stayed", reason });

  if (input.weeklyXp < LEAGUE_MIN_XP || input.rank === null) {
    return stay("A quiet week. Nothing changes, and nothing is lost.");
  }
  if (input.taking < LEAGUE_MIN_GROUP) {
    return stay(`It takes ${LEAGUE_MIN_GROUP} of you to compare a week. Nobody moves this time.`);
  }
  const zone = Math.floor(input.taking / 3);
  if (input.rank <= zone) {
    return tier < MAX_TIER
      ? { tier: tier + 1, change: "promoted", reason: "You finished in the top third." }
      : stay("You finished in the top third, and there is no tier above this one.");
  }
  if (input.rank > input.taking - zone) {
    return tier > 0
      ? { tier: tier - 1, change: "demoted", reason: "You finished in the bottom third." }
      : stay("You finished in the bottom third; Bronze is the lowest tier, so you stay.");
  }
  return stay("You finished in the middle, so you stay.");
}
