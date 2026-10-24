-- ROLLBACK for supabase/migrations/20261021100000_search_named_handles.sql
--
-- Puts people search back as 20261019100000_social_safety_hardening.sql left it: any part of
-- any handle matches, so searching "reader" lists accounts that still have their random default
-- handle again. That is the vulnerable state; only use it to recover from an outage, and
-- re-apply the migration as soon as possible. No code depends on the migration. What is not
-- restored: the old "learner…" default handles it replaced stay as random "reader-" handles,
-- which nobody chose and nobody needs back.
--
-- Roll this back BEFORE 20261019100000_social_safety_hardening's rollback, which drops this
-- version of the function.
--
-- This file is deliberately NOT in supabase/migrations so it is never applied automatically.
-- Run it by hand (Supabase dashboard -> SQL editor) as an administrator. It is safe to run more
-- than once.

BEGIN;

CREATE OR REPLACE FUNCTION public.search_profiles(_viewer uuid, _query text)
RETURNS TABLE (
  id uuid,
  display_name text,
  handle text,
  companion_preset text,
  companion_palette text,
  companion_accessory text,
  companion_expression text
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.handle, p.companion_preset, p.companion_palette,
         p.companion_accessory, p.companion_expression
    FROM public.profiles p
   WHERE _viewer IS NOT NULL
     AND p.id <> _viewer
     AND char_length(btrim(coalesce(_query, ''))) >= 3
     AND NOT public.blocked_between(_viewer, p.id)
     AND p.handle ILIKE
       '%' || replace(replace(replace(btrim(_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
   ORDER BY p.handle
   LIMIT 12;
$$;
REVOKE ALL ON FUNCTION public.search_profiles(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_profiles(uuid, text) TO service_role;

COMMIT;
