-- ROLLBACK for supabase/migrations/20261012100000_generated_cases.sql
--
-- Removes the store of AI-written daily cases. Learners keep working: the app falls
-- back to bringing back the written case read longest ago. Cases already on a
-- device stay there. No personal data is held in this table.
--
-- This file is deliberately NOT in supabase/migrations so it is never applied
-- automatically. Safe to run more than once.

DROP TABLE IF EXISTS public.generated_cases;
