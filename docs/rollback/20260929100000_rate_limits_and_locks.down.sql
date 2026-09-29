-- ROLLBACK for supabase/migrations/20260929100000_rate_limits_and_locks.sql
--
-- Removes the rate-limit counters and job leases. The public AI endpoints call
-- these on every request that would spend AI credit, and they FAIL CLOSED: if the
-- tables are gone while the code that uses them is still live, grading, the
-- companion's follow-ups and lesson generation answer "temporarily unavailable"
-- until the migration is applied again. Run this only together with reverting the
-- code (rate-limit.server.ts and the functions that call it), or as a deliberate
-- way to switch those features off.
--
-- Nothing learner-facing is stored here, so nothing of theirs is lost.
--
-- This file is deliberately NOT in supabase/migrations so it is never applied
-- automatically. Run it by hand (Lovable Cloud -> Database -> SQL editor) as an
-- administrator. It is safe to run more than once.

BEGIN;

DROP FUNCTION IF EXISTS public.check_rate_limits(jsonb);
DROP FUNCTION IF EXISTS public.acquire_lock(text, integer);
DROP FUNCTION IF EXISTS public.release_lock(text);
DROP TABLE IF EXISTS public.rate_limits;
DROP TABLE IF EXISTS public.server_locks;

COMMIT;
