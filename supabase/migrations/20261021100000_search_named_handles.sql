-- People search finds a default handle only when the whole handle is typed.
--
-- Every new account gets "reader-" and eight random characters until the person picks a handle
-- of their own (20261019100000_social_safety_hardening.sql). Search matched any part of a
-- handle, so searching "reader" listed up to 12 strangers who had never chosen to be found, and
-- varying the next characters listed the rest, each one a friend request away. Many of them are
-- 13 to 17. The privacy policy says only someone who knows your handle or invite code can send
-- you a request.
--
-- A handle that starts with "reader-" is now returned only when the search is that whole handle
-- (any case, spaces trimmed): every default handle, and the rare chosen one that copies the
-- format. Any other handle still matches any part of it. Everything else is as before: handles
-- only, three characters at least, never the searcher or a blocked pair, at most 12, server only.
--
-- The first signup trigger's own defaults were never chosen either: "learner" when the email
-- gave it nothing to build from, "learner" and four random characters when that was taken, and
-- "learner" and six from the August backfill. 20261019100000 kept them, so searching "learner"
-- still listed them. They become random "reader-" handles here, so the one rule above covers
-- every default handle. Safe to run again: only handles still in that form are touched.
--
-- Rollback: docs/rollback/20261021100000_search_named_handles.down.sql. Roll this back before
-- 20261019100000_social_safety_hardening's rollback.

DO $$
DECLARE
  r record;
  candidate text;
BEGIN
  FOR r IN
    SELECT id FROM public.profiles
     WHERE handle ~ '^learner([a-hjkmnp-z2-9]{4}|[a-hjkmnp-z2-9]{6})?$'
  LOOP
    LOOP
      candidate := 'reader-' || public.random_code(8);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(handle) = candidate);
    END LOOP;
    UPDATE public.profiles SET handle = candidate WHERE id = r.id;
  END LOOP;
END
$$;

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
     AND CASE
           WHEN lower(p.handle) LIKE 'reader-%'
             THEN lower(p.handle) = lower(btrim(_query))
           ELSE p.handle ILIKE
             '%' || replace(replace(replace(btrim(_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
         END
   ORDER BY p.handle
   LIMIT 12;
$$;
REVOKE ALL ON FUNCTION public.search_profiles(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_profiles(uuid, text) TO service_role;
