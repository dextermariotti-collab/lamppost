-- Rollback for supabase/migrations/20261013100000_done_lessons.sql.
--
-- Drops the account's list of finished lessons. Devices keep their own copy, and the app reads
-- a missing column as "nothing stored on the account", so nothing else needs to change.
-- Safe to run more than once.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_done_lessons_bounded;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS done_lessons;
