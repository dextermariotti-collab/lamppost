-- ROLLBACK for supabase/migrations/20260928200000_lock_server_owned_writes.sql
--
-- Puts the database rules back exactly as they were before that migration: the
-- browser can once again write its own XP, streaks, activity, badges, shared
-- streaks, debates, graded attempts and practice sessions, and a pending friend
-- request exposes the requester's full profile. That is the vulnerable state;
-- only use this to recover from an outage, and re-apply the migration as soon as
-- the code that needs it is deployed.
--
-- This file is deliberately NOT in supabase/migrations so it is never applied
-- automatically. Run it by hand (Supabase dashboard -> SQL editor) as an
-- administrator. It is safe to run more than once. Columns the migration added
-- (goal, day_key_version, progress_synced_at) are left in place; they are harmless.

BEGIN;

-- ---- profiles
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
DROP TRIGGER IF EXISTS profiles_guard_server_columns ON public.profiles;
DROP FUNCTION IF EXISTS public.guard_profile_server_columns();

DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Friends can view each other's profile" ON public.profiles;
DROP POLICY IF EXISTS "Connected users can view each other's profile" ON public.profiles;
CREATE POLICY "Connected users can view each other's profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_friend_link(auth.uid(), id));

-- ---- daily_activity
DROP POLICY IF EXISTS "Users read their own activity" ON public.daily_activity;
DROP POLICY IF EXISTS "Users manage their own activity" ON public.daily_activity;
CREATE POLICY "Users manage their own activity"
  ON public.daily_activity FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_activity TO authenticated;

-- ---- user_achievements
DROP POLICY IF EXISTS "Users read their own badges" ON public.user_achievements;
DROP POLICY IF EXISTS "Users manage their own badges" ON public.user_achievements;
CREATE POLICY "Users manage their own badges"
  ON public.user_achievements FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, DELETE ON public.user_achievements TO authenticated;

-- ---- shared_streaks
DROP POLICY IF EXISTS "Members read their shared streaks" ON public.shared_streaks;
DROP POLICY IF EXISTS "Members manage their shared streaks" ON public.shared_streaks;
CREATE POLICY "Members manage their shared streaks"
  ON public.shared_streaks FOR ALL TO authenticated
  USING (public.is_friendship_member(friendship_id, auth.uid()))
  WITH CHECK (public.is_friendship_member(friendship_id, auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_streaks TO authenticated;

-- ---- friendships, nudges
DROP POLICY IF EXISTS "Addressee can accept a request" ON public.friendships;
CREATE POLICY "Addressee can accept a request"
  ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id) WITH CHECK (auth.uid() = addressee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nudges TO authenticated;

-- ---- practice_sessions
DROP POLICY IF EXISTS "Users read their own practice sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "Users manage their own practice sessions" ON public.practice_sessions;
CREATE POLICY "Users manage their own practice sessions"
  ON public.practice_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_sessions TO authenticated;

-- ---- tables created by the drizzle migrations
DO $$
BEGIN
  IF to_regclass('public.debates') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE ON public.debates TO authenticated;
    DROP POLICY IF EXISTS "Challenger can open a debate with a friend" ON public.debates;
    CREATE POLICY "Challenger can open a debate with a friend"
      ON public.debates FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = challenger_id AND public.are_friends(auth.uid(), opponent_id));
  END IF;
  IF to_regclass('public.argument_attempts') IS NOT NULL THEN
    GRANT SELECT, INSERT ON public.argument_attempts TO authenticated;
  END IF;
END
$$;

-- ---- people search: the original definition
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
         p.companion_accessory, p.companion_expression, p.current_streak
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND length(coalesce(_query, '')) >= 2
    AND (p.handle ILIKE '%' || _query || '%' OR p.display_name ILIKE '%' || _query || '%')
  ORDER BY p.handle
  LIMIT 12;
$$;

COMMIT;
