-- ROLLBACK for supabase/migrations/20260929100100_lesson_parts.sql
--
-- Removes the holding area for lessons written in parts. Nothing else reads it: a
-- lesson that is fully written lives in curriculum_lessons, so no learner-visible
-- content is lost. Lessons that were half-written are simply written again from
-- the start. Run it together with reverting the code that uses lesson parts
-- (lesson-parts.server.ts): with the table gone and that code still live, opening
-- a lesson that is not cached yet fails until the warm-up has filled the cache.
--
-- This file is deliberately NOT in supabase/migrations so it is never applied
-- automatically. Run it by hand (Supabase dashboard -> SQL editor) as an
-- administrator. It is safe to run more than once.

DROP TABLE IF EXISTS public.lesson_parts;
