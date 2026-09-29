-- Rewards and the friends league.
--
-- Everything here is written by the server only, on the same terms as the wallet
-- from 20260929100200_server_wallet.sql: no browser role holds any privilege on the
-- new columns, tables or functions. Reads go through server functions too.
--
--   gems_granted   gems the server has handed out (reward chests). The balance is now
--                  earned + granted - spent; earned still comes from device syncs,
--                  granted and spent only ever change here.
--   hint_tokens    hint tokens held: earned from a chest or bought with gems.
--   league_tier    0..4, the learner's tier in their friends league.
--   reward_chests  one row per chest opened: what came out, on which local day.
--   user_cosmetics what the learner has unlocked with gems.
--   xp_weekly      XP earned per Monday-start week, credited from bounded syncs.
--   league_results one row per learner per settled week, so a week is only ever
--                  judged once.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gems_granted integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hint_tokens integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS league_tier smallint NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_hint_tokens_range') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_hint_tokens_range CHECK (hint_tokens BETWEEN 0 AND 99);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_league_tier_range') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_league_tier_range CHECK (league_tier BETWEEN 0 AND 4);
  END IF;
END
$$;

-- ============ the wallet now includes what the server grants ============
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gems_not_overdrawn;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gems_not_overdrawn
  CHECK (gems_spent >= 0 AND gems_granted >= 0 AND gems_earned + gems_granted >= gems_spent);

CREATE OR REPLACE FUNCTION public.keep_gem_balance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.gems := NEW.gems_earned + NEW.gems_granted - NEW.gems_spent;
  RETURN NEW;
END;
$$;

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

-- Re-derive every balance under the new formula (a no-op until something is granted).
UPDATE public.profiles SET gems_granted = gems_granted;

-- The return type gains `granted`, so the function is replaced rather than altered.
DROP FUNCTION IF EXISTS public.spend_gems(uuid, integer);
CREATE FUNCTION public.spend_gems(_user uuid, _cost integer)
RETURNS TABLE (ok boolean, balance integer, spent integer, granted integer)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  p record;
BEGIN
  IF _cost IS NULL OR _cost < 1 OR _cost > 100000 THEN
    RAISE EXCEPTION 'invalid gem amount' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles AS pr
     SET gems_spent = pr.gems_spent + _cost
   WHERE pr.id = _user
     AND pr.gems_earned + pr.gems_granted - pr.gems_spent >= _cost
  RETURNING pr.gems AS gems, pr.gems_spent AS gems_spent, pr.gems_granted AS gems_granted INTO p;

  IF FOUND THEN
    RETURN QUERY SELECT true, p.gems, p.gems_spent, p.gems_granted;
    RETURN;
  END IF;

  SELECT pr.gems AS gems, pr.gems_spent AS gems_spent, pr.gems_granted AS gems_granted INTO p
    FROM public.profiles AS pr WHERE pr.id = _user;
  RETURN QUERY SELECT false, coalesce(p.gems, 0), coalesce(p.gems_spent, 0), coalesce(p.gems_granted, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.spend_gems(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_gems(uuid, integer) TO service_role;

-- ============ tables ============
CREATE TABLE IF NOT EXISTS public.reward_chests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The learner's own calendar day, the same day key as everything else.
  opened_on date NOT NULL,
  source text NOT NULL CHECK (source IN ('lesson', 'review', 'challenge')),
  kind text NOT NULL CHECK (kind IN ('gems', 'hint')),
  amount integer NOT NULL CHECK (amount > 0),
  -- Set when a hint token would have overflowed the pouch and became gems instead.
  converted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reward_chests_user_day_idx ON public.reward_chests (user_id, opened_on);
CREATE INDEX IF NOT EXISTS reward_chests_user_created_idx
  ON public.reward_chests (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_cosmetics (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item)
);

CREATE TABLE IF NOT EXISTS public.xp_weekly (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The Monday that starts the week, as the learner's local day key.
  week_start date NOT NULL,
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  PRIMARY KEY (user_id, week_start)
);

CREATE TABLE IF NOT EXISTS public.league_results (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  rank integer,
  group_size integer NOT NULL,
  weekly_xp integer NOT NULL,
  tier_before smallint NOT NULL,
  tier_after smallint NOT NULL,
  settled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['reward_chests', 'user_cosmetics', 'xp_weekly', 'league_results'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END
$$;

-- ============ reward chests ============
-- Opens one chest for `_user` on `_day`, if fewer than `_cap` have been opened that
-- day. The profile row is locked first, so two chests opened at the same moment
-- can't both take the last slot. A hint token that would overflow the pouch (more
-- than `_max_tokens`) is paid as `_fallback_gems` gems instead, and says so.
CREATE OR REPLACE FUNCTION public.grant_chest(
  _user uuid,
  _day date,
  _source text,
  _kind text,
  _amount integer,
  _cap integer,
  _max_tokens integer,
  _fallback_gems integer
)
RETURNS TABLE (
  ok boolean,
  reason text,
  kind text,
  amount integer,
  converted boolean,
  opened_today integer,
  balance integer,
  hint_tokens integer
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  p record;
  used integer;
  final_kind text := _kind;
  final_amount integer := _amount;
  was_converted boolean := false;
BEGIN
  IF _kind NOT IN ('gems', 'hint') OR _amount < 1 OR _amount > 1000 OR _cap < 0 THEN
    RAISE EXCEPTION 'invalid chest' USING ERRCODE = '22023';
  END IF;

  SELECT pr.gems AS gems, pr.hint_tokens AS hint_tokens INTO p
    FROM public.profiles AS pr WHERE pr.id = _user FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'no-profile', NULL::text, 0, false, 0, 0, 0;
    RETURN;
  END IF;

  SELECT count(*)::integer INTO used
    FROM public.reward_chests AS c WHERE c.user_id = _user AND c.opened_on = _day;
  IF used >= _cap THEN
    RETURN QUERY SELECT false, 'daily-limit', NULL::text, 0, false, used, p.gems, p.hint_tokens;
    RETURN;
  END IF;

  IF _kind = 'hint' AND p.hint_tokens + _amount > _max_tokens THEN
    final_kind := 'gems';
    final_amount := _fallback_gems;
    was_converted := true;
  END IF;

  INSERT INTO public.reward_chests (user_id, opened_on, source, kind, amount, converted)
  VALUES (_user, _day, _source, final_kind, final_amount, was_converted);

  IF final_kind = 'gems' THEN
    UPDATE public.profiles AS pr SET gems_granted = pr.gems_granted + final_amount
     WHERE pr.id = _user
    RETURNING pr.gems AS gems, pr.hint_tokens AS hint_tokens INTO p;
  ELSE
    UPDATE public.profiles AS pr SET hint_tokens = pr.hint_tokens + final_amount
     WHERE pr.id = _user
    RETURNING pr.gems AS gems, pr.hint_tokens AS hint_tokens INTO p;
  END IF;

  RETURN QUERY SELECT true, NULL::text, final_kind, final_amount, was_converted, used + 1,
    p.gems, p.hint_tokens;
END;
$$;

-- ============ hint tokens ============
CREATE OR REPLACE FUNCTION public.buy_hint_token(_user uuid, _cost integer, _max integer)
RETURNS TABLE (ok boolean, reason text, balance integer, spent integer, granted integer, hint_tokens integer)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  p record;
BEGIN
  IF _cost IS NULL OR _cost < 1 OR _cost > 100000 OR _max < 1 OR _max > 99 THEN
    RAISE EXCEPTION 'invalid hint purchase' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles AS pr
     SET gems_spent = pr.gems_spent + _cost, hint_tokens = pr.hint_tokens + 1
   WHERE pr.id = _user
     AND pr.hint_tokens < _max
     AND pr.gems_earned + pr.gems_granted - pr.gems_spent >= _cost
  RETURNING pr.gems AS gems, pr.gems_spent AS gems_spent, pr.gems_granted AS gems_granted,
            pr.hint_tokens AS hint_tokens INTO p;
  IF FOUND THEN
    RETURN QUERY SELECT true, NULL::text, p.gems, p.gems_spent, p.gems_granted, p.hint_tokens;
    RETURN;
  END IF;

  SELECT pr.gems AS gems, pr.gems_spent AS gems_spent, pr.gems_granted AS gems_granted,
         pr.hint_tokens AS hint_tokens INTO p
    FROM public.profiles AS pr WHERE pr.id = _user;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'no-profile', 0, 0, 0, 0;
  ELSIF p.hint_tokens >= _max THEN
    RETURN QUERY SELECT false, 'pouch-full', p.gems, p.gems_spent, p.gems_granted, p.hint_tokens;
  ELSE
    RETURN QUERY SELECT false, 'not-enough-gems', p.gems, p.gems_spent, p.gems_granted, p.hint_tokens;
  END IF;
END;
$$;

-- Uses one hint token, if there is one.
CREATE OR REPLACE FUNCTION public.use_hint_token(_user uuid)
RETURNS TABLE (ok boolean, hint_tokens integer)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  left_over integer;
BEGIN
  UPDATE public.profiles AS pr SET hint_tokens = pr.hint_tokens - 1
   WHERE pr.id = _user AND pr.hint_tokens > 0
  RETURNING pr.hint_tokens INTO left_over;
  IF FOUND THEN
    RETURN QUERY SELECT true, left_over;
    RETURN;
  END IF;
  RETURN QUERY SELECT false, coalesce((SELECT pr.hint_tokens FROM public.profiles AS pr WHERE pr.id = _user), 0);
END;
$$;

-- ============ cosmetics ============
CREATE OR REPLACE FUNCTION public.unlock_cosmetic(_user uuid, _item text, _cost integer)
RETURNS TABLE (ok boolean, reason text, balance integer, spent integer, granted integer)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  p record;
BEGIN
  IF _cost IS NULL OR _cost < 1 OR _cost > 100000 OR length(coalesce(_item, '')) NOT BETWEEN 1 AND 40 THEN
    RAISE EXCEPTION 'invalid cosmetic' USING ERRCODE = '22023';
  END IF;

  SELECT pr.gems AS gems, pr.gems_spent AS gems_spent, pr.gems_granted AS gems_granted INTO p
    FROM public.profiles AS pr WHERE pr.id = _user FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'no-profile', 0, 0, 0;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_cosmetics AS c WHERE c.user_id = _user AND c.item = _item) THEN
    RETURN QUERY SELECT false, 'owned', p.gems, p.gems_spent, p.gems_granted;
    RETURN;
  END IF;
  IF p.gems < _cost THEN
    RETURN QUERY SELECT false, 'not-enough-gems', p.gems, p.gems_spent, p.gems_granted;
    RETURN;
  END IF;

  UPDATE public.profiles AS pr SET gems_spent = pr.gems_spent + _cost
   WHERE pr.id = _user
  RETURNING pr.gems AS gems, pr.gems_spent AS gems_spent, pr.gems_granted AS gems_granted INTO p;
  INSERT INTO public.user_cosmetics (user_id, item) VALUES (_user, _item);
  RETURN QUERY SELECT true, NULL::text, p.gems, p.gems_spent, p.gems_granted;
END;
$$;

-- ============ the friends league ============
CREATE OR REPLACE FUNCTION public.record_weekly_xp(_user uuid, _week date, _delta integer)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  INSERT INTO public.xp_weekly AS w (user_id, week_start, xp)
  SELECT _user, _week, _delta WHERE _delta > 0 AND _delta <= 1000000
  ON CONFLICT (user_id, week_start) DO UPDATE SET xp = w.xp + EXCLUDED.xp;
$$;

-- The learner and their accepted friends, with the XP each earned in `_week`.
-- Friends only: a pending request, or someone with no link, is never in the list.
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

-- Records a week's result once and applies the tier change with it. A second call
-- for the same week does nothing, so a week can never be judged twice.
CREATE OR REPLACE FUNCTION public.apply_league_result(
  _user uuid,
  _week date,
  _rank integer,
  _group integer,
  _xp integer,
  _before smallint,
  _after smallint
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  inserted integer;
BEGIN
  IF _after < 0 OR _after > 4 OR _before < 0 OR _before > 4 THEN
    RAISE EXCEPTION 'invalid league tier' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.league_results
    (user_id, week_start, rank, group_size, weekly_xp, tier_before, tier_after)
  VALUES (_user, _week, _rank, _group, _xp, _before, _after)
  ON CONFLICT (user_id, week_start) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 0 THEN
    RETURN false;
  END IF;
  UPDATE public.profiles SET league_tier = _after WHERE id = _user;
  RETURN true;
END;
$$;

DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'grant_chest(uuid, date, text, text, integer, integer, integer, integer)',
    'buy_hint_token(uuid, integer, integer)',
    'use_hint_token(uuid)',
    'unlock_cosmetic(uuid, text, integer)',
    'record_weekly_xp(uuid, date, integer)',
    'league_standings(uuid, date)',
    'apply_league_result(uuid, date, integer, integer, integer, smallint, smallint)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
  END LOOP;
END
$$;
