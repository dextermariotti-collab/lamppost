import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { acceptableHistory } from "./client-day";
import { isDayKey, shiftDay, utcDay } from "./days";

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
      goal?: string;
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
    if (data.goal !== undefined) patch["goal"] = data.goal.slice(0, 40) || null;
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

const MAX_HISTORY_DAYS = 60;

const SyncInput = z.object({
  streak: z.number().int().min(0).max(100_000),
  longestStreak: z.number().int().min(0).max(100_000),
  totalXp: z.number().int().min(0).max(10_000_000),
  gems: z.number().int().min(0).max(10_000_000),
  lastActiveDay: z.string().nullable(),
  history: z.record(z.string(), z.number()),
  /** 2 = every day key is the device's local calendar day. Older clients omit it. */
  dayKeyVersion: z.number().int().optional(),
});

/**
 * Write-through sync of the device's progress onto the account. Merge is
 * max-wins so replaying it is safe and no streak is ever lost.
 *
 * Days are the device's LOCAL calendar days, exactly as the client keys them, so
 * the account agrees with the phone about which day an evening lesson belongs
 * to. The only date the server checks is that a day isn't further ahead than any
 * timezone on Earth could be right now.
 */
export const syncProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SyncInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: current, error: readError } = await supabase
      .from("profiles")
      .select("current_streak, longest_streak, total_xp, gems, last_active_day, day_key_version")
      .eq("id", userId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);

    // UTC+14 is the furthest ahead a local date can be of the UTC date.
    const latestAllowed = shiftDay(utcDay(), 1);
    const lastActiveDay =
      data.lastActiveDay && isDayKey(data.lastActiveDay) && data.lastActiveDay <= latestAllowed
        ? data.lastActiveDay
        : null;

    // First sync from a client whose history is on local days: the account's
    // UTC-keyed rows are replaced once, then the account is marked as migrated.
    const upgrading = data.dayKeyVersion === 2 && (current?.day_key_version ?? 1) < 2;

    const nextLastActive = upgrading
      ? lastActiveDay
      : ([lastActiveDay, current?.last_active_day].filter(Boolean).sort().pop() ?? null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        current_streak: upgrading
          ? data.streak
          : Math.max(current?.current_streak ?? 0, data.streak),
        longest_streak: Math.max(current?.longest_streak ?? 0, data.longestStreak, data.streak),
        total_xp: Math.max(current?.total_xp ?? 0, data.totalXp),
        gems: Math.max(current?.gems ?? 0, data.gems),
        last_active_day: nextLastActive,
        ...(upgrading ? { day_key_version: 2 } : {}),
      })
      .eq("id", userId);
    if (updateError) throw new Error(updateError.message);

    const days = acceptableHistory(data.history, new Date(), MAX_HISTORY_DAYS);

    if (upgrading && days.length > 0) {
      const oldest = days[days.length - 1]![0];
      const keep = new Set(days.map(([day]) => day));
      const { data: stale } = await supabase
        .from("daily_activity")
        .select("day")
        .eq("user_id", userId)
        .gte("day", oldest);
      const drop = (stale ?? []).map((row) => row.day).filter((day) => !keep.has(day));
      if (drop.length > 0) {
        await supabase.from("daily_activity").delete().eq("user_id", userId).in("day", drop);
      }
    }

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
