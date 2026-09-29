# Row Level Security audit

Run against the app's real migrations in an in-memory Postgres (`src/db/rls-audit.test.ts`, with
`rls.test.ts` and `deletion.test.ts` beside it). The tests are what keep this document true: they fail
if a table appears without RLS, if the signed-out role can read anything but the shared catalogues,
if a policy on people's data doesn't tie rows to the signed-in user, or if a stranger can see any row
about a person who has data in every table.

**Result: no table was missing RLS.** All 25 tables in the `public` schema have it enabled (the audit was first run on 23; `user_blocks` and `user_reports` came with the social-safety migration).

## What the audit found

| # | Finding | Severity | Status |
| - | ------- | -------- | ------ |
| 1 | `moderation_blocks` was readable by the signed-in role at the privilege level, with no policy behind it. RLS made it return nothing, so nothing leaked, but a privilege with no policy would start leaking the moment someone added a permissive policy. | Low | **Fixed** by `20260930100100_tighten_moderation_blocks.sql` (rollback in `docs/rollback/`). |
| 2 | Friends could read each other's `current_streak`, `longest_streak`, `total_xp` and `last_active_day` (profile columns), `daily_activity` and `user_achievements` directly, whatever the owner would prefer. That was the design before profile visibility existed. | Design / privacy | **Fixed** by `20260930100200_blocks_reports_visibility.sql`: those reads now need the owner's `profile_visibility = 'friends'` (default `minimal`). Search and invite lookup stopped returning a streak to strangers. Rollback in `docs/rollback/`. |
| 3 | `argument_attempts` has an INSERT policy but the signed-in role has no INSERT privilege, so it can never fire. The server inserts with the service role. | Info | Left as is; harmless and documented here. |

## The tables

Legend: **RLS** enabled on every one. *Browser* = what the `authenticated` role can do; *guest* = the
`anon` role. "Server" means only server functions using the service-role key.

| Table | Holds | Guest | Browser (signed in) | Written by |
| ----- | ----- | ----- | ------------------- | ---------- |
| `profiles` | display name, handle, companion, progress totals, consent, age band | none | own row, and the public columns of a friend who has chosen to share; a short list of columns writable | server (progress, consent); browser (settings/companion) |
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
| `user_blocks` | who blocked whom | none | the blocker's own rows (read only) | server (`block_user`) |
| `user_reports` | reports about people | none | **none** | server |
| `reward_chests`, `user_cosmetics`, `xp_weekly`, `league_results` | rewards and league | none | none | server |
| `rate_limits`, `server_locks`, `lesson_parts` | abuse counters, leases, in-progress lessons | none | none | server |
| `achievements`, `curriculum_lessons`, `drill_variants` | shared content, nothing personal | read | read | server |

## Who can see what of a person (tested)

With one person having a row in every table:

- **A stranger** sees no row about them anywhere.
- **A friend, by default** (profile visibility `minimal`) sees only: the friendship, shared streaks and
  nudges and debates they are part of. The profile row, daily activity and badges are unreadable.
- **A friend of someone who has chosen to share** (`friends`) also sees the daily activity, badges and the
  public profile columns (name, handle, companion, streak, XP, last active day). They still cannot read the
  invite code, goal, daily goal, notification settings, gems, consent record, age band or visibility.
- **Someone blocked** cannot find the blocker in search or by invite code, cannot send a request (the
  database refuses, with the same vague message as any failure), and cannot read the block. Blocking ends
  any friendship, its shared streak and the nudges and unfinished debates between the two.
- **The person** sees their own.

## Deletion

Deleting an account removes the sign-in identity; every table holding a person references it with
`ON DELETE CASCADE` (or `SET NULL` for safety records kept for audit). `deletion.test.ts` checks the
foreign keys structurally, so a table added later that forgets to cascade fails the build, and seeds
a real account across every table to prove nothing remains. The one thing keyed by text, the abuse
counters, is removed by the server afterwards.
