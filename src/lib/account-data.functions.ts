import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
      supabase.from("debates").select("*"),
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
      debates: debates.data ?? [],
      subscription: subscription.data ?? null,
      consentRecords: consentRecords.data ?? [],
      rewardChests: rewardChests.data ?? [],
      cosmetics: cosmetics.data ?? [],
      weeklyXp: weeklyXp.data ?? [],
      leagueResults: leagueResults.data ?? [],
      blockedPeople: blocks.data ?? [],
      reportsYouSent: peopleReports.data ?? [],
      note: "Courses, lesson progress and the review schedule are also stored locally on each device you use.",
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
