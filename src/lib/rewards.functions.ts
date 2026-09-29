import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TodayInput, resolveToday } from "./client-day";
import { limitedFailure, type LimitedFailure } from "./rate-limit";
import {
  CHEST_DAILY_CAP,
  HINT_COST,
  HINT_OVERFLOW_GEMS,
  MAX_HINT_TOKENS,
  chestsAvailable,
  cosmeticById,
  rollChest,
  secureRandom,
  type ChestRecord,
} from "./rewards";
import type { RewardsSnapshot } from "./rewards-state";

/**
 * Rewards for a signed-in learner. The account owns the gems, hint tokens and
 * cosmetics; these functions do the buying and opening in one atomic database step
 * each, with prices, odds and daily limits held here, never taken from the request.
 * A signed-out learner has no account, and keeps doing all of this on the device.
 */

type Refusal = { ok: false; reason: string; message: string };
export type OpenChestResult =
  { ok: true; record: ChestRecord; snapshot: RewardsSnapshot } | Refusal | LimitedFailure;
export type PurchaseResult =
  | { ok: true; snapshot: RewardsSnapshot }
  | (Refusal & { snapshot: RewardsSnapshot | null })
  | LimitedFailure;

const Today = TodayInput;
const SourceInput = z.object({
  today: z.string().optional(),
  source: z.enum(["lesson", "review", "challenge"]),
});

/** Everything the Rewards screen and the device need to agree with the account. */
export async function readRewardsSnapshot(userId: string, today: string): Promise<RewardsSnapshot> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [profile, cosmetics, opened, history] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("gems_spent, gems_granted, hint_tokens")
      .eq("id", userId)
      .maybeSingle(),
    supabaseAdmin.from("user_cosmetics").select("item").eq("user_id", userId),
    supabaseAdmin
      .from("reward_chests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("opened_on", today),
    supabaseAdmin
      .from("reward_chests")
      .select("opened_on, source, kind, amount, converted")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  return {
    spent: profile.data?.gems_spent ?? 0,
    granted: profile.data?.gems_granted ?? 0,
    hintTokens: profile.data?.hint_tokens ?? 0,
    cosmetics: (cosmetics.data ?? []).map((row) => row.item),
    chests: { day: today, opened: opened.count ?? 0 },
    history: (history.data ?? []).map((row) => ({
      day: row.opened_on,
      source: row.source as ChestRecord["source"],
      kind: row.kind as ChestRecord["kind"],
      amount: row.amount,
      converted: row.converted,
    })),
  };
}

export const getRewards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Today.parse(input))
  .handler(async ({ data, context }): Promise<RewardsSnapshot> => {
    return await readRewardsSnapshot(context.userId, resolveToday(data));
  });

const REASONS: Record<string, string> = {
  "daily-limit":
    "That's all the chests for today. There will be more when you finish something tomorrow.",
  "not-enough-gems": "You don't have enough gems for that yet.",
  "pouch-full": "Your hint pouch is full.",
  owned: "You already have that.",
  "no-profile": "Your profile hasn't been created yet.",
};

const refusal = (reason: string): Refusal => ({
  ok: false,
  reason,
  message: REASONS[reason] ?? "That couldn't go through just now. Nothing was spent.",
});

/**
 * Opens one reward chest. What it may hold is fixed (rewards.ts) and rolled here
 * with a secure random source. How many can be opened today is decided by the
 * database, from how much the account has synced for today: one chest for each
 * thing done, three at most, so it cannot be opened over and over.
 */
export const openChest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SourceInput.parse(input))
  .handler(async ({ data, context }): Promise<OpenChestResult> => {
    const { limiter } = await import("./rate-limit.server");
    const verdict = await limiter().enforce("openChest");
    if (!verdict.ok) return limitedFailure(verdict);

    const today = resolveToday(data);
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: activity } = await supabaseAdmin
        .from("daily_activity")
        .select("lessons_completed")
        .eq("user_id", context.userId)
        .eq("day", today)
        .maybeSingle();
      const allowed = chestsAvailable({
        doneToday: activity?.lessons_completed ?? 0,
        openedToday: 0,
      });
      if (allowed === 0) return refusal("daily-limit");

      const prize = rollChest(secureRandom);
      const { data: rows, error } = await supabaseAdmin.rpc("grant_chest", {
        _user: context.userId,
        _day: today,
        _source: data.source,
        _kind: prize.kind,
        _amount: prize.amount,
        _cap: Math.min(allowed, CHEST_DAILY_CAP),
        _max_tokens: MAX_HINT_TOKENS,
        _fallback_gems: HINT_OVERFLOW_GEMS,
      });
      const row = rows?.[0];
      if (error || !row) throw new Error(error?.message ?? "The chest gave no answer");
      if (!row.ok) return refusal(row.reason ?? "daily-limit");

      return {
        ok: true,
        record: {
          day: today,
          source: data.source,
          kind: row.kind as ChestRecord["kind"],
          amount: row.amount,
          converted: row.converted,
        },
        snapshot: await readRewardsSnapshot(context.userId, today),
      };
    } catch (error) {
      console.error("Opening a chest failed", error);
      return refusal("error");
    }
  });

/** Buys a hint token with gems at the server-held price. */
export const buyHintToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Today.parse(input))
  .handler(async ({ data, context }): Promise<PurchaseResult> => {
    const { limiter } = await import("./rate-limit.server");
    const verdict = await limiter().enforce("shop");
    if (!verdict.ok) return limitedFailure(verdict);
    const today = resolveToday(data);
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin.rpc("buy_hint_token", {
        _user: context.userId,
        _cost: HINT_COST,
        _max: MAX_HINT_TOKENS,
      });
      const row = rows?.[0];
      if (error || !row) throw new Error(error?.message ?? "The shop gave no answer");
      const snapshot = await readRewardsSnapshot(context.userId, today);
      return row.ok ? { ok: true, snapshot } : { ...refusal(row.reason ?? "error"), snapshot };
    } catch (error) {
      console.error("Buying a hint token failed", error);
      return { ...refusal("error"), snapshot: null };
    }
  });

/** Uses one hint token. The device applies the hint only once this says yes. */
export const spendHintToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; hintTokens: number }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin.rpc("use_hint_token", {
        _user: context.userId,
      });
      const row = rows?.[0];
      if (error || !row) throw new Error(error?.message ?? "No answer");
      return { ok: row.ok, hintTokens: row.hint_tokens };
    } catch (error) {
      console.error("Using a hint token failed", error);
      return { ok: false, hintTokens: 0 };
    }
  });

const CosmeticInput = z.object({ today: z.string().optional(), id: z.string().min(1).max(40) });

/** Unlocks a companion cosmetic with gems at the server-held price. */
export const unlockCosmetic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CosmeticInput.parse(input))
  .handler(async ({ data, context }): Promise<PurchaseResult> => {
    const item = cosmeticById(data.id);
    if (!item) return { ...refusal("error"), snapshot: null };
    const { limiter } = await import("./rate-limit.server");
    const verdict = await limiter().enforce("shop");
    if (!verdict.ok) return limitedFailure(verdict);
    const today = resolveToday(data);
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin.rpc("unlock_cosmetic", {
        _user: context.userId,
        _item: item.id,
        _cost: item.cost,
      });
      const row = rows?.[0];
      if (error || !row) throw new Error(error?.message ?? "The shop gave no answer");
      const snapshot = await readRewardsSnapshot(context.userId, today);
      return row.ok ? { ok: true, snapshot } : { ...refusal(row.reason ?? "error"), snapshot };
    } catch (error) {
      console.error("Unlocking a cosmetic failed", error);
      return { ...refusal("error"), snapshot: null };
    }
  });
