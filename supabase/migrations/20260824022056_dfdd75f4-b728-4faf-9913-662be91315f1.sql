-- ============ profiles: handle, invite code, settings, progress ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS handle text,
  ADD COLUMN IF NOT EXISTS invite_code text,
  ADD COLUMN IF NOT EXISTS daily_goal integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS notify_nudges_inapp boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_nudges_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gems integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_day date;

CREATE OR REPLACE FUNCTION public.random_code(len integer)
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', (floor(random() * 31) + 1)::int, 1), '')
  FROM generate_series(1, len);
$$;

-- backfill handles / invite codes for existing rows
UPDATE public.profiles
SET handle = COALESCE(handle, 'learner' || public.random_code(6)),
    invite_code = COALESCE(invite_code, public.random_code(10))
WHERE handle IS NULL OR invite_code IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN handle SET NOT NULL,
  ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_key ON public.profiles (lower(handle));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_invite_code_key ON public.profiles (invite_code);

-- new signups get a handle + invite code
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

-- ============ friendships ============
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_status_check CHECK (status IN ('pending', 'accepted')),
  CONSTRAINT friendships_not_self CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_key
  ON public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their friendships"
  ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND status = 'pending');

CREATE POLICY "Addressee can accept a request"
  ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

CREATE POLICY "Members can remove a friendship"
  ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER friendships_touch_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- friendship helper used by other policies
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

-- friends can read each other's profile
CREATE POLICY "Friends can view each other's profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.are_friends(auth.uid(), id));

-- ============ daily activity ============
CREATE TABLE IF NOT EXISTS public.daily_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  lessons_completed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_activity TO authenticated;
GRANT ALL ON public.daily_activity TO service_role;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own activity"
  ON public.daily_activity FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Friends can view activity"
  ON public.daily_activity FOR SELECT TO authenticated
  USING (public.are_friends(auth.uid(), user_id));

CREATE TRIGGER daily_activity_touch_updated_at
  BEFORE UPDATE ON public.daily_activity
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ achievements ============
CREATE TABLE IF NOT EXISTS public.achievements (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  criteria text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.achievements TO authenticated;
GRANT SELECT ON public.achievements TO anon;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievement catalogue is readable"
  ON public.achievements FOR SELECT TO authenticated, anon
  USING (true);

INSERT INTO public.achievements (code, name, description, icon, criteria, sort_order) VALUES
  ('first_lesson', 'First lesson', 'You finished your very first lesson.', 'sparkles', 'Complete one lesson', 1),
  ('streak_7', 'Week of showing up', 'Seven days in a row of learning.', 'flame', 'Reach a 7-day streak', 2),
  ('xp_100', 'First hundred', 'You banked your first 100 XP.', 'zap', 'Earn 100 total XP', 3),
  ('perfect_week', 'Perfect week', 'You hit your daily goal every day for a week.', 'star', 'Hit your daily goal 7 days running', 4),
  ('first_friend', 'Better together', 'You added your first friend.', 'user-plus', 'Add one friend', 5),
  ('shared_streak_7', 'Two-week flame', 'A shared streak reached seven days.', 'trophy', 'Keep a shared streak alive for 7 days', 6)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_code text NOT NULL REFERENCES public.achievements(code) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_code)
);

GRANT SELECT, INSERT, DELETE ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own badges"
  ON public.user_achievements FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Friends can view badges"
  ON public.user_achievements FOR SELECT TO authenticated
  USING (public.are_friends(auth.uid(), user_id));

-- ============ shared streaks ============
CREATE TABLE IF NOT EXISTS public.shared_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  friendship_id uuid NOT NULL UNIQUE REFERENCES public.friendships(id) ON DELETE CASCADE,
  proposed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  current_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_extended_day date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shared_streaks_status_check CHECK (status IN ('pending', 'active'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_streaks TO authenticated;
GRANT ALL ON public.shared_streaks TO service_role;
ALTER TABLE public.shared_streaks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_friendship_member(_friendship_id uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE id = _friendship_id
      AND status = 'accepted'
      AND (requester_id = _user OR addressee_id = _user)
  );
$$;

CREATE POLICY "Members manage their shared streaks"
  ON public.shared_streaks FOR ALL TO authenticated
  USING (public.is_friendship_member(friendship_id, auth.uid()))
  WITH CHECK (public.is_friendship_member(friendship_id, auth.uid()));

CREATE TRIGGER shared_streaks_touch_updated_at
  BEFORE UPDATE ON public.shared_streaks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ nudges ============
CREATE TABLE IF NOT EXISTS public.nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_streak_id uuid REFERENCES public.shared_streaks(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  read_at timestamptz,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_user_id, to_user_id, day)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nudges TO authenticated;
GRANT ALL ON public.nudges TO service_role;
ALTER TABLE public.nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender can create nudges"
  ON public.nudges FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id AND public.are_friends(auth.uid(), to_user_id));

CREATE POLICY "Participants can view nudges"
  ON public.nudges FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Recipient can mark nudges read"
  ON public.nudges FOR UPDATE TO authenticated
  USING (auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = to_user_id);

-- ============ controlled discovery ============
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

GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_by_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_friendship_member(uuid, uuid) TO authenticated;