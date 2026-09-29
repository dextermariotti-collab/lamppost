-- Consent and age band.
--
-- Records that an account holder accepted the Terms and the Privacy Policy (which
-- version, and when, by the SERVER's clock) and which age band they gave at signup.
-- The date of birth itself is never stored: only "13-17" or "18+", plus, for 13-17,
-- that they confirmed a parent or guardian's permission. Someone under 13 gets no
-- account and nothing they entered is kept anywhere.
--
-- Additive only: new nullable columns and a new table. Nothing existing changes.
-- The browser roles get no access to any of it; the app's server functions write it
-- with the service role (record_consent below is the only writer).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_version text,
  ADD COLUMN IF NOT EXISTS age_band text,
  ADD COLUMN IF NOT EXISTS guardian_confirmed boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_age_band_valid') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_age_band_valid CHECK (age_band IS NULL OR age_band IN ('13-17', '18+'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_teen_has_guardian') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_teen_has_guardian
      CHECK (age_band IS DISTINCT FROM '13-17' OR guardian_confirmed);
  END IF;
END
$$;

-- Every acceptance, kept as history: the profile columns hold only the latest.
CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  age_band text NOT NULL CHECK (age_band IN ('13-17', '18+')),
  guardian_confirmed boolean NOT NULL DEFAULT false,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_records_teen_has_guardian CHECK (age_band <> '13-17' OR guardian_confirmed)
);
CREATE INDEX IF NOT EXISTS consent_records_user_idx
  ON public.consent_records (user_id, accepted_at DESC);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.consent_records FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.consent_records TO service_role;

-- The one writer. Stamps the time itself, refuses an unknown age band or a teen
-- without the guardian confirmation, updates the profile and appends the history in
-- one statement's worth of transaction. Returns the moment it recorded.
CREATE OR REPLACE FUNCTION public.record_consent(
  _user uuid,
  _terms text,
  _privacy text,
  _age_band text,
  _guardian boolean
)
RETURNS timestamptz
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  stamp timestamptz := now();
BEGIN
  IF _terms IS NULL OR length(_terms) NOT BETWEEN 1 AND 40
     OR _privacy IS NULL OR length(_privacy) NOT BETWEEN 1 AND 40 THEN
    RAISE EXCEPTION 'invalid version' USING ERRCODE = '22023';
  END IF;
  IF _age_band IS NULL OR _age_band NOT IN ('13-17', '18+') THEN
    RAISE EXCEPTION 'invalid age band' USING ERRCODE = '22023';
  END IF;
  IF _age_band = '13-17' AND NOT COALESCE(_guardian, false) THEN
    RAISE EXCEPTION 'guardian confirmation required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
     SET terms_version = _terms,
         privacy_version = _privacy,
         terms_accepted_at = stamp,
         age_band = _age_band,
         guardian_confirmed = COALESCE(_guardian, false) AND _age_band = '13-17'
   WHERE id = _user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no such profile' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.consent_records (user_id, terms_version, privacy_version, age_band,
                                      guardian_confirmed, accepted_at)
  VALUES (_user, _terms, _privacy, _age_band, COALESCE(_guardian, false) AND _age_band = '13-17', stamp);
  RETURN stamp;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_consent(uuid, text, text, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_consent(uuid, text, text, text, boolean) TO service_role;
