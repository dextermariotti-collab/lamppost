import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { limitedFailure, type LimitedFailure } from "./rate-limit";
import { MAX_REPORT_DETAILS, USER_REPORT_REASONS, VISIBILITIES, type Visibility } from "./safety";

/**
 * Blocking, reporting and profile visibility. All of it is written by the server with the
 * service role: the browser roles hold no write privilege on any of these tables, so a
 * blocked person can neither lift a block nor see that it exists.
 */

const Person = z.object({ userId: z.string().uuid() });
const Report = z.object({
  userId: z.string().uuid(),
  reason: z.enum(USER_REPORT_REASONS.map((r) => r.value) as [string, ...string[]]),
  details: z.string().max(MAX_REPORT_DETAILS).optional(),
});

type Done = { ok: true } | { ok: false; reason: string } | LimitedFailure;

const failed = (reason: string): Done => ({ ok: false, reason });

async function guard(): Promise<Done | null> {
  const { limiter } = await import("./rate-limit.server");
  const verdict = await limiter().enforce("safety");
  return verdict.ok ? null : limitedFailure(verdict);
}

export const blockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Person.parse(input))
  .handler(async ({ data, context }): Promise<Done> => {
    if (data.userId === context.userId) return failed("You can't block yourself.");
    const limited = await guard();
    if (limited) return limited;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.rpc("block_user", {
        _blocker: context.userId,
        _blocked: data.userId,
      });
      if (error) throw error;
      return { ok: true };
    } catch (error) {
      console.error("Blocking failed", error);
      return failed("That couldn't be done just now. Try again in a moment.");
    }
  });

export const unblockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Person.parse(input))
  .handler(async ({ data, context }): Promise<Done> => {
    const limited = await guard();
    if (limited) return limited;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("user_blocks")
        .delete()
        .eq("blocker_id", context.userId)
        .eq("blocked_id", data.userId);
      if (error) throw error;
      return { ok: true };
    } catch (error) {
      console.error("Unblocking failed", error);
      return failed("That couldn't be done just now. Try again in a moment.");
    }
  });

export type BlockedPerson = {
  id: string;
  displayName: string | null;
  handle: string;
  blockedAt: string;
};

/** Who the caller has blocked, most recent first. Never who has blocked them. */
export const listBlockedPeople = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BlockedPerson[]> => {
    const { data: blocks, error } = await context.supabase
      .from("user_blocks")
      .select("blocked_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = blocks ?? [];
    if (rows.length === 0) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, handle")
      .in(
        "id",
        rows.map((b) => b.blocked_id),
      );
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    return rows.flatMap((b) => {
      const p = byId.get(b.blocked_id);
      return p
        ? [{ id: p.id, displayName: p.display_name, handle: p.handle, blockedAt: b.created_at }]
        : [];
    });
  });

export const reportUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Report.parse(input))
  .handler(async ({ data, context }): Promise<Done> => {
    if (data.userId === context.userId) return failed("You can't report yourself.");
    const limited = await guard();
    if (limited) return limited;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("user_reports").insert({
        reporter_id: context.userId,
        reported_user_id: data.userId,
        reason: data.reason,
        details: data.details?.trim() || null,
      });
      if (error) throw error;
      return { ok: true };
    } catch (error) {
      console.error("Reporting failed", error);
      return failed("That couldn't be sent just now. Try again in a moment.");
    }
  });

export const setProfileVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ visibility: z.enum(VISIBILITIES) }).parse(input))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; visibility: Visibility } | { ok: false; reason: string }> => {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ profile_visibility: data.visibility })
          .eq("id", context.userId);
        if (error) throw error;
        return { ok: true, visibility: data.visibility };
      } catch (error) {
        console.error("Saving visibility failed", error);
        return { ok: false, reason: "That couldn't be saved just now. Try again in a moment." };
      }
    },
  );
