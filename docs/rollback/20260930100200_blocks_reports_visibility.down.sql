-- ROLLBACK for supabase/migrations/20260930100200_blocks_reports_visibility.sql
--
-- Restores the previous friend-visibility rules (every accepted friend can read each other's
-- profile, activity and badges) and the search and league functions as they were, then removes
-- the blocks, reports and visibility column.
--
-- What is lost: every block (so blocked people could search for and add each other again) and
-- every report about a person. Export them first if you need to keep them:
--   SELECT * FROM public.user_blocks;  SELECT * FROM public.user_reports;
--
-- Run it together with reverting the code that calls block_user and reads profile_visibility.
-- This file is deliberately NOT in supabase/migrations so it is never applied automatically.
-- Run it by hand as an administrator. It is safe to run more than once.

DROP TRIGGER IF EXISTS friendships_refuse_blocked ON public.friendships;

-- The original functions, which show a stranger a streak and know nothing of blocks.
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
         p.companion_accessory, p.companion_expression, p.current_streak
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.invite_code = _code
  LIMIT 1;
$$;

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
   WHERE p.id = _user OR public.are_friends(_user, p.id)
   ORDER BY coalesce(w.xp, 0) DESC, p.handle;
$$;

-- The original friend-read policies.
DROP POLICY IF EXISTS "Friends can view profiles shared with friends" ON public.profiles;
DROP POLICY IF EXISTS "Friends can view each other's profile" ON public.profiles;
CREATE POLICY "Friends can view each other's profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.are_friends(auth.uid(), id));

DROP POLICY IF EXISTS "Friends can view shared activity" ON public.daily_activity;
DROP POLICY IF EXISTS "Friends can view activity" ON public.daily_activity;
CREATE POLICY "Friends can view activity"
  ON public.daily_activity FOR SELECT TO authenticated
  USING (public.are_friends(auth.uid(), user_id));

DROP POLICY IF EXISTS "Friends can view shared badges" ON public.user_achievements;
DROP POLICY IF EXISTS "Friends can view badges" ON public.user_achievements;
CREATE POLICY "Friends can view badges"
  ON public.user_achievements FOR SELECT TO authenticated
  USING (public.are_friends(auth.uid(), user_id));

DROP FUNCTION IF EXISTS public.block_user(uuid, uuid);
DROP FUNCTION IF EXISTS public.refuse_blocked_friend_request();
DROP FUNCTION IF EXISTS public.shares_progress_with(uuid, uuid);
DROP FUNCTION IF EXISTS public.blocked_between(uuid, uuid);
DROP TABLE IF EXISTS public.user_reports;
DROP TABLE IF EXISTS public.user_blocks;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_profile_visibility_valid;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS profile_visibility;
