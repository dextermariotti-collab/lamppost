-- Gems are spent on the server.
--
-- Until now a learner's gem balance was a number the browser kept and the server
-- accepted: buying a streak freeze subtracted gems on the device, and the account
-- only ever saw the balance go UP (XP and gems are monotonic on the server). A
-- purchase therefore couldn't be verified, and couldn't be seen from another
-- device. From now on the account keeps two counters:
--
--   gems_earned  lifetime gems, reported by devices in each sync and bounded there
--                (it only ever rises, by at most a generous per-day allowance)
--   gems_spent   lifetime gems spent, changed ONLY by spend_gems() below
--
-- and the balance is gems_earned - gems_spent. The existing `gems` column is kept
-- as that balance (a trigger maintains it), so nothing that reads it changes.
-- Nobody can spend gems they haven't earned or spend the same gems twice: the check
-- and the update are one statement on a locked row, and a CHECK constraint makes an
-- overdrawn account impossible even if the code around it has a bug.
--
-- Server only: the browser roles hold no privilege on the new columns or function.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gems_earned integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gems_spent integer NOT NULL DEFAULT 0;

-- Balances so far were lifetime earnings (spending never reached the server), so
-- earned must cover the balance plus anything already spent. This is a no-op on an
-- account where balance = earned - spent already holds, so it is safe to re-run,
-- including after the rollback if the old code raised a balance in the meantime.
UPDATE public.profiles
   SET gems_earned = gems + gems_spent
 WHERE gems_earned < gems + gems_spent;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_gems_not_overdrawn'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_gems_not_overdrawn
      CHECK (gems_spent >= 0 AND gems_earned >= gems_spent);
  END IF;
END
$$;

-- `gems` is the balance, always: earned minus spent.
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

DROP TRIGGER IF EXISTS profiles_keep_gem_balance ON public.profiles;
CREATE TRIGGER profiles_keep_gem_balance
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.keep_gem_balance();

REVOKE EXECUTE ON FUNCTION public.keep_gem_balance() FROM PUBLIC, anon, authenticated;

-- Defence in depth, as for the other server-owned columns: even if a grant is
-- widened by mistake later, a browser role still cannot touch the wallet.
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

-- Spends `_cost` gems from `_user`'s balance if they have them. One statement, so
-- two purchases at the same moment (two taps, two devices) can't both use the same
-- gems. Returns whether it went through, and the balance and lifetime spend either
-- way, so the caller can show the truth after a refusal.
CREATE OR REPLACE FUNCTION public.spend_gems(_user uuid, _cost integer)
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
