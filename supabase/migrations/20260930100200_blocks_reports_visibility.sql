-- Social safety: blocking, reporting people, and what a profile shows by default.
--
-- 1. profiles.profile_visibility: 'minimal' (the default, for everyone) shows other people
--    only a display name, handle and avatar. 'friends' additionally shares streak, XP,
--    activity and badges with accepted friends, and puts the person in their friends' league.
--    The browser roles cannot read or write the column; server functions do both.
-- 2. user_blocks: who has blocked whom. Blocking removes any friendship, stops search, invite
--    lookup and new requests in both directions, and takes both people out of each other's
--    league. The blocked person can't see that they were blocked.
-- 3. user_reports: reports about a person, for a human to review. Server-written, and
--    unreadable from the browser, including by the person who was reported. If the reporter
--    deletes their account the report stays, no longer linked to them (like content_reports);
--    if the reported person deletes theirs, the report goes with it.
--
-- Additive: one new column with a default, two new tables, new functions. Existing policies on
-- profiles, daily_activity and user_achievements are replaced by stricter ones (rollback in
-- docs/rollback/20260930100200_blocks_reports_visibility.down.sql).

-- ============ 1. visibility ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'minimal';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_profile_visibility_valid') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_profile_visibility_valid
      CHECK (profile_visibility IN ('minimal', 'friends'));
  END IF;
END
$$;

-- Is `_owner` a friend of `_viewer` AND happy to share progress with friends?
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
REVOKE ALL ON FUNCTION public.shares_progress_with(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shares_progress_with(uuid, uuid) TO authenticated, service_role;

-- Friends can read the shared columns only when the owner has chosen to share.
DROP POLICY IF EXISTS "Friends can view each other's profile" ON public.profiles;
CREATE POLICY "Friends can view profiles shared with friends"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.shares_progress_with(auth.uid(), id));

DROP POLICY IF EXISTS "Friends can view activity" ON public.daily_activity;
CREATE POLICY "Friends can view shared activity"
  ON public.daily_activity FOR SELECT TO authenticated
  USING (public.shares_progress_with(auth.uid(), user_id));

DROP POLICY IF EXISTS "Friends can view badges" ON public.user_achievements;
CREATE POLICY "Friends can view shared badges"
  ON public.user_achievements FOR SELECT TO authenticated
  USING (public.shares_progress_with(auth.uid(), user_id));

-- ============ 2. blocks ============
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON public.user_blocks (blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_blocks FROM PUBLIC, anon, authenticated;
-- A person can list who they blocked (to unblock); they never see who blocked them.
GRANT SELECT ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
DROP POLICY IF EXISTS "Blockers read their own blocks" ON public.user_blocks;
CREATE POLICY "Blockers read their own blocks"
  ON public.user_blocks FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);

CREATE OR REPLACE FUNCTION public.blocked_between(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
     WHERE (blocker_id = _a AND blocked_id = _b) OR (blocker_id = _b AND blocked_id = _a)
  );
$$;
REVOKE ALL ON FUNCTION public.blocked_between(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.blocked_between(uuid, uuid) TO service_role;

-- A request between people where either has blocked the other is refused. The message is the
-- same vague one any failed request gets, so it does not reveal a block.
CREATE OR REPLACE FUNCTION public.refuse_blocked_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.blocked_between(NEW.requester_id, NEW.addressee_id) THEN
    RAISE EXCEPTION 'That request could not be sent.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.refuse_blocked_friend_request() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS friendships_refuse_blocked ON public.friendships;
CREATE TRIGGER friendships_refuse_blocked
  BEFORE INSERT ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.refuse_blocked_friend_request();

-- Blocks in one transaction: record it, end any friendship (its shared streak goes with it)
-- and clear the nudges and unfinished debates between the two.
CREATE OR REPLACE FUNCTION public.block_user(_blocker uuid, _blocked uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _blocker IS NULL OR _blocked IS NULL OR _blocker = _blocked THEN
    RAISE EXCEPTION 'You cannot block yourself.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_blocks (blocker_id, blocked_id)
  VALUES (_blocker, _blocked)
  ON CONFLICT DO NOTHING;

  DELETE FROM public.friendships
   WHERE (requester_id = _blocker AND addressee_id = _blocked)
      OR (requester_id = _blocked AND addressee_id = _blocker);

  DELETE FROM public.nudges
   WHERE (from_user_id = _blocker AND to_user_id = _blocked)
      OR (from_user_id = _blocked AND to_user_id = _blocker);

  IF to_regclass('public.debates') IS NOT NULL THEN
    DELETE FROM public.debates
     WHERE status <> 'graded'
       AND ((challenger_id = _blocker AND opponent_id = _blocked)
         OR (challenger_id = _blocked AND opponent_id = _blocker));
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.block_user(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.block_user(uuid, uuid) TO service_role;

-- ============ 3. reports about people ============
CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_reports_not_self CHECK (reporter_id <> reported_user_id),
  CONSTRAINT user_reports_reason_valid CHECK (
    reason IN ('harassment', 'inappropriate_name', 'inappropriate_avatar', 'spam',
               'impersonation', 'underage', 'other')
  ),
  CONSTRAINT user_reports_details_short CHECK (details IS NULL OR char_length(details) <= 1000),
  CONSTRAINT user_reports_status_valid CHECK (status IN ('open', 'reviewed', 'actioned', 'dismissed'))
);
CREATE INDEX IF NOT EXISTS user_reports_reported_idx
  ON public.user_reports (reported_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_reports_reporter_idx
  ON public.user_reports (reporter_id, created_at DESC);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_reports FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.user_reports TO service_role;

-- ============ discovery: strangers see a name and an avatar, never progress ============
-- Same signatures as before. current_streak is now always NULL: it is what a stranger used to
-- learn from a search, and the callers no longer read it.
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

CREATE OR REPLACE FUNCTION public.profile_by_invite(_code text)
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
    AND p.invite_code = _code
    AND NOT public.blocked_between(auth.uid(), p.id)
  LIMIT 1;
$$;

-- ============ the friends league: only people who chose to share, and never a blocked pair ============
CREATE OR REPLACE FUNCTION public.league_standings(_user uuid, _week date)
RETURNS TABLE (
  id uuid,
  display_name text,
  handle text,
  companion_preset text,
  companion_palette text,
  companion_accessory text,
  companion_expression text,
  league_tier smallint,
  weekly_xp integer
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.handle, p.companion_preset, p.companion_palette,
         p.companion_accessory, p.companion_expression, p.league_tier,
         coalesce(w.xp, 0)::integer
    FROM public.profiles AS p
    LEFT JOIN public.xp_weekly AS w ON w.user_id = p.id AND w.week_start = _week
   WHERE p.id = _user
      OR (
        public.are_friends(_user, p.id)
        AND p.profile_visibility = 'friends'
        AND NOT public.blocked_between(_user, p.id)
        AND EXISTS (
          SELECT 1 FROM public.profiles me
           WHERE me.id = _user AND me.profile_visibility = 'friends'
        )
      )
   ORDER BY coalesce(w.xp, 0) DESC, p.handle;
$$;
