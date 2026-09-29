import { UNKNOWN_CONSENT, type ConsentState } from "./consent";

/**
 * Reads what an account has accepted. This is a separate query from the main profile
 * so a database that hasn't had the consent migration yet answers "unknown" (and
 * nothing is enforced) instead of breaking the whole profile.
 */
export async function readConsent(userId: string): Promise<ConsentState> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("terms_version, privacy_version, terms_accepted_at, age_band")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return UNKNOWN_CONSENT;
  return {
    known: true,
    termsVersion: data.terms_version,
    privacyVersion: data.privacy_version,
    acceptedAt: data.terms_accepted_at,
    ageBand: data.age_band === "13-17" || data.age_band === "18+" ? data.age_band : null,
  };
}
