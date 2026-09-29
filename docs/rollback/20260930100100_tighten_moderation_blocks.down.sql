-- ROLLBACK for supabase/migrations/20260930100100_tighten_moderation_blocks.sql
--
-- Gives the signed-in role its (useless) SELECT privilege on moderation_blocks back.
-- Row Level Security has no policy for it, so nothing becomes readable. No data changes.
--
-- This file is deliberately NOT in supabase/migrations so it is never applied
-- automatically. Safe to run more than once.

GRANT SELECT ON public.moderation_blocks TO authenticated;
