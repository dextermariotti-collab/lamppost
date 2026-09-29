import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { limitedFailure, type LimitedFailure } from "./rate-limit";
import { FREEZE_COST } from "./streak";

export type BuyFreezeResult =
  | { ok: true; balance: number; spent: number; granted: number }
  | {
      ok: false;
      reason: "not-enough-gems";
      message: string;
      balance: number;
      spent: number;
      granted: number;
    }
  | { ok: false; reason: "error"; message: string }
  | LimitedFailure;

/** Asks the database to spend `cost` gems; the answer is the account's truth either way. */
export async function spendGems(
  userId: string,
  cost: number,
): Promise<{ ok: boolean; balance: number; spent: number; granted: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("spend_gems", { _user: userId, _cost: cost });
  const row = data?.[0];
  if (error || !row) throw new Error(error?.message ?? "The wallet gave no answer");
  return row;
}

/**
 * Buys one streak freeze for a signed-in learner. The gems are taken here, in one
 * atomic step on the account, so a purchase can't use gems that were never earned
 * or the same gems twice (two taps, two devices). The price is held on the server:
 * the browser is not asked how much it costs. The freeze itself is held on the
 * device, which applies it only after this says yes.
 *
 * Signed-out learners have no account to spend from and keep buying locally.
 */
export const buyStreakFreeze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BuyFreezeResult> => {
    const { limiter } = await import("./rate-limit.server");
    const verdict = await limiter().enforce("buyFreeze");
    if (!verdict.ok) return limitedFailure(verdict);

    try {
      const result = await spendGems(context.userId, FREEZE_COST);
      if (result.ok) {
        return { ok: true, balance: result.balance, spent: result.spent, granted: result.granted };
      }
      return {
        ok: false,
        reason: "not-enough-gems",
        message: "You don't have enough gems for that yet.",
        balance: result.balance,
        spent: result.spent,
        granted: result.granted,
      };
    } catch (error) {
      console.error("Streak freeze purchase failed", error);
      return {
        ok: false,
        reason: "error",
        message: "That couldn't go through just now. Your gems were not spent.",
      };
    }
  });
