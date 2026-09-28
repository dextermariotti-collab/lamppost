-- Server-owned data can no longer be written from the browser.
--
-- Before this migration any signed-in user could, with the public (publishable)
-- key and one PostgREST call, set their own XP, gems and streaks, forge a run of
-- daily_activity rows, award themselves badges, set a shared streak to any count,
-- insert pre-graded debates and perfect argument scores, delete practice sessions
-- to reset the free weekly allowance, and read the invite code, goal and
-- notification settings of anyone who had sent them a friend request.
--
-- From now on the browser can only write the settings/companion columns of its own
-- profile row and act on friendships and nudges in ways the app actually needs.
-- Everything else (XP, gems, streaks, activity, achievements, shared streaks,
-- debates, graded attempts, practice sessions) is written by server functions
-- using the service role, which validates and bounds what it stores. The service
-- role bypasses RLS and keeps its full grants.

-- Columns other migrations add; harmless if they already exist.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS goal text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS day_key_version smallint NOT NULL DEFAULT 1;
-- When the server last accepted a progress sync; bounds how much XP can arrive at once.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS progress_synced_at timestamptz;

-- ============ baseline: no browser writes anywhere unless granted below ============
-- Supabase grants the API roles broad default privileges on new tables, and RLS
-- policies were the only thing standing between a user and a write. Start from a
-- known state instead: the browser roles hold no write privilege on any table in
-- public, and anon holds nothing except read access to the public catalogues.
-- The few writes the app really makes from the browser are granted back explicitly.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon, authenticated',
      t.tablename
    );
    IF t.tablename NOT IN ('achievements', 'curriculum_lessons', 'drill_variants') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t.tablename);
    END IF;
  END LOOP;
END
$$;

-- What the app still writes from the browser: friend requests (and removing a
-- friend), nudges, and content reports. Their RLS policies are unchanged.
GRANT INSERT, DELETE ON public.friendships TO authenticated;
GRANT INSERT ON public.nudges TO authenticated;
GRANT INSERT ON public.content_reports TO authenticated;

-- ============ profiles ============
REVOKE ALL ON public.profiles FROM authenticated;

-- Readable columns: what the app shows about a person. Invite code, goal, daily
-- goal, notification settings and sync bookkeeping are private; the server reads
-- them for the owner with the service role.
GRANT SELECT (
  id, display_name, handle, created_at, updated_at,
  companion_preset, companion_palette, companion_accessory, companion_expression,
  current_streak, longest_streak, total_xp, last_active_day
) ON public.profiles TO authenticated;

-- Writable columns: settings and companion only.
GRANT UPDATE (
  display_name, handle, daily_goal, goal, notify_nudges_inapp, notify_nudges_email,
  companion_preset, companion_palette, companion_accessory, companion_expression,
  onboarding_completed
) ON public.profiles TO authenticated;

-- Rows are created by the signup trigger, never by the client.
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

-- Only accepted friends (not anyone who merely sent a request) can read a profile.
DROP POLICY IF EXISTS "Connected users can view each other's profile" ON public.profiles;
DROP POLICY IF EXISTS "Friends can view each other's profile" ON public.profiles;
CREATE POLICY "Friends can view each other's profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.are_friends(auth.uid(), id));

-- Defence in depth: even if a grant is widened by mistake later, a browser role
-- still cannot change the server-owned columns.
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

DROP TRIGGER IF EXISTS profiles_guard_server_columns ON public.profiles;
CREATE TRIGGER profiles_guard_server_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_server_columns();

REVOKE EXECUTE ON FUNCTION public.guard_profile_server_columns() FROM PUBLIC, anon, authenticated;

-- ============ daily_activity: read-only from the browser ============
DROP POLICY IF EXISTS "Users manage their own activity" ON public.daily_activity;
CREATE POLICY "Users read their own activity"
  ON public.daily_activity FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============ user_achievements: read-only from the browser ============
DROP POLICY IF EXISTS "Users manage their own badges" ON public.user_achievements;
CREATE POLICY "Users read their own badges"
  ON public.user_achievements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============ shared_streaks: members read; the server writes ============
DROP POLICY IF EXISTS "Members manage their shared streaks" ON public.shared_streaks;
CREATE POLICY "Members read their shared streaks"
  ON public.shared_streaks FOR SELECT TO authenticated
  USING (public.is_friendship_member(friendship_id, auth.uid()));

-- ============ friendships: an addressee can accept, nothing else ============
DROP POLICY IF EXISTS "Addressee can accept a request" ON public.friendships;
CREATE POLICY "Addressee can accept a request"
  ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id AND status = 'accepted');
GRANT UPDATE (status, accepted_at) ON public.friendships TO authenticated;

-- ============ nudges: a recipient can only mark them read ============
GRANT UPDATE (read_at) ON public.nudges TO authenticated;

-- ============ practice_sessions: the weekly allowance is counted from these rows ============
DROP POLICY IF EXISTS "Users manage their own practice sessions" ON public.practice_sessions;
CREATE POLICY "Users read their own practice sessions"
  ON public.practice_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============ tables created by the drizzle migrations ============
DO $$
BEGIN
  IF to_regclass('public.debates') IS NOT NULL THEN
    -- Scores, answers and status are written by the server after it has graded them;
    -- a participant may only mark a result as seen.
    DROP POLICY IF EXISTS "Challenger can open a debate with a friend" ON public.debates;
    GRANT UPDATE (challenger_seen_result, opponent_seen_result) ON public.debates TO authenticated;
  END IF;
END
$$;

-- ============ discovery: treat % and _ in a search as plain characters ============
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
    AND (
      p.handle ILIKE '%' || replace(replace(replace(_query, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      OR p.display_name ILIKE '%' || replace(replace(replace(_query, '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  ORDER BY p.handle
  LIMIT 12;
$$;
