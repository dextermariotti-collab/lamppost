import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { shiftDay } from "./days";
import { TodayInput, resolveToday } from "./client-day";
import type { Badge } from "./achievements";

/**
 * Reads the badge catalogue and evaluates unlock criteria against the account's
 * live progress, so no background job is needed.
 */
export const listAchievements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => TodayInput.parse(input))
  .handler(async ({ data, context }): Promise<{ badges: Badge[]; justUnlocked: string[] }> => {
    const { supabase, userId } = context;
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const today = resolveToday(data);

    const [{ data: catalogue, error: catError }, { data: profile }, { data: unlocked }] =
      await Promise.all([
        supabase
          .from("achievements")
          .select("code, name, description, icon, criteria, sort_order")
          .order("sort_order"),
        // The daily goal is a private column, so the owner's row is read server-side.
        admin
          .from("profiles")
          .select("total_xp, longest_streak, current_streak, daily_goal")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("user_achievements")
          .select("achievement_code, unlocked_at")
          .eq("user_id", userId),
      ]);
    if (catError) throw new Error(catError.message);

    const week = Array.from({ length: 7 }, (_, i) => shiftDay(today, -i));
    const [{ data: activity }, { data: friendships }, { data: streaks }] = await Promise.all([
      supabase.from("daily_activity").select("day, lessons_completed").eq("user_id", userId),
      supabase.from("friendships").select("id").eq("status", "accepted"),
      supabase.from("shared_streaks").select("current_count").eq("status", "active"),
    ]);

    const byDay = new Map((activity ?? []).map((row) => [row.day, row.lessons_completed]));
    const goal = profile?.daily_goal ?? 3;
    const lessonsEver = (activity ?? []).reduce((sum, row) => sum + row.lessons_completed, 0);
    const bestShared = (streaks ?? []).reduce((max, s) => Math.max(max, s.current_count), 0);

    const earned: Record<string, boolean> = {
      first_lesson: lessonsEver >= 1,
      streak_7: Math.max(profile?.longest_streak ?? 0, profile?.current_streak ?? 0) >= 7,
      xp_100: (profile?.total_xp ?? 0) >= 100,
      perfect_week: week.every((day) => (byDay.get(day) ?? 0) >= goal),
      first_friend: (friendships ?? []).length >= 1,
      shared_streak_7: bestShared >= 7,
    };

    const already = new Map((unlocked ?? []).map((row) => [row.achievement_code, row.unlocked_at]));
    const missing = (catalogue ?? [])
      .filter((row) => earned[row.code] && !already.has(row.code))
      .map((row) => row.code);

    if (missing.length > 0) {
      const now = new Date().toISOString();
      // Badges are awarded here, from server-held numbers; the browser can't insert them.
      const { error } = await admin.from("user_achievements").upsert(
        missing.map((code) => ({ user_id: userId, achievement_code: code, unlocked_at: now })),
        { onConflict: "user_id,achievement_code" },
      );
      if (!error) for (const code of missing) already.set(code, now);
    }

    return {
      badges: (catalogue ?? []).map((row) => ({
        code: row.code,
        name: row.name,
        description: row.description,
        icon: row.icon,
        criteria: row.criteria,
        unlockedAt: already.get(row.code) ?? null,
      })),
      justUnlocked: missing,
    };
  });
