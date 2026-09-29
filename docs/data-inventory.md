# Lamppost data inventory

Written against the real schema so the Privacy Policy's "what we collect" section can be
reviewed for accuracy instead of adapted from a template. Update this file whenever the
schema changes, then update `src/lib/legal.ts`.

Last checked: 2026-09-30.

## Backend tables (public schema)

| Table | Data categories | Personal? | Written by | Deleted on account deletion |
| --- | --- | --- | --- | --- |
| `profiles` | display name, handle, invite code, companion appearance, onboarding flag, daily goal, learning goal (free text, 40 chars), notification prefs, current/longest streak, total XP, gems (lifetime earned, lifetime granted by reward chests, lifetime spent, and the balance between them), hint tokens held, friends-league tier, terms and privacy-policy versions accepted and when (server time), age band (`13-17` or `18+`, never the date of birth) and the guardian confirmation for 13-17, last active day, sync bookkeeping (`day_key_version`, `progress_synced_at`) | yes | settings and companion columns by the user; **progress columns by the server only** | deleted |
| `daily_activity` | per-day lesson counts (device-local calendar days) | yes (behavioural) | server only | deleted |
| `user_achievements` | achievement codes + unlock timestamps | yes | server only | deleted |
| `consent_records` | every acceptance of the Terms and Privacy Policy: versions, server time, age band, guardian confirmation (the profile holds only the latest) | yes | server only (`record_consent`) | deleted (cascade) |
| `reward_chests` | one row per reward chest opened: local day, source (lesson, review or challenge), what was inside (gems or a hint token), and whether a full hint pouch turned it into gems | yes (behavioural) | server only (the wallet functions) | deleted (cascade) |
| `user_cosmetics` | ids of the companion colours and accessories unlocked with gems, and when | yes | server only | deleted (cascade) |
| `xp_weekly` | XP credited to each Monday-start week (used by the friends league and the weekly recap) | yes (behavioural) | server only (the progress sync) | deleted (cascade) |
| `league_results` | one row per settled league week: the week, XP, rank, how many took part, tier before and after | yes (behavioural, visible to nobody else) | server only | deleted (cascade) |
| `achievements` | achievement catalogue (name, description, icon, criteria) | no | migrations | n/a |
| `friendships` | requester/addressee ids, status, requested/accepted timestamps | yes (social graph) | the two users (request, accept, remove) | deleted |
| `shared_streaks` | friendship id, proposer, status, count, last extended day | yes (social) | server only | deleted |
| `nudges` | sender/recipient ids, shared streak id, day, read timestamp | yes (social) | sender inserts; recipient marks read | deleted |
| `debates` | both participants, motion, both written answers, rubric scores and tips, winner status | yes (user-written text) | server only (it grades) | deleted (cascade) |
| `argument_attempts` | lesson id, the learner's written answer, rubric scores, tip | yes (user-written text) | server only (the grader stores it) | deleted (cascade) |
| `practice_sessions` | course/lesson, the tutor chat transcript, verdict, "remembered" sentence | yes (user-written text) | server only | deleted (cascade) |
| `subscriptions` | plan status, provider customer/subscription ids, period end | yes | server only (payments not yet enabled) | deleted (cascade) |
| `rate_limits` | fixed-window request counters: a policy name, an opaque caller key (`u:<user id>`, or `ip:` plus an HMAC of the network address — the address itself is never stored), a window start and a count | pseudonymous | server only | the account's `u:` rows are deleted; all rows are pruned after 3 days |
| `server_locks` | short leases on jobs in progress (for example "generating lesson X") | no | server only | n/a (expire in minutes) |
| `lesson_parts` | pieces of a lesson that isn't cached yet (idea card, drills, written task) while it is being written; cleared once the lesson is assembled | no (curriculum content, nothing about a learner) | server only | n/a (cleared on assembly; leftovers pruned after 2 days) |
| `curriculum_lessons`, `drill_variants` | shared AI-generated lesson and drill content | no | server only | n/a |
| `content_reports` | reason, free-text details, course slug/topic, lesson index/title, excerpt of flagged text, status | yes until anonymised | the reporting user | `user_id` set to null, report retained for audit |
| `moderation_blocks` | refused topic text, category, stage (input/output) | pseudonymous | server only | `user_id` set to null, row retained for audit |

"Server only" means the browser's database role has no write privilege on the table
(see `supabase/migrations/20260928200000_lock_server_owned_writes.sql` and the tests in
`src/db/rls.test.ts`); server functions write it with the service role after validating the
request. Private `profiles` columns (invite code, goal, daily goal, notification settings and
sync bookkeeping) are not readable through the browser role either, not even by friends; the
server reads the owner's row.

Identity itself (email address, password hash or Google identity, sessions) lives in the
managed auth schema and is removed when the account is deleted.

## No health/fitness columns exist

There is no dedicated health or fitness field anywhere in the schema. Fitness data can only
enter as free text the learner types into the course topic or goal, which is stored with the
generated course on-device and sent to the AI provider for that request.

## Device-local storage (not on the server)

`localStorage` keys prefixed `lamppost-`: generated courses and lesson content, lesson/review
progress, spaced-repetition schedule, streak/XP/gem cache, companion selection, onboarding
state, and one-time celebration flags. Cleared on account deletion from within the app and by
clearing browser storage.

## What leaves the app

| Recipient | Data sent | Purpose |
| --- | --- | --- |
| AI provider (via Lovable AI Gateway) | course topic, chosen setup answers (length, difficulty, quiz rigor, experience, focus), free-text goal, generated text for the safety screen | generate and screen course content |
| Backend/auth host | all backend tables above | hosting, auth, database |

No analytics SDK, ad network, or tracking pixel is installed. If one is ever added, update
`src/lib/legal.ts` (`COOKIES` and `PRIVACY`) **before** shipping it.

## Guardrails in the generation pipeline

- Input screen: `screenLocally` patterns, then an AI classifier (`screenTopicText`) — both in
  `src/lib/moderation*.ts`. A refusal means nothing is generated.
- Prompt-level rules: `CONTENT_POLICY_RULES` is appended to both generation system prompts.
- Output screen: `screenOutput` runs on the outline and every lesson chunk before it is shown.
- Refusals are logged to `moderation_blocks`; learners can report anything that slips through
  from the lesson screen, which writes to `content_reports`.

## Open items for legal review

1. Minimum age / COPPA position must be decided and written into `PRIVACY` and `TERMS`.
2. Operating legal entity, governing law, dispute resolution, liability limits.
3. Attorney-drafted injury waiver for the Health & Fitness Disclaimer.
4. DMCA designated agent details.
5. Confirmation that the current guardrails meet Apple/Google generated-content policy.
