# Lamppost data inventory

Written against the real schema so the Privacy Policy's "what we collect" section can be
reviewed for accuracy instead of adapted from a template. Update this file whenever the
schema changes, then update `src/lib/legal.ts`.

Last checked: 2026-10-20.

## Backend tables (public schema)

| Table | Data categories | Personal? | Written by | Deleted on account deletion |
| --- | --- | --- | --- | --- |
| `profiles` | display name (none until the person picks one; 1–40 characters), handle (random, `reader-` and eight characters, until the person picks one; never built from the email or a full name), invite code, companion appearance, onboarding flag, daily goal, learning goal (free text, 40 chars), notification prefs, current/longest streak, total XP, gems (lifetime earned, lifetime granted by reward chests, lifetime spent, and the balance between them), hint tokens held, friends-league tier, terms and privacy-policy versions accepted and when (server time), age band (`13-17` or `18+`, never the date of birth) and the guardian confirmation for 13-17, profile visibility (`minimal` by default, or `friends`), last active day, finished lessons (`done_lessons`: lesson ids, only ever added to, at most 200), sync bookkeeping (`day_key_version`, `progress_synced_at`: the time up to which XP growth has been credited) | yes | settings and companion columns by the user; **name, handle and progress columns by the server only** (`updateMyProfile`, which checks and screens the name and handle) | deleted |
| `daily_activity` | per-day lesson counts (device-local calendar days) | yes (behavioural) | server only | deleted |
| `learning_state` | one document per account: the review queue (lesson, drill type, due day, spacing step, variants served), skill ratings per lesson, drill answers and scores (an answer over 1,500 characters is kept without its text), and the last 40 writing scores; known lessons only, each part capped | yes (behavioural) | server only (`syncLearningState`, merged, never removed by a sync) | deleted |
| `user_achievements` | achievement codes + unlock timestamps | yes | server only | deleted |
| `consent_records` | every acceptance of the Terms and Privacy Policy: versions, server time, age band, guardian confirmation (the profile holds only the latest) | yes | server only (`record_consent`) | deleted (cascade) |
| `user_blocks` | who blocked whom, and when (the blocked person cannot see it) | yes | server only (`block_user`); the blocker can read their own rows | deleted (cascade, either party) |
| `user_reports` | reports about a person: reporter, reported person, reason from a fixed list, optional note (1,000 chars), review status | yes | server only | stay, unlinked: reports they filed lose the reporter, reports about them lose the reported person (so deleting an account doesn't erase reports about it) |
| `reward_chests` | one row per reward chest opened: local day, source (lesson, review or challenge), what was inside (gems or a hint token), and whether a full hint pouch turned it into gems. **No longer written** (the reward economy was retired from the app in October 2026); existing rows are kept | yes (behavioural) | nothing now (was: server only, the wallet functions) | deleted (cascade) |
| `user_cosmetics` | ids of the companion colours and accessories unlocked with gems, and when. **No longer written**: every colour and accessory is free now; existing rows are kept | yes | nothing now (was: server only) | deleted (cascade) |
| `xp_weekly` | XP credited to each Monday-start week (used by the friends league and the weekly recap) | yes (behavioural) | server only (the progress sync) | deleted (cascade) |
| `league_results` | one row per settled league week: the week, XP, rank, how many took part, tier before and after | yes (behavioural, visible to nobody else) | server only | deleted (cascade) |
| `achievements` | achievement catalogue (name, description, icon, criteria) | no | migrations | n/a |
| `friendships` | requester/addressee ids, status, requested/accepted timestamps | yes (social graph) | requests by the server only (`sendFriendRequest`: rate limited, at most 20 waiting); accept and remove by the two users | deleted |
| `shared_streaks` | friendship id, proposer, status, count, last extended day | yes (social) | server only | deleted |
| `nudges` | sender/recipient ids, shared streak id, day, read timestamp | yes (social) | sender inserts (a friend who takes nudges, a day within one of the server's, the pair's own streak); recipient marks read | deleted |
| `debates` | both participants, motion, both written answers, rubric scores and tips, winner status. The browser role can read only the motion, sides and status; answers, scores and tips go through the server, which shows the other side's only once both have answered. A data export holds the person's own side and, once both answered, both totals | yes (user-written text) | server only (it grades) | deleted (cascade) |
| `argument_attempts` | lesson id, the learner's written answer, rubric scores, tip | yes (user-written text) | server only (the grader stores it) | deleted (cascade) |
| `practice_sessions` | course/lesson, the tutor chat transcript, verdict, "remembered" sentence | yes (user-written text) | server only | deleted (cascade) |
| `subscriptions` | plan status, provider customer/subscription ids, period end | yes | server only (payments not yet enabled) | deleted (cascade) |
| `rate_limits` | fixed-window request counters: a policy name, an opaque caller key (`u:<user id>`, or `ip:` plus an HMAC of the network address — the address itself is never stored), a window start and a count | pseudonymous | server only | the account's `u:` rows are deleted; all rows are pruned after 3 days |
| `server_locks` | short leases on jobs in progress (for example "generating lesson X"), and an opaque token for the worker holding each | no | server only | n/a (expire in minutes) |
| `lesson_parts` | pieces of an AI-written lesson while it was being written. **No longer written** (the AI lesson pipeline was retired in October 2026; lessons, reviews and the placement check use the authored steps) | no (curriculum content, nothing about a learner) | nothing now | n/a |
| `curriculum_lessons`, `drill_variants` | shared AI-generated lesson and drill content. **No longer written or read** (retired with the AI lesson pipeline); existing rows are kept | no | nothing now | n/a |
| `generated_cases` | one AI-written daily case per local day (the case and the model name), served to learners who have read every written case | no (case content, nothing about a learner) | server only | n/a |
| `content_reports` | reason, free-text details (2,000 chars), course slug/topic, lesson index/title, excerpt of flagged text (4,000 chars), status (set by the server; filed as open) | yes until anonymised | the reporting user | `user_id` set to null, report retained for audit |
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
progress, spaced-repetition schedule (including the 30/60/120-day upkeep of finished units),
streak/XP cache (plus the retired gem fields), the AI consent answer (`lamppost-ai-consent-v1`: when
the person agreed and the provider they agreed to, never sent to the server), the before-and-after unit check results
(`lamppost-unit-checks-v1`: right/total/day per unit for the before, after and three-months-later
checks, never sent to the server), the daily cases read (`lamppost-case-v1`: case id, local day
and how many of its three questions were right, plus copies of the last 30 AI-written cases this
device was given, never sent to the server; the streak and XP it earns travel with the rest of
the progress sync), companion selection, onboarding state, and
one-time celebration flags. The progress save (`lamppost-progress-v1`) also holds `lessonsByDay`
(lessons finished per local day; the daily goal and every "lessons" count read it) and
`placedLessonIds` (lessons the onboarding placement check marked done that haven't been played
since). A save that can't be read is copied, unchanged, to `lamppost-progress-v1-unreadable`
before anything is written over it. Cleared on account deletion from within the app and by
clearing browser storage.

`sessionStorage` holds two keys, each removed as soon as it is read and on "Clear progress on this
device": `lamppost-auth-redirect`, the same-site page to return to after a Google or Apple sign-in on
the website and when it was saved (only a local path is kept, and it is ignored after ten minutes),
and `lamppost-lesson-run`, held when a signed-out learner leaves "Explain it back" to sign in: the
lesson's id, the ids of the lessons finished before it, the XP the run earned and the time (ignored
after thirty minutes), so the finish afterward is the one they would have seen.

The iPhone and Android apps keep exactly the same on-device storage, inside the app's own web view
storage; it is removed with the app. Android cloud backup is off (`allowBackup="false"`), so none of
it is copied to the person's Google backup.

## What leaves the app

| Recipient | Data sent | When | Purpose |
| --- | --- | --- | --- |
| AI provider (Google's Gemini API) | what the learner typed for the tutor, the written-argument grader, a debate answer, or pasted into Check something you saw, and the small piece of lesson text those need; never email, name, handle, friends or history. Pasted text is used for that one reply and not stored by Lamppost | only when one of those features is used, after the learner has agreed once on that device | AI replies and feedback |
| AI provider | lesson, drill and daily-case generation prompts (curriculum text, no learner data) | server-side, when content is missing from the cache, or a day's case is needed after the written cases run out | write lessons, drills and daily cases |
| Database and sign-in (Supabase) | all backend tables above | signed-in use | hosting, auth, database |
| Cloudflare (Workers) | every request to the app: network address, browser details and the request itself. Workers Logs (on in `vite.config.ts`) keep the server's own log lines and each request's details, which can include the network address, for 3 days on the free plan or 7 on a paid one | every visit | runs the app and its server functions |
| Google or Apple (sign-in) | the account identity | only if the learner chooses Continue with Google or Continue with Apple | sign in |
| api.qrserver.com | the invite link (contains the invite code) | only if the learner taps Show QR code | draw the QR code |

Rate limits key a caller by account and by network: the address is read from the header named by
`CLIENT_IP_HEADER` (Cloudflare's own by default), an IPv6 address is reduced to its /64 network, and
only an HMAC of that is stored in `rate_limits`, never the address.

No analytics SDK, ad network, or tracking pixel is installed. If one is ever added, update
`src/lib/legal.ts` (`COOKIES` and `PRIVACY`) **before** shipping it.

## Guardrails in the generation pipeline

- Input screen: `screenLocally` patterns (`src/lib/moderation.ts`) on any text a learner sends. A
  refusal means nothing is generated. (`screenTopicText`, an AI classifier for open-ended topics, is
  kept in `moderation.server.ts` but has had no caller since course generation was removed.)
- Prompt-level rules: every model call passes its system prompt through `withGuardrails()` (`src/lib/ai-guardrails.server.ts`), which appends `CONTENT_POLICY_RULES` and the scope rules (critical thinking only, learner text is data, no medical/legal/financial advice). `src/lib/ai-guardrails.test.ts` fails if a call skips it.
- Output screen: `screenOutput` runs on every generated text before it is stored or shown: AI daily
  cases, the tutor, writing feedback, debate motions and grades, and Check something you saw.
- Refusals are not logged at the moment: `logModerationBlock` writes to `moderation_blocks` but
  nothing calls it, so the table stays empty. Every AI-written reply, case, motion and grade has a
  report button, which writes to `content_reports` (signed out, it offers an email instead).
- Consent: before the first text a learner types reaches the AI, the app asks once and keeps the
  answer on the device (`lamppost-ai-consent-v1`: when, and the provider agreed to).

## Open items for legal review

1. The age position: accounts start at 13, and 13-17 needs a guardian confirmation (a checkbox, no
   verification). Confirm this is enough for the places you launch in (US, EU/UK national ages of digital
   consent, app-store rules).
2. Operating legal entity, governing law, dispute resolution, liability limits (`legal-config.ts`).
3. DMCA designated agent details.
4. How long the hosting provider keeps backups, and whether the AI provider keeps or trains on requests.
5. Reports about people: kept, unlinked, when either the reporter or the reported person deletes their
   account (reason, note and status remain; neither identity). Confirm that retention is acceptable.
6. Confirmation that the current guardrails meet Apple/Google generated-content policy.
