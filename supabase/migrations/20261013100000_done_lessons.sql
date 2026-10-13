-- Which lessons an account has finished, by lesson id.
--
-- Every unit is open from day one, so the number of lessons finished doesn't say which ones
-- they were. Until now that list lived only on the device, and a second device showed the right
-- XP and streak over an empty map. The list is kept by id, not position, so adding or
-- reordering a lesson never moves someone's progress onto a lesson they didn't do.
--
-- It only grows. syncProgress (service role) adds the ids a device reports, keeps only ids the
-- curriculum knows, and never removes one. Browser roles can't read or write it: profiles uses
-- column-level grants and this column isn't granted. Removing the account removes the row.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS done_lessons text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_done_lessons_bounded') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_done_lessons_bounded CHECK (cardinality(done_lessons) <= 200);
  END IF;
END
$$;
