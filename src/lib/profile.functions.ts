import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { utcDay } from "./days";

export type AccountProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  handle: string;
  inviteCode: string;
  joinedAt: string;
  dailyGoal: number;
  notifyNudgesInApp: boolean;
  notifyNudgesEmail: boolean;
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  gems: number;
  lastActiveDay: string | null;
  companion: {
    preset: string;
    palette: string;
    accessory: string;
    expression: string;
  };
};

const SELECT =
  "id, display_name, handle, invite_code, created_at, daily_goal, notify_nudges_inapp, notify_nudges_email, current_streak, longest_streak, total_xp, gems, last_active_day, companion_preset, companion_palette, companion_accessory, companion_expression";

export const getMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountProfile | null> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select(SELECT)
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const email = (context.claims as { email?: string } | null)?.email ?? null;
    return {
      id: data.id,
      email,
      displayName: data.display_name,
      handle: data.handle,
      inviteCode: data.invite_code,
      joinedAt: data.created_at,
      dailyGoal: data.daily_goal,
      notifyNudgesInApp: data.notify_nudges_inapp,
      notifyNudgesEmail: data.notify_nudges_email,
      currentStreak: data.current_streak,
      longestStreak: data.longest_streak,
      totalXp: data.total_xp,
      gems: data.gems,
      lastActiveDay: data.last_active_day,
      companion: {
        preset: data.companion_preset,
        palette: data.companion_palette,
        accessory: data.companion_accessory,
        expression: data.companion_expression,
      },
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      displayName?: string;
      handle?: string;
      dailyGoal?: number;
      notifyNudgesInApp?: boolean;
      notifyNudgesEmail?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, string | number | boolean | null> = {};
    if (data.displayName !== undefined) {
      const name = data.displayName.trim().slice(0, 40);
      patch["display_name"] = name.length > 0 ? name : null;
    }
    if (data.handle !== undefined) {
      const handle = data.handle.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
        throw new Error("Handles use 3–20 letters, numbers or underscores.");
      }
      patch["handle"] = handle;
    }
    if (data.dailyGoal !== undefined) {
      patch["daily_goal"] = Math.min(10, Math.max(1, Math.round(data.dailyGoal)));
    }
    if (data.notifyNudgesInApp !== undefined) patch["notify_nudges_inapp"] = data.notifyNudgesInApp;
    if (data.notifyNudgesEmail !== undefined) patch["notify_nudges_email"] = data.notifyNudgesEmail;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await context.supabase
      .from("profiles")
      .update(patch as never)
      .eq("id", context.userId);
    if (error) {
      throw new Error(error.code === "23505" ? "That handle is already taken." : error.message);
    }
    return { ok: true };
  });

/**
 * Write-through sync of the device's progress onto the account. Merge is
 * max-wins so replaying it is safe and no streak is ever lost.
 */
export const syncProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      streak: number;
      longestStreak: number;
      totalXp: number;
      gems: number;
      lastActiveDay: string | null;
      history: Record<string, number>;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: current, error: readError } = await supabase
      .from("profiles")
      .select("current_streak, longest_streak, total_xp, gems, last_active_day")
      .eq("id", userId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);

    const today = utcDay();
    const nextLastActive =
      [data.lastActiveDay, current?.last_active_day].filter(Boolean).sort().pop() ?? null;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        current_streak: Math.max(current?.current_streak ?? 0, data.streak),
        longest_streak: Math.max(current?.longest_streak ?? 0, data.longestStreak, data.streak),
        total_xp: Math.max(current?.total_xp ?? 0, data.totalXp),
        gems: Math.max(current?.gems ?? 0, data.gems),
        last_active_day: nextLastActive,
      })
      .eq("id", userId);
    if (updateError) throw new Error(updateError.message);

    const days = Object.entries(data.history)
      .filter(([day, count]) => day <= today && count > 0)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .slice(0, 60);

    if (days.length > 0) {
      const { data: existing } = await supabase
        .from("daily_activity")
        .select("day, lessons_completed")
        .eq("user_id", userId)
        .in(
          "day",
          days.map(([day]) => day),
        );
      const byDay = new Map((existing ?? []).map((row) => [row.day, row.lessons_completed]));
      const rows = days
        .filter(([day, count]) => count > (byDay.get(day) ?? 0))
        .map(([day, count]) => ({ user_id: userId, day, lessons_completed: count }));
      if (rows.length > 0) {
        const { error } = await supabase
          .from("daily_activity")
          .upsert(rows, { onConflict: "user_id,day" });
        if (error) throw new Error(error.message);
      }
    }

    return { ok: true };
  });
