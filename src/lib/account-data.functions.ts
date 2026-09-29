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
      rewardChests,
      cosmetics,
      weeklyXp,
      leagueResults,
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
      // Rewards and league rows are server-only (the browser role can't read them).
      supabaseAdmin.from("reward_chests").select("*").eq("user_id", userId),
      supabaseAdmin.from("user_cosmetics").select("*").eq("user_id", userId),
      supabaseAdmin.from("xp_weekly").select("*").eq("user_id", userId),
      supabaseAdmin.from("league_results").select("*").eq("user_id", userId),
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
      rewardChests: rewardChests.data ?? [],
      cosmetics: cosmetics.data ?? [],
      weeklyXp: weeklyXp.data ?? [],
      leagueResults: leagueResults.data ?? [],
      note: "Courses, lesson progress and the review schedule are also stored locally on each device you use.",
    };
  });

/**
 * Permanent deletion, not deactivation: personal rows are removed, safety
 * records are anonymised so moderation stays auditable, and the sign-in
 * identity itself is deleted.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { confirm: string }) => {
    if (input?.confirm !== "DELETE") throw new Error("Type DELETE to confirm.");
    return { confirm: "DELETE" as const };
  })
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: friendships } = await supabaseAdmin
      .from("friendships")
      .select("id")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    const friendshipIds = (friendships ?? []).map((row) => row.id);

    // Each step must succeed: a silent failure would leave personal rows behind for
    // an account the person believes is gone.
    const step = async (label: string, run: PromiseLike<{ error: { message: string } | null }>) => {
      const { error } = await run;
      if (error)
        throw new Error(`Couldn't finish deleting your account (${label}). Please try again.`);
    };

    await step(
      "nudges",
      supabaseAdmin.from("nudges").delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`),
    );
    if (friendshipIds.length > 0) {
      await step(
        "shared streaks",
        supabaseAdmin.from("shared_streaks").delete().in("friendship_id", friendshipIds),
      );
      await step("friendships", supabaseAdmin.from("friendships").delete().in("id", friendshipIds));
    }
    await step("rate limits", supabaseAdmin.from("rate_limits").delete().eq("key", `u:${userId}`));
    await step("badges", supabaseAdmin.from("user_achievements").delete().eq("user_id", userId));
    await step("activity", supabaseAdmin.from("daily_activity").delete().eq("user_id", userId));
    // Safety records survive, detached from the person who filed them.
    await step(
      "reports",
      supabaseAdmin.from("content_reports").update({ user_id: null }).eq("user_id", userId),
    );
    await step(
      "moderation records",
      supabaseAdmin.from("moderation_blocks").update({ user_id: null }).eq("user_id", userId),
    );
    // Debates, graded attempts, practice sessions, rewards, league results and the
    // subscription row are removed with the sign-in identity (ON DELETE CASCADE on
    // auth.users).
    await step("profile", supabaseAdmin.from("profiles").delete().eq("id", userId));

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
