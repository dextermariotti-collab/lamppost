import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

type DebateRow = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  lesson_id: string | null;
  topic: string;
  prompt: string;
  passage: string;
  challenger_side: string;
  opponent_side: string;
  challenger_answer: string | null;
  opponent_answer: string | null;
  challenger_scores: Json | null;
  opponent_scores: Json | null;
  challenger_total: number | null;
  opponent_total: number | null;
  challenger_tip: string | null;
  opponent_tip: string | null;
  max_score: number;
  status: string;
  created_at: string;
};

/**
 * A debate as the caller's own data: the motion, their side, their answer and grade. The other
 * person's answer and tip are theirs, so they never appear; once both have answered, the result
 * (both totals) does.
 */
export function debateForExport(row: DebateRow, userId: string) {
  const mine = row.challenger_id === userId;
  const bothAnswered = row.challenger_answer !== null && row.opponent_answer !== null;
  return {
    id: row.id,
    lessonId: row.lesson_id,
    topic: row.topic,
    prompt: row.prompt,
    passage: row.passage,
    role: mine ? "challenger" : "opponent",
    side: mine ? row.challenger_side : row.opponent_side,
    answer: mine ? row.challenger_answer : row.opponent_answer,
    scores: mine ? row.challenger_scores : row.opponent_scores,
    total: mine ? row.challenger_total : row.opponent_total,
    tip: mine ? row.challenger_tip : row.opponent_tip,
    status: row.status,
    result: bothAnswered
      ? {
          yourTotal: mine ? row.challenger_total : row.opponent_total,
          theirTotal: mine ? row.opponent_total : row.challenger_total,
          maxScore: row.max_score,
        }
      : null,
    createdAt: row.created_at,
  };
}

/** Machine-readable copy of everything the account holds. */
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // The profile has private columns (invite code, goal, settings) that the browser
    // grant can't read, so the owner's row is read server-side.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [
      profile,
      activity,
      achievements,
      friendships,
      sharedStreaks,
      nudges,
      reports,
      argumentAttempts,
      practiceSessions,
      debates,
      subscription,
      consentRecords,
      rewardChests,
      cosmetics,
      weeklyXp,
      leagueResults,
      blocks,
      peopleReports,
      learningState,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("daily_activity").select("*").eq("user_id", userId),
      supabase.from("user_achievements").select("*").eq("user_id", userId),
      supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      supabase.from("shared_streaks").select("*"),
      supabase.from("nudges").select("*").or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`),
      supabase.from("content_reports").select("*").eq("user_id", userId),
      supabase.from("argument_attempts").select("*").eq("user_id", userId),
      supabase.from("practice_sessions").select("*").eq("user_id", userId),
      // Answers and scores aren't readable through the browser grant; the caller's own debates
      // are read here and cut down to their own part (debateForExport).
      supabaseAdmin
        .from("debates")
        .select(
          "id, challenger_id, opponent_id, lesson_id, topic, prompt, passage, challenger_side, opponent_side, challenger_answer, opponent_answer, challenger_scores, opponent_scores, challenger_total, opponent_total, challenger_tip, opponent_tip, max_score, status, created_at",
        )
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`),
      supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("consent_records").select("*").eq("user_id", userId),
      // Rewards and league rows are server-only (the browser role can't read them).
      supabaseAdmin.from("reward_chests").select("*").eq("user_id", userId),
      supabaseAdmin.from("user_cosmetics").select("*").eq("user_id", userId),
      supabaseAdmin.from("xp_weekly").select("*").eq("user_id", userId),
      supabaseAdmin.from("league_results").select("*").eq("user_id", userId),
      // People you blocked, and reports you sent about people. Never who blocked or reported you.
      supabase.from("user_blocks").select("*").eq("blocker_id", userId),
      supabaseAdmin
        .from("user_reports")
        .select("id, reported_user_id, reason, details, status, created_at")
        .eq("reporter_id", userId),
      // Reviews, skill ratings, drill attempts and graded writing, kept for every device.
      supabaseAdmin
        .from("learning_state" as never)
        .select("state, updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      account: {
        id: userId,
        email: (context.claims as { email?: string } | null)?.email ?? null,
      },
      profile: profile.data ?? null,
      dailyActivity: activity.data ?? [],
      achievements: achievements.data ?? [],
      friendships: friendships.data ?? [],
      sharedStreaks: sharedStreaks.data ?? [],
      nudges: nudges.data ?? [],
      contentReports: reports.data ?? [],
      argumentAttempts: argumentAttempts.data ?? [],
      practiceSessions: practiceSessions.data ?? [],
      debates: ((debates.data ?? []) as DebateRow[]).map((row) => debateForExport(row, userId)),
      subscription: subscription.data ?? null,
      consentRecords: consentRecords.data ?? [],
      rewardChests: rewardChests.data ?? [],
      cosmetics: cosmetics.data ?? [],
      weeklyXp: weeklyXp.data ?? [],
      leagueResults: leagueResults.data ?? [],
      blockedPeople: blocks.data ?? [],
      reportsYouSent: peopleReports.data ?? [],
      learningState: learningState.data ?? null,
      note: "Courses, lesson progress, reviews and skills are also stored locally on each device you use.",
    };
  });

/**
 * Permanent deletion, not deactivation. Removing the sign-in identity is one database
 * step that takes everything the person owns with it: every table that holds their data
 * references it with ON DELETE CASCADE (or SET NULL for safety records, which stay for
 * audit but are no longer linked to them). `src/db/deletion.test.ts` fails if a table is
 * ever added that doesn't. Doing it first means there is no half-deleted state: it either
 * all goes or nothing does. Only the abuse-limiting counters, which have no foreign key,
 * are removed afterward.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { confirm: string }) => {
    if (input?.confirm !== "DELETE") throw new Error("Type DELETE to confirm.");
    return { confirm: "DELETE" as const };
  })
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("Account deletion failed", error);
      throw new Error("Couldn't finish deleting your account. Please try again.");
    }

    // Counters keyed by the account (no foreign key). Pseudonymous and pruned after
    // a few days anyway, so a failure here doesn't undo the deletion.
    const cleanup = await supabaseAdmin.from("rate_limits").delete().eq("key", `u:${userId}`);
    if (cleanup.error) console.error("Rate limit cleanup after deletion failed", cleanup.error);
    return { ok: true };
  });
