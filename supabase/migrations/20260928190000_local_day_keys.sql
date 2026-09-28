-- Day keys used to be UTC dates; the app now keys every activity by the device's
-- LOCAL calendar date. Accounts start at version 1 (legacy). The first sync from
-- a client that has migrated its own history to local days replaces the account's
-- old UTC-keyed daily_activity window once and moves the account to version 2.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS day_key_version smallint NOT NULL DEFAULT 1;
