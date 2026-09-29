import { createServerFn } from "@tanstack/react-start";
import { DEFAULT_VISIBILITY, isVisibility, type Visibility } from "./safety";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { resolveToday } from "./client-day";
import type { ConsentState } from "./consent";
import { isDayKey, shiftDay, utcDay } from "./days";
import {
  MAX_GEMS_PER_DAY,
  MAX_XP_PER_DAY,
  activityToStore,
  boundedTotal,
  firstSyncCarryOver,
  growthAllowance,
  weeklyXpCredit,
} from "./progress-limits";
import { streakEndingAtLatest } from "./streak";
import { MAX_HINT_TOKENS, isCosmetic } from "./rewards";
import { weekStartOf } from "./weeks";

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
  /** Spendable gems: earned minus spent. */
  gems: number;
  gemsEarned: number;
  gemsGranted: number;
  gemsSpent: number;
  hintTokens: number;
  /** 0-4: the learner's tier in their friends league. */
  leagueTier: number;
  lastActiveDay: string | null;
  companion: {
    preset: string;
    palette: string;
    accessory: string;
    expression: string;
  };
  /** What the account has agreed to; `known: false` until the consent migration is applied. */
  consent: ConsentState;
  /** What friends can see. `minimal` (name and avatar) until the person turns sharing on. */
  visibility: Visibility;
};

const SELECT =
  "id, display_name, handle, invite_code, created_at, daily_goal, notify_nudges_inapp, notify_nudges_email, current_streak, longest_streak, total_xp, gems, gems_earned, gems_granted, gems_spent, hint_tokens, league_tier, last_active_day, companion_preset, companion_palette, companion_accessory, companion_expression";

export const getMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountProfile | null> => {
    // Private columns (invite code, goal, notification settings) can't be read
    // through the browser's own grant, so the owner's row is read server-side.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(SELECT)
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const { readConsent } = await import("./consent.server");
    const consent = await readConsent(context.userId);
    // Read on its own so an account still loads if the column isn't there yet.
    const { data: visible } = await supabaseAdmin
      .from("profiles")
      .select("profile_visibility")
      .eq("id", context.userId)
      .maybeSingle();
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
      gemsEarned: data.gems_earned,
      gemsGranted: data.gems_granted,
      gemsSpent: data.gems_spent,
      hintTokens: data.hint_tokens,
      leagueTier: data.league_tier,
      lastActiveDay: data.last_active_day,
      companion: {
        preset: data.companion_preset,
        palette: data.companion_palette,
        accessory: data.companion_accessory,
        expression: data.companion_expression,
      },
      consent,
      visibility: isVisibility(visible?.profile_visibility)
        ? visible.profile_visibility
        : DEFAULT_VISIBILITY,
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

const SyncInput = z.object({
  totalXp: z.number().int().min(0).max(10_000_000),
  /** Lifetime gems the device has earned (its balance plus what it has spent). */
  gemsEarned: z.number().int().min(0).max(10_000_000).optional(),
  /** The device's balance. Only builds from before the server-side wallet send this instead. */
  gems: z.number().int().min(0).max(10_000_000).optional(),
  /** Days (device-local) with activity, and how much. The server decides what it accepts. */
  history: z.record(z.string(), z.number()),
  /** Days a streak freeze covered on the device. */
  freezeLog: z.array(z.string()).max(60).default([]),
  /** The device's local today; validated against the server clock. */
  today: z.string().optional(),
  /** 2 = every day key is the device's local calendar day. Older clients omit it. */
  dayKeyVersion: z.number().int().optional(),
  /**
   * What the device spent and unlocked before it had an account. Read only on the
   * account's first sync (see firstSyncCarryOver); ignored ever after.
   */
  carryOver: z
    .object({
      gemsSpent: z.number().int().min(0).max(10_000_000),
      hintTokens: z.number().int().min(0).max(99),
      cosmetics: z.array(z.string().max(40)).max(20),
    })
    .optional(),
});

/** How many days of activity are read back to recompute the streak. */
const STREAK_WINDOW_DAYS = 400;

/**
 * Records a device's progress on the account — the ONLY way XP, gems, streaks
 * and activity change. The browser cannot write these columns (see the
 * lock_server_owned_writes migration); this function does, with the service
 * role, and decides what it believes:
 *
 * - activity days are stored only if they are real dates no timezone could still
 *   be waiting for, capped per day, and — after the account's first sync — only
 *   recent ones, so a streak can't be back-dated;
 * - the streak is recomputed here from the stored activity days, never taken from
 *   the request, so it can also go down (the old max-wins merge kept a broken
 *   streak forever);
 * - XP and lifetime gems earned only ever rise, by at most a generous per-day
 *   allowance for the time since the last sync. Gems SPENT and gems GRANTED are not
 *   accepted here: they change only when the server sells or hands out something
 *   (wallet.functions.ts, rewards.functions.ts). The one exception is the account's
 *   first sync, which carries across what the device spent and unlocked before it
 *   had an account, bounded (firstSyncCarryOver).
 * - the XP an account gains is also credited to the week it was synced in, for the
 *   friends league, except on the first sync.
 *
 * Lessons are completed in the browser, so this bounds a forged request rather
 * than proving a lesson was done.
 */
export const syncProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SyncInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const today = resolveToday(data, now);

    const { data: current, error: readError } = await admin
      .from("profiles")
      .select(
        "current_streak, longest_streak, total_xp, gems_earned, gems_granted, gems_spent, hint_tokens, last_active_day, day_key_version, progress_synced_at",
      )
      .eq("id", userId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!current) throw new Error("Your profile hasn't been created yet.");

    const lastSyncedAt = current.progress_synced_at ? new Date(current.progress_synced_at) : null;
    const days = activityToStore(data.history, { today, firstSync: lastSyncedAt === null, now });

    // First sync from a client whose history is on local days: the account's
    // UTC-keyed rows are replaced once, then the account is marked as migrated.
    const upgrading = data.dayKeyVersion === 2 && (current.day_key_version ?? 1) < 2;
    if (upgrading && days.length > 0) {
      const oldest = days[days.length - 1]![0];
      const keep = new Set(days.map(([day]) => day));
      const { data: stale } = await admin
        .from("daily_activity")
        .select("day")
        .eq("user_id", userId)
        .gte("day", oldest);
      const drop = (stale ?? []).map((row) => row.day).filter((day) => !keep.has(day));
      if (drop.length > 0) {
        await admin.from("daily_activity").delete().eq("user_id", userId).in("day", drop);
      }
    }

    if (days.length > 0) {
      const { data: existing } = await admin
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
        const { error } = await admin
          .from("daily_activity")
          .upsert(rows, { onConflict: "user_id,day" });
        if (error) throw new Error(error.message);
      }
    }

    // The streak comes from what is stored, not from what was claimed.
    const { data: stored, error: activityError } = await admin
      .from("daily_activity")
      .select("day, lessons_completed")
      .eq("user_id", userId)
      .gte("day", shiftDay(today, -STREAK_WINDOW_DAYS))
      .lte("day", shiftDay(utcDay(now), 1));
    if (activityError) throw new Error(activityError.message);
    const activeDays = (stored ?? []).filter((r) => r.lessons_completed > 0).map((r) => r.day);
    const freezeDays = data.freezeLog.filter((day) => isDayKey(day));
    const { streak, lastActiveDay } = streakEndingAtLatest(activeDays, freezeDays);

    const xpCap = growthAllowance({
      perDay: MAX_XP_PER_DAY,
      lastSyncedAt,
      activeDays: days.length,
      now,
    });
    const gemCap = growthAllowance({
      perDay: MAX_GEMS_PER_DAY,
      lastSyncedAt,
      activeDays: days.length,
      now,
    });
    const firstSync = lastSyncedAt === null;
    const earned = boundedTotal(current.gems_earned, data.gemsEarned ?? data.gems ?? 0, gemCap);
    const carry = firstSync
      ? firstSyncCarryOver({
          claim: data.carryOver,
          earnedPlusGranted: earned + current.gems_granted,
          maxHintTokens: MAX_HINT_TOKENS,
          isCosmetic,
        })
      : null;
    const next = {
      current_streak: streak,
      longest_streak: Math.max(current.longest_streak, streak),
      total_xp: boundedTotal(current.total_xp, data.totalXp, xpCap),
      gems_earned: earned,
      last_active_day: lastActiveDay,
      progress_synced_at: now.toISOString(),
      ...(upgrading ? { day_key_version: 2 } : {}),
      // Only the account's first sync may bring across what was spent before it existed.
      ...(carry
        ? {
            gems_spent: Math.max(current.gems_spent, carry.gemsSpent),
            hint_tokens: Math.max(current.hint_tokens, carry.hintTokens),
          }
        : {}),
    };
    const { error: updateError } = await admin.from("profiles").update(next).eq("id", userId);
    if (updateError) throw new Error(updateError.message);

    if (carry && carry.cosmetics.length > 0) {
      await admin.from("user_cosmetics").upsert(
        carry.cosmetics.map((item) => ({ user_id: userId, item })),
        { onConflict: "user_id,item", ignoreDuplicates: true },
      );
    }

    const credit = weeklyXpCredit({ firstSync, before: current.total_xp, after: next.total_xp });
    if (credit > 0) {
      await admin.rpc("record_weekly_xp", {
        _user: userId,
        _week: weekStartOf(today),
        _delta: credit,
      });
    }

    const spent = next.gems_spent ?? current.gems_spent;
    return {
      ok: true as const,
      streak: next.current_streak,
      longestStreak: next.longest_streak,
      totalXp: next.total_xp,
      gems: next.gems_earned + current.gems_granted - spent,
      gemsSpent: spent,
      gemsGranted: current.gems_granted,
      lastActiveDay: next.last_active_day,
    };
  });
