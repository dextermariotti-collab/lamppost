-- ROLLBACK for supabase/migrations/20261019100000_social_safety_hardening.sql
--
-- Puts the rules back as they were before that migration: the browser can again set its own
-- display name and handle and send friend requests directly, people search matches display
-- names from two letters and runs as the signed-in user, anyone signed in can ask whether any
-- two people are friends, nudges and content reports are unchecked, a debater can read the
-- other side's answer early, reports about a person are deleted with that person, and any
-- worker can release any lease. That is the vulnerable state; only use it to recover from an
-- outage, together with reverting the code that needs the migration (profile.functions.ts,
-- friends.functions.ts, account-data.functions.ts and the debate and lock callers), and
-- re-apply the migration as soon as possible.
--
-- What is lost: reports about people whose accounts were deleted after the migration (they are
-- kept unlinked, and the old rule can't hold a report about nobody). Export them first if you
-- need them: SELECT * FROM public.user_reports WHERE reported_user_id IS NULL;
-- What is not restored: handles and display names the migration replaced or cleared stay as
-- they are now (the old values were personal data and are not kept anywhere).
--
-- Roll this back BEFORE any older migration's rollback: those expect has_friend_link and the
-- original lock functions, which this puts back.
--
-- This file is deliberately NOT in supabase/migrations so it is never applied automatically.
-- Run it by hand (Supabase dashboard -> SQL editor) as an administrator. It is safe to run more
-- than once.

BEGIN;

-- ---- 10. the badge's old name
UPDATE public.achievements
   SET name = 'Two-week flame'
 WHERE code = 'shared_streak_7' AND name = 'Week-long flame';

-- ---- 9. the project's own helper, as the project created it
DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'rls_auto_enable'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC, anon, authenticated', f);
  END LOOP;
END
$$;

-- ---- 8. leases: the original functions, no holder
DROP FUNCTION IF EXISTS public.acquire_lock(text, integer, text);
DROP FUNCTION IF EXISTS public.release_lock(text, text);

CREATE OR REPLACE FUNCTION public.acquire_lock(_key text, _ttl_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  got boolean;
BEGIN
  INSERT INTO public.server_locks AS l (key, expires_at)
  VALUES (left(_key, 96), now() + make_interval(secs => greatest(_ttl_seconds, 1)))
  ON CONFLICT (key) DO UPDATE SET expires_at = EXCLUDED.expires_at
    WHERE l.expires_at < now()
  RETURNING true INTO got;
  RETURN coalesce(got, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_lock(_key text)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM public.server_locks WHERE key = left(_key, 96);
$$;

REVOKE EXECUTE ON FUNCTION public.acquire_lock(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_lock(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_lock(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_lock(text) TO service_role;

ALTER TABLE public.server_locks DROP COLUMN IF EXISTS holder;

-- ---- 7. reports about a person go with that person again
DELETE FROM public.user_reports WHERE reported_user_id IS NULL;
ALTER TABLE public.user_reports DROP CONSTRAINT IF EXISTS user_reports_reported_user_id_fkey;
ALTER TABLE public.user_reports
  ADD CONSTRAINT user_reports_reported_user_id_fkey
  FOREIGN KEY (reported_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_reports ALTER COLUMN reported_user_id SET NOT NULL;

-- ---- 6. debates readable in full by both participants
REVOKE SELECT ON public.debates FROM authenticated;
GRANT SELECT ON public.debates TO authenticated;

-- ---- 5. content reports
ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_lengths;
REVOKE INSERT ON public.content_reports FROM authenticated;
GRANT INSERT ON public.content_reports TO authenticated;

-- ---- 4. nudges
DROP POLICY IF EXISTS "Sender can nudge a friend today" ON public.nudges;
DROP POLICY IF EXISTS "Sender can create nudges" ON public.nudges;
CREATE POLICY "Sender can create nudges"
  ON public.nudges FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id AND public.are_friends(auth.uid(), to_user_id));
DROP FUNCTION IF EXISTS public.can_nudge(uuid, uuid, uuid);

-- ---- 3. friendship questions answered for anyone
CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = _a AND addressee_id = _b) OR (requester_id = _b AND addressee_id = _a))
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_progress_with(_viewer uuid, _owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.are_friends(_viewer, _owner)
     AND EXISTS (
       SELECT 1 FROM public.profiles
        WHERE id = _owner AND profile_visibility = 'friends'
     );
$$;

CREATE OR REPLACE FUNCTION public.has_friend_link(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (requester_id = _a AND addressee_id = _b) OR (requester_id = _b AND addressee_id = _a)
  );
$$;
REVOKE ALL ON FUNCTION public.has_friend_link(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_friend_link(uuid, uuid) TO authenticated;

-- ---- 2. the guard as 20260929110000_rewards_and_league.sql left it, and the browser writes
CREATE OR REPLACE FUNCTION public.guard_profile_server_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND (
       NEW.id IS DISTINCT FROM OLD.id
    OR NEW.total_xp IS DISTINCT FROM OLD.total_xp
    OR NEW.gems IS DISTINCT FROM OLD.gems
    OR NEW.gems_earned IS DISTINCT FROM OLD.gems_earned
    OR NEW.gems_spent IS DISTINCT FROM OLD.gems_spent
    OR NEW.gems_granted IS DISTINCT FROM OLD.gems_granted
    OR NEW.hint_tokens IS DISTINCT FROM OLD.hint_tokens
    OR NEW.league_tier IS DISTINCT FROM OLD.league_tier
    OR NEW.current_streak IS DISTINCT FROM OLD.current_streak
    OR NEW.longest_streak IS DISTINCT FROM OLD.longest_streak
    OR NEW.last_active_day IS DISTINCT FROM OLD.last_active_day
    OR NEW.invite_code IS DISTINCT FROM OLD.invite_code
    OR NEW.day_key_version IS DISTINCT FROM OLD.day_key_version
    OR NEW.progress_synced_at IS DISTINCT FROM OLD.progress_synced_at
  ) THEN
    RAISE EXCEPTION 'XP, streaks and other progress are updated by the server only'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND status = 'pending');
GRANT INSERT ON public.friendships TO authenticated;

GRANT UPDATE (display_name, handle) ON public.profiles TO authenticated;

-- ---- 1. search as the signed-in user, by name or handle; handles from the email again
DROP FUNCTION IF EXISTS public.search_profiles(uuid, text);
CREATE OR REPLACE FUNCTION public.search_profiles(_query text)
RETURNS TABLE (
  id uuid,
  display_name text,
  handle text,
  companion_preset text,
  companion_palette text,
  companion_accessory text,
  companion_expression text,
  current_streak integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.handle, p.companion_preset, p.companion_palette,
         p.companion_accessory, p.companion_expression, NULL::integer
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND length(coalesce(_query, '')) >= 2
    AND NOT public.blocked_between(auth.uid(), p.id)
    AND (
      p.handle ILIKE '%' || replace(replace(replace(_query, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      OR p.display_name ILIKE '%' || replace(replace(replace(_query, '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  ORDER BY p.handle
  LIMIT 12;
$$;
REVOKE ALL ON FUNCTION public.search_profiles(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_daily_goal_range;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_display_name_length;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_handle_format;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
BEGIN
  base := lower(regexp_replace(
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name',
      split_part(COALESCE(NEW.email, 'learner'), '@', 1)
    ), '[^a-zA-Z0-9]', '', 'g'));
  IF base IS NULL OR length(base) < 3 THEN
    base := 'learner';
  END IF;
  base := substr(base, 1, 16);
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(handle) = candidate) LOOP
    candidate := substr(base, 1, 12) || public.random_code(4);
  END LOOP;

  INSERT INTO public.profiles (id, display_name, handle, invite_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name'),
    candidate,
    public.random_code(10)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMIT;
