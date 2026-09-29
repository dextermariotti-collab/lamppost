-- ROLLBACK for supabase/migrations/20260930100000_consent_and_age.sql
--
-- Removes the consent history table, the recording function and the consent/age
-- columns on profiles. What is lost is the record of who accepted which version of
-- the Terms and Privacy Policy and when: export consent_records first if you need to
-- keep that evidence (SELECT * FROM public.consent_records).
--
-- Run it together with reverting the code that reads these columns. The app treats
-- the consent columns as optional, so the app keeps working, but people would then
-- see the consent screen again if the migration is re-applied.
--
-- This file is deliberately NOT in supabase/migrations so it is never applied
-- automatically. Run it by hand (Lovable Cloud -> Database -> SQL editor) as an
-- administrator. It is safe to run more than once.

DROP FUNCTION IF EXISTS public.record_consent(uuid, text, text, text, boolean);
DROP TABLE IF EXISTS public.consent_records;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_teen_has_guardian;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_age_band_valid;
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS guardian_confirmed,
  DROP COLUMN IF EXISTS age_band,
  DROP COLUMN IF EXISTS privacy_version,
  DROP COLUMN IF EXISTS terms_accepted_at,
  DROP COLUMN IF EXISTS terms_version;
