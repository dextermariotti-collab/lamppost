import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRIVACY_VERSION, TERMS_VERSION } from "./legal-config";
import { limitedFailure, type LimitedFailure } from "./rate-limit";

const Input = z.object({
  termsVersion: z.string().max(40),
  privacyVersion: z.string().max(40),
  ageBand: z.enum(["13-17", "18+"]),
  guardianConfirmed: z.boolean(),
});

export type RecordConsentResult =
  { ok: true; acceptedAt: string } | { ok: false; reason: string } | LimitedFailure;

/**
 * Records that the signed-in person accepted the Terms and Privacy Policy and gave an
 * age band. The time is the database's, never the browser's, and only the CURRENT
 * versions are accepted: a page that was open while the text changed is asked to
 * reload rather than recording agreement to words the person didn't see.
 */
export const recordConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<RecordConsentResult> => {
    if (data.termsVersion !== TERMS_VERSION || data.privacyVersion !== PRIVACY_VERSION) {
      return {
        ok: false,
        reason:
          "The Terms or Privacy Policy changed while this page was open. Reload it to read the latest.",
      };
    }
    if (data.ageBand === "13-17" && !data.guardianConfirmed) {
      return {
        ok: false,
        reason: "A parent or guardian's permission is needed for an account at your age.",
      };
    }

    const { limiter } = await import("./rate-limit.server");
    const verdict = await limiter().enforce("consent");
    if (!verdict.ok) return limitedFailure(verdict);

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: stamp, error } = await supabaseAdmin.rpc("record_consent", {
        _user: context.userId,
        _terms: data.termsVersion,
        _privacy: data.privacyVersion,
        _age_band: data.ageBand,
        _guardian: data.guardianConfirmed,
      });
      if (error || !stamp) throw new Error(error?.message ?? "No timestamp came back");
      return { ok: true, acceptedAt: stamp };
    } catch (error) {
      console.error("Recording consent failed", error);
      return { ok: false, reason: "That couldn't be saved just now. Try again in a moment." };
    }
  });
