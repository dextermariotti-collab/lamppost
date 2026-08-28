import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Machine-readable copy of everything the account holds. */
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profile, activity, achievements, friendships, nudges, reports] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("daily_activity").select("*").eq("user_id", userId),
      supabase.from("user_achievements").select("*").eq("user_id", userId),
      supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      supabase.from("nudges").select("*").or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`),
      supabase.from("content_reports").select("*").eq("user_id", userId),
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
      nudges: nudges.data ?? [],
      contentReports: reports.data ?? [],
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
    if (input?.confirm !== "DELETE") throw new Error('Type DELETE to confirm.');
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

    await supabaseAdmin
      .from("nudges")
      .delete()
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
    if (friendshipIds.length > 0) {
      await supabaseAdmin.from("shared_streaks").delete().in("friendship_id", friendshipIds);
      await supabaseAdmin.from("friendships").delete().in("id", friendshipIds);
    }
    await supabaseAdmin.from("user_achievements").delete().eq("user_id", userId);
    await supabaseAdmin.from("daily_activity").delete().eq("user_id", userId);
    // Safety records survive, detached from the person who filed them.
    await supabaseAdmin.from("content_reports").update({ user_id: null }).eq("user_id", userId);
    await supabaseAdmin.from("moderation_blocks").update({ user_id: null }).eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
