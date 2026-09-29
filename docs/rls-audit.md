# Row Level Security audit

Run against the app's real migrations in an in-memory Postgres (`src/db/rls-audit.test.ts`, with
`rls.test.ts` and `deletion.test.ts` beside it). The tests are what keep this document true: they fail
if a table appears without RLS, if the signed-out role can read anything but the shared catalogues,
if a policy on people's data doesn't tie rows to the signed-in user, or if a stranger can see any row
about a person who has data in every table.

**Result: no table was missing RLS.** All 23 tables in the `public` schema have it enabled.

## What the audit found

| # | Finding | Severity | Status |
| - | ------- | -------- | ------ |
| 1 | `moderation_blocks` was readable by the signed-in role at the privilege level, with no policy behind it. RLS made it return nothing, so nothing leaked, but a privilege with no policy would start leaking the moment someone added a permissive policy. | Low | **Fixed** by `20260930100100_tighten_moderation_blocks.sql` (rollback in `docs/rollback/`). |
| 2 | Friends can read each other's `current_streak`, `longest_streak`, `total_xp` and `last_active_day` (profile columns), `daily_activity` and `user_achievements` directly, whatever the owner would prefer. That was the design before profile visibility existed. | Design | See "Profile visibility" below. |
| 3 | `argument_attempts` has an INSERT policy but the signed-in role has no INSERT privilege, so it can never fire. The server inserts with the service role. | Info | Left as is; harmless and documented here. |

## The tables

Legend: **RLS** enabled on every one. *Browser* = what the `authenticated` role can do; *guest* = the
`anon` role. "Server" means only server functions using the service-role key.

| Table | Holds | Guest | Browser (signed in) | Written by |
| ----- | ----- | ----- | ------------------- | ---------- |
| `profiles` | display name, handle, companion, progress totals, consent, age band | none | own row, and friends' public columns; a short list of columns writable | server (progress, consent); browser (settings/companion) |
| `daily_activity` | per-day counts | none | own, and friends' | server |
| `user_achievements` | badges | none | own, and friends' | server |
| `friendships` | who is connected | none | rows they are in; send request, accept, remove | browser under RLS |
| `shared_streaks` | shared streak state | none | ones they are in | server |
| `nudges` | a nudge between friends (no text) | none | rows they are in; send to a friend; mark read | browser under RLS |
| `debates` | motion, both cases, scores | none | ones they are in | server |
| `argument_attempts` | graded writing | none | own | server |
| `practice_sessions` | explain-it-back chats | none | own | server |
| `subscriptions` | plan status | none | own | server |
| `content_reports` | content reports | none | own; file one | browser (insert) |
| `moderation_blocks` | refused topics (identity removed on deletion) | none | **none** (after fix) | server |
| `consent_records` | every acceptance of the terms | none | none | server |
| `reward_chests`, `user_cosmetics`, `xp_weekly`, `league_results` | rewards and league | none | none | server |
| `rate_limits`, `server_locks`, `lesson_parts` | abuse counters, leases, in-progress lessons | none | none | server |
| `achievements`, `curriculum_lessons`, `drill_variants` | shared content, nothing personal | read | read | server |

## Who can see what of a person (tested)

With one person having a row in every table:

- **A stranger** sees no row about them anywhere.
- **A friend** sees only: the friendship, shared streaks and nudges and debates they are part of,
  the person's daily activity and badges, and the public profile columns (name, handle, companion,
  streak, XP, last active day). They cannot read the invite code, goal, daily goal, notification
  settings, gems, consent record or age band.
- **The person** sees their own.

## Deletion

Deleting an account removes the sign-in identity; every table holding a person references it with
`ON DELETE CASCADE` (or `SET NULL` for safety records kept for audit). `deletion.test.ts` checks the
foreign keys structurally, so a table added later that forgets to cascade fails the build, and seeds
a real account across every table to prove nothing remains. The one thing keyed by text, the abuse
counters, is removed by the server afterwards.
