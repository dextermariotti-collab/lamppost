-- ROLLBACK for supabase/migrations/20260929110000_rewards_and_league.sql
--
-- Puts the database back to the state after 20260929100200_server_wallet.sql: the
-- reward, hint-token, cosmetic and league functions are gone, and the wallet is
-- earned minus spent again. Run this BEFORE rolling back the wallet migration, and
-- together with reverting the code that calls these functions (rewards.functions.ts,
-- league.functions.ts); with the functions gone and that code still live, opening a
-- reward chest, buying a hint token or opening the league fails with an error.
--
-- No learner loses gems: what the server had granted (reward chests) is folded into
-- gems_earned, so every balance is unchanged. The tables and columns this migration
-- added (reward_chests, user_cosmetics, xp_weekly, league_results, hint_tokens,
-- league_tier) are LEFT IN PLACE: they hold what learners earned and unlocked, they
-- are unreachable by any browser role, and re-applying the migration finds them
-- exactly as they were. Drop them by hand only if you mean to delete that history.
--
-- This file is deliberately NOT in supabase/migrations so it is never applied
-- automatically. Run it by hand (Lovable Cloud -> Database -> SQL editor) as an
-- administrator. It is safe to run more than once.

BEGIN;

DROP FUNCTION IF EXISTS public.grant_chest(uuid, date, text, text, integer, integer, integer, integer);
DROP FUNCTION IF EXISTS public.buy_hint_token(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.use_hint_token(uuid);
DROP FUNCTION IF EXISTS public.unlock_cosmetic(uuid, text, integer);
DROP FUNCTION IF EXISTS public.record_weekly_xp(uuid, date, integer);
DROP FUNCTION IF EXISTS public.league_standings(uuid, date);
DROP FUNCTION IF EXISTS public.apply_league_result(uuid, date, integer, integer, integer, smallint, smallint);

-- Fold server grants into earnings while the new balance formula is still in force,
-- so the balance is the same before and after.
UPDATE public.profiles
   SET gems_earned = gems_earned + gems_granted,
       gems_granted = 0
 WHERE gems_granted <> 0;

-- The wallet as 20260929100200_server_wallet.sql defined it.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gems_not_overdrawn;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gems_not_overdrawn
  CHECK (gems_spent >= 0 AND gems_earned >= gems_spent);

CREATE OR REPLACE FUNCTION public.keep_gem_balance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.gems := NEW.gems_earned - NEW.gems_spent;
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

DROP FUNCTION IF EXISTS public.spend_gems(uuid, integer);
CREATE FUNCTION public.spend_gems(_user uuid, _cost integer)
RETURNS TABLE (ok boolean, balance integer, spent integer)
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
     AND pr.gems_earned - pr.gems_spent >= _cost
  RETURNING pr.gems AS gems, pr.gems_spent AS gems_spent INTO p;

  IF FOUND THEN
    RETURN QUERY SELECT true, p.gems, p.gems_spent;
    RETURN;
  END IF;

  SELECT pr.gems AS gems, pr.gems_spent AS gems_spent INTO p
    FROM public.profiles AS pr WHERE pr.id = _user;
  RETURN QUERY SELECT false, coalesce(p.gems, 0), coalesce(p.gems_spent, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.spend_gems(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_gems(uuid, integer) TO service_role;

COMMIT;
