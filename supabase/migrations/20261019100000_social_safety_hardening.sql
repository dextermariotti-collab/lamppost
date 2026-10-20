-- Social safety hardening.
--
-- An audit of what one signed-in stranger could do with nothing but the public key found:
--
--   1. Handles and names nobody chose. A new account's handle was built from the email address
--      (jane.smith.2011@... became "janesmith2011") or from Google's full name, the full name
--      became the display name, and any signed-in user could search display names and handles
--      with two letters, straight over /rpc, with no limit. New accounts now get a random handle
--      ("reader-" and eight random characters) and no display name until the person picks one;
--      handles that were built from an email or a full name are replaced, and full names copied
--      from Google are cleared. Sign-up metadata is ignored: anyone can put anything in it.
--      Search matches handles only, needs three characters, and only the server can run it (it
--      counts searches against a limit first).
--   2. Free text from strangers. The browser could write its own display name and handle with
--      no checks (a 9,600-character name and a "Lamppost Team" handle got through) and send
--      friend requests directly. Both are now written by the server only, which checks them;
--      CHECK constraints bound what can be stored whoever writes it.
--   3. Who is friends with whom. are_friends, has_friend_link and shares_progress_with answered
--      for any two people. They now answer only when the caller is one of the two (or is the
--      server); has_friend_link was unused and is dropped.
--   4. Nudges for any day, to anyone with nudges turned off, naming any shared streak.
--   5. Content reports of any size, filed already marked "actioned".
--   6. A debater could read the other side's answer and score before writing their own.
--   7. Reports about a person vanished when that person deleted their account.
--   8. A job lease could be released by a worker whose own lease had expired.
--   9. The profile guard trigger listed the server-owned columns by hand and had fallen behind;
--      it now names the few columns the browser may change and refuses everything else.
--  10. The badge for a seven-day shared streak was called "Two-week flame"; it is renamed to
--      match its rule.
--
-- Rollback: docs/rollback/20261019100000_social_safety_hardening.down.sql. Roll this back
-- before any older migration's rollback.

-- ============ 1. random handles, no borrowed names ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate text;
BEGIN
  LOOP
    candidate := 'reader-' || public.random_code(8);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(handle) = candidate);
  END LOOP;

  INSERT INTO public.profiles (id, display_name, handle, invite_code)
  VALUES (NEW.id, NULL, candidate, public.random_code(10))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Replace a handle the old signup trigger built from the email address or Google's full name
-- (the same recipe it used: letters and digits only, 16 at most, or 12 plus four random
-- characters when taken), and any handle the new format below would refuse. A handle the
-- person picked, or one built from a display name they typed at signup, is kept.
DO $$
DECLARE
  r record;
  candidate text;
BEGIN
  FOR r IN
    SELECT p.id
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.id
      CROSS JOIN LATERAL (
        SELECT lower(regexp_replace(
                 coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, ''), '@', 1)),
                 '[^a-zA-Z0-9]', '', 'g')) AS base
      ) d
     WHERE p.handle IS NULL
        OR p.handle !~ '^[a-z0-9_-]{3,24}$'
        OR (u.raw_user_meta_data ->> 'display_name' IS NULL
            AND length(d.base) >= 3
            AND (p.handle = substr(d.base, 1, 16)
                 OR p.handle ~ ('^' || substr(d.base, 1, 12) || '[a-z0-9]{4}$')))
  LOOP
    LOOP
      candidate := 'reader-' || public.random_code(8);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(handle) = candidate);
    END LOOP;
    UPDATE public.profiles SET handle = candidate WHERE id = r.id;
  END LOOP;
END
$$;

-- A display name copied from Google's full name was never chosen for Lamppost.
UPDATE public.profiles p
   SET display_name = NULL
  FROM auth.users u
 WHERE u.id = p.id
   AND p.display_name IS NOT NULL
   AND u.raw_user_meta_data ->> 'display_name' IS NULL
   AND p.display_name = u.raw_user_meta_data ->> 'full_name';

UPDATE public.profiles
   SET display_name = NULL
 WHERE display_name IS NOT NULL
   AND (char_length(display_name) NOT BETWEEN 1 AND 40 OR btrim(display_name) = '');

UPDATE public.profiles
   SET daily_goal = least(greatest(daily_goal, 1), 10)
 WHERE daily_goal NOT BETWEEN 1 AND 10;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_handle_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_handle_format CHECK (handle ~ '^[a-z0-9_-]{3,24}$');
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_display_name_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_length
  CHECK (display_name IS NULL OR (char_length(display_name) BETWEEN 1 AND 40 AND btrim(display_name) <> ''));
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_daily_goal_range;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_daily_goal_range CHECK (daily_goal BETWEEN 1 AND 10);

-- People search: handles only, three characters at least, run by the server for a named viewer
-- (it counts the search against the caller's limit first). The always-NULL streak column is gone.
DROP FUNCTION IF EXISTS public.search_profiles(text);
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

-- ============ 2. names, handles and friend requests are written by the server ============
REVOKE UPDATE (display_name, handle) ON public.profiles FROM authenticated;

REVOKE INSERT ON public.friendships FROM authenticated;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;

-- The browser may change only these columns of its own row; anything else, including a column
-- added later, is refused even if a grant is widened by mistake. Compared as JSON so a column
-- that a rollback has removed doesn't break the trigger.
CREATE OR REPLACE FUNCTION public.guard_profile_server_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  browser_writable constant text[] := ARRAY[
    'daily_goal', 'goal', 'notify_nudges_inapp', 'notify_nudges_email',
    'companion_preset', 'companion_palette', 'companion_accessory', 'companion_expression',
    'onboarding_completed', 'updated_at'
  ];
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND (to_jsonb(NEW) - browser_writable) IS DISTINCT FROM (to_jsonb(OLD) - browser_writable) THEN
    RAISE EXCEPTION 'Names, handles, XP, streaks and other progress are updated by the server only'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_profile_server_columns() FROM PUBLIC, anon, authenticated;

-- ============ 3. friendship questions are answered only for the people in them ============
-- A signed-in caller must be one of the two. The server (no signed-in user) may ask about anyone:
-- the league reads its standings that way. Policies always pass auth.uid(), so they still work.
CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM _a AND auth.uid() IS DISTINCT FROM _b
      THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.friendships
       WHERE status = 'accepted'
         AND ((requester_id = _a AND addressee_id = _b) OR (requester_id = _b AND addressee_id = _a))
    )
  END;
$$;
REVOKE ALL ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.shares_progress_with(_viewer uuid, _owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM _viewer AND auth.uid() IS DISTINCT FROM _owner
      THEN false
    ELSE public.are_friends(_viewer, _owner)
     AND EXISTS (
       SELECT 1 FROM public.profiles
        WHERE id = _owner AND profile_visibility = 'friends'
     )
  END;
$$;
REVOKE ALL ON FUNCTION public.shares_progress_with(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shares_progress_with(uuid, uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.has_friend_link(uuid, uuid);

-- ============ 4. nudges: a friend, today, who takes nudges, about the pair's own streak ============
CREATE OR REPLACE FUNCTION public.can_nudge(_from uuid, _to uuid, _shared_streak uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.uid() IS NULL OR auth.uid() = _from)
     AND public.are_friends(_from, _to)
     AND EXISTS (SELECT 1 FROM public.profiles WHERE id = _to AND notify_nudges_inapp)
     AND (
       _shared_streak IS NULL
       OR EXISTS (
         SELECT 1
           FROM public.shared_streaks s
           JOIN public.friendships f ON f.id = s.friendship_id
          WHERE s.id = _shared_streak
            AND ((f.requester_id = _from AND f.addressee_id = _to)
              OR (f.requester_id = _to AND f.addressee_id = _from))
       )
     );
$$;
REVOKE ALL ON FUNCTION public.can_nudge(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_nudge(uuid, uuid, uuid) TO authenticated, service_role;

-- `day` is the sender's local day, which is never more than a day from the server's UTC date.
DROP POLICY IF EXISTS "Sender can create nudges" ON public.nudges;
DROP POLICY IF EXISTS "Sender can nudge a friend today" ON public.nudges;
CREATE POLICY "Sender can nudge a friend today"
  ON public.nudges FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = from_user_id
    AND day BETWEEN (now() AT TIME ZONE 'utc')::date - 1 AND (now() AT TIME ZONE 'utc')::date + 1
    AND public.can_nudge(auth.uid(), to_user_id, shared_streak_id)
  );

-- ============ 5. content reports: bounded, and filed as open ============
REVOKE INSERT ON public.content_reports FROM authenticated;
GRANT INSERT (user_id, course_slug, course_topic, lesson_index, lesson_title, reason, details, excerpt)
  ON public.content_reports TO authenticated;

-- NOT VALID: reports already filed are safety records and are kept as they are.
ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_lengths;
ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_lengths CHECK (
    char_length(reason) <= 40
    AND (details IS NULL OR char_length(details) <= 2000)
    AND (excerpt IS NULL OR char_length(excerpt) <= 4000)
    AND (course_slug IS NULL OR char_length(course_slug) <= 120)
    AND (course_topic IS NULL OR char_length(course_topic) <= 200)
    AND (lesson_title IS NULL OR char_length(lesson_title) <= 200)
  ) NOT VALID;

-- ============ 6. debates: answers, scores and tips are read through the server ============
-- The server shows a participant their own answer and grade, and the other side's only once
-- both have answered. The browser role keeps the columns it needs to list a debate and mark a
-- result seen.
REVOKE SELECT ON public.debates FROM authenticated;
GRANT SELECT (
  id, challenger_id, opponent_id, lesson_id, topic, prompt, passage,
  challenger_side, opponent_side, max_score, status,
  challenger_seen_result, opponent_seen_result, created_at, updated_at
) ON public.debates TO authenticated;

-- ============ 7. reports about a person outlive that person's account ============
ALTER TABLE public.user_reports ALTER COLUMN reported_user_id DROP NOT NULL;
ALTER TABLE public.user_reports DROP CONSTRAINT IF EXISTS user_reports_reported_user_id_fkey;
ALTER TABLE public.user_reports
  ADD CONSTRAINT user_reports_reported_user_id_fkey
  FOREIGN KEY (reported_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============ 8. only the holder of a lease can release it ============
-- A caller passes a token of its own when it takes a lease and the same token to release it.
-- Callers that pass none keep working as before among themselves, but can never release a lease
-- taken with a token.
ALTER TABLE public.server_locks ADD COLUMN IF NOT EXISTS holder text;

DROP FUNCTION IF EXISTS public.acquire_lock(text, integer);
DROP FUNCTION IF EXISTS public.release_lock(text);

CREATE OR REPLACE FUNCTION public.acquire_lock(_key text, _ttl_seconds integer, _holder text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  got boolean;
BEGIN
  INSERT INTO public.server_locks AS l (key, expires_at, holder)
  VALUES (left(_key, 96), now() + make_interval(secs => greatest(_ttl_seconds, 1)), left(_holder, 96))
  ON CONFLICT (key) DO UPDATE SET expires_at = EXCLUDED.expires_at, holder = EXCLUDED.holder
    WHERE l.expires_at < now()
  RETURNING true INTO got;
  RETURN coalesce(got, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_lock(_key text, _holder text DEFAULT NULL)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM public.server_locks
   WHERE key = left(_key, 96) AND holder IS NOT DISTINCT FROM left(_holder, 96);
$$;

REVOKE EXECUTE ON FUNCTION public.acquire_lock(text, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_lock(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_lock(text, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_lock(text, text) TO service_role;

-- ============ 9. a project-level helper the API roles could call ============
-- public.rls_auto_enable() exists only on the live project (Supabase created it), not in these
-- migrations, so look it up instead of naming it.
DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'rls_auto_enable'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;
END
$$;

-- ============ 10. a badge named for what it rewards ============
UPDATE public.achievements
   SET name = 'Week-long flame'
 WHERE code = 'shared_streak_7' AND name = 'Two-week flame';
