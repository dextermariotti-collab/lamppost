-- ROLLBACK for supabase/migrations/20260929100200_server_wallet.sql
--
-- Puts gem handling back the way it was before the server-side wallet: `gems` is a
-- plain column again (no trigger derives it), the spend function is gone, and the
-- database no longer refuses an overdrawn account. The old code treats `gems` as a
-- balance the browser reports and the server only ever raises, so run this only
-- together with reverting the code that calls spend_gems (wallet.functions.ts).
--
-- The balance at the moment of rollback is preserved: `gems` already equals earned
-- minus spent. The gems_earned / gems_spent columns are left in place (harmless, and
-- they keep the spending history if the migration is applied again).
--
-- This file is deliberately NOT in supabase/migrations so it is never applied
-- automatically. Run it by hand (Lovable Cloud -> Database -> SQL editor) as an
-- administrator. It is safe to run more than once.

BEGIN;

DROP FUNCTION IF EXISTS public.spend_gems(uuid, integer);

DROP TRIGGER IF EXISTS profiles_keep_gem_balance ON public.profiles;
DROP FUNCTION IF EXISTS public.keep_gem_balance();

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gems_not_overdrawn;

-- The guard as it was in 20260928200000_lock_server_owned_writes.sql.
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

COMMIT;
