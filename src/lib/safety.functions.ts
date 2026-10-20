import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consentIsCurrent } from "./consent";
import { limitedFailure, type LimitedFailure } from "./rate-limit";
import { MAX_REPORT_DETAILS, USER_REPORT_REASONS, VISIBILITIES, type Visibility } from "./safety";

export const FINISH_SIGNUP =
  "Finish signing up first: accept the terms and confirm your age. Then you can connect with people.";
const UNAVAILABLE = "That couldn't be done just now. Try again in a moment.";

/** What PostgREST reports when a column doesn't exist: the consent migration isn't applied. */
const MISSING_COLUMN = new Set(["42703", "PGRST204"]);

/**
 * Why `userId` can't reach other people yet (search, invites, requests, nudges, a public name),
 * or null when they can. The browser's ConsentGate sends an account that hasn't accepted the
 * current terms to /consent; this is the same rule on the server, and it fails closed. Only a
 * database without the consent columns reads as "nothing to enforce", as everywhere else.
 * Blocking, reporting, declining and removing are never held back by it.
 */
export async function socialConsentProblem(userId: string): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("terms_version, privacy_version, age_band")
      .eq("id", userId)
      .maybeSingle();
    if (error) return MISSING_COLUMN.has(String(error.code ?? "")) ? null : UNAVAILABLE;
    if (!data) return FINISH_SIGNUP;
    const current = consentIsCurrent({
      known: true,
      termsVersion: data.terms_version,
      privacyVersion: data.privacy_version,
      acceptedAt: null,
      ageBand: data.age_band === "13-17" || data.age_band === "18+" ? data.age_band : null,
    });
    return current ? null : FINISH_SIGNUP;
  } catch (error) {
    console.error("Reading consent failed", error);
    return UNAVAILABLE;
  }
}

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
  .validator((input: unknown) => Person.parse(input))
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
  .validator((input: unknown) => Person.parse(input))
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
  .validator((input: unknown) => Report.parse(input))
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
  .validator((input: unknown) => z.object({ visibility: z.enum(VISIBILITIES) }).parse(input))
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
