# Row Level Security audit

Run against the app's real migrations in an in-memory Postgres (`src/db/rls-audit.test.ts`, with
`rls.test.ts`, `deletion.test.ts` and `social-safety-hardening.test.ts` beside it). The tests are what keep this document true: they fail
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
| 4 | New accounts got a handle built from the email address (`jane.smith.2011@…` became `janesmith2011`) or Google's full name, the full name became the display name, and any signed-in user could search names and handles from two letters over `/rpc`, unlimited. | High | **Fixed** by `20261019100000_social_safety_hardening.sql`: random `reader-…` handles and no display name until the person picks one (existing derived handles and copied full names replaced); `search_profiles(viewer, query)` matches handles only, from three characters, and only the service role can run it, after the `profileSearch` limit. |
| 5 | The browser could write its own display name and handle with no checks (a 9,600-character name and a "Lamppost Team ✔" handle got through) and insert friend requests directly, so any stranger could put free text in front of any learner. | High | **Fixed** (same migration): no browser write on `display_name`, `handle` or `friendships` INSERT; CHECK constraints on handle (`^[a-z0-9_-]{3,24}$`), display name (1–40) and daily goal (1–10); `updateMyProfile` and `sendFriendRequest` write with the service role after format checks, the local moderation screen, consent, a limit and at most 20 waiting requests. |
| 6 | `are_friends`, `has_friend_link` and `shares_progress_with` answered for any two people, so anyone signed in could map who is friends with whom. | Medium | **Fixed**: they answer only when the caller is one of the two (or is the server); `has_friend_link` was unused and is dropped. The policies built on them are unchanged and tested. |
| 7 | Nudges accepted any day (51 at once), ignored the recipient's in-app setting and any `shared_streak_id`; content reports had no size limit and could be filed as "actioned"; a debater could read the other side's answer and score before writing; reports about a person were deleted with that person; a worker whose lease had expired could release the next worker's. | Low | **Fixed** (same migration): the nudge policy needs a friend who takes nudges, a day within one of the server's and the pair's own streak; content reports are filed through a column grant without `status`, with length limits; the browser can read only the debate columns needed to list one; `user_reports.reported_user_id` is `ON DELETE SET NULL`; `release_lock` releases only the holder's lease. |
| 8 | The profile guard trigger listed the server-owned columns by hand and had fallen behind (consent, visibility, finished lessons). | Low | **Fixed**: it now lists the few columns the browser may change and refuses any other, including columns added later. |

## The tables

Legend: **RLS** enabled on every one. *Browser* = what the `authenticated` role can do; *guest* = the
`anon` role. "Server" means only server functions using the service-role key.

| Table | Holds | Guest | Browser (signed in) | Written by |
| ----- | ----- | ----- | ------------------- | ---------- |
| `profiles` | display name, handle, companion, progress totals, consent, age band | none | own row, and the public columns of a friend who has chosen to share; settings and companion columns writable | server (name, handle, progress, consent); browser (settings/companion) |
| `daily_activity` | per-day counts | none | own, and friends' | server |
| `user_achievements` | badges | none | own, and friends' | server |
| `friendships` | who is connected | none | rows they are in; accept, remove | server (requests); browser under RLS (accept, remove) |
| `shared_streaks` | shared streak state | none | ones they are in | server |
| `nudges` | a nudge between friends (no text) | none | rows they are in; send to a friend who takes nudges, for today; mark read | browser under RLS |
| `debates` | motion, both cases, scores | none | ones they are in, without answers, scores or tips | server |
| `argument_attempts` | graded writing | none | own | server |
| `practice_sessions` | explain-it-back chats | none | own | server |
| `subscriptions` | plan status | none | own | server |
| `content_reports` | content reports | none | own; file one (not its status), bounded | browser (insert) |
| `moderation_blocks` | refused topics (identity removed on deletion) | none | **none** (after fix) | server |
| `consent_records` | every acceptance of the terms | none | none | server |
| `user_blocks` | who blocked whom | none | the blocker's own rows (read only) | server (`block_user`) |
| `user_reports` | reports about people | none | **none** | server |
| `reward_chests`, `user_cosmetics`, `xp_weekly`, `league_results` | rewards and league | none | none | server |
| `rate_limits`, `server_locks`, `lesson_parts` | abuse counters, leases, retired in-progress lessons | none | none | server |
| `achievements`, `curriculum_lessons`, `drill_variants` | shared content, nothing personal (the last two retired) | read | read | server |

## Who can see what of a person (tested)

With one person having a row in every table:

- **A stranger** sees no row about them anywhere, can't ask whether they are friends with anyone, and can
  find them only by a search of their handle (three characters or more, through the server, rate limited).
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
`ON DELETE CASCADE` (or `SET NULL` for safety records kept for audit: content reports, moderation blocks,
and reports about people on both sides, so deleting an account never erases the reports about it). `deletion.test.ts` checks the
foreign keys structurally, so a table added later that forgets to cascade fails the build, and seeds
a real account across every table to prove nothing remains. The one thing keyed by text, the abuse
counters, is removed by the server afterwards.
