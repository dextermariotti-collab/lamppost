# Profile rebuild: identity, stats, achievements, friends

Rebuild the Profile screen as a real profile — identity, stats, achievements, social, settings — and add account-backed progress plus a friends & shared-streak system.

## What the page becomes

Top to bottom, replacing the current stub:

1. **Identity header** — 56px companion avatar (tap opens the companion picker), display name, subline `Learning with Scout · Joined Aug 2026`, settings gear top-right. No "Profile" title. Name falls back to the email prefix when unset.
2. **Stats row** — three tappable tiles: flame / day streak, bolt / total XP, trophy / league. League is derived from the existing XP mastery tiers (Novice → Learning → Proficient → Mastered). Zero values render in muted style, not bold black.
3. **Achievements strip** — horizontal scroll of 44px circular badges, unlocked (accent + icon) and locked (gray + lock) both visible: first lesson, 7-day streak, 100 XP, perfect week, first friend, first 7-day shared streak. Tapping opens a sheet with description, unlock criteria, date earned, and share for unlocked ones.
4. **Add friends row** — person-plus icon, "Add friends", "Learn together and keep each other's streak alive". Right side is a chevron when alone, or stacked avatars + "N friends".
5. **Settings list** — flat rows with hairline dividers: daily goal (shows current value), change companion, notifications, edit profile.
6. **Sign out** — muted, small, no card, at the bottom of the scroll.

## New screens

- **`/settings`** — account settings hub reached from the gear: display name, email, notification toggles (including friend nudges, in-app and email), daily goal.
- **`/friends`** — friends list plus three ways to add: handle search with live results, a shareable invite link (with QR), and an "invites & requests" section for incoming/outgoing requests. Each friend row shows avatar, name, personal streak, and a flame badge with the shared-streak count when one is active. Contacts sync is out of scope.
- **`/friends/$handle`** — public profile card: avatar, name, streak, visible achievements.
- **`/invite/$code`** — deep-linked accept screen: "Accept friend request from {name}".

## Shared streaks

Either friend can propose a shared streak; the other accepts. Both must complete at least one lesson that day or it resets to 0. Personal streaks and other shared streaks are unaffected. Milestones at 7/30/100/365 trigger a celebration for both (reusing the existing Confetti component) and feed the achievement. Max 5 active shared streaks per user. Nudges are one tap, rate-limited to one per pair per day, delivered in-app and by email.

Later phase, left room for but not built: friends-only weekly XP leaderboard, "currently studying" signal, co-op lessons.

## Progress moves to the account

Streak, XP, gems and daily activity currently live only in the browser, so friends can't see them and progress doesn't follow you between devices. This build moves them into the account:

- Server-side progress records per user; the local store becomes a cache that writes through on lesson completion and review.
- On first sign-in after this change, existing local progress is merged into the account once (highest values win) so nobody loses their streak.
- Course/lesson content stays local as it is today; only the progress numbers sync.

## Technical notes

New tables (with RLS + grants, all owner-scoped except the deliberately friend-readable views):

- `profiles` gains `handle` (unique, generated from name/email at signup), `joined_at` via existing `created_at`, `current_streak`, `longest_streak`, `total_xp`, `gems`, `last_active_day`, `notify_nudges_email`, `notify_nudges_inapp`, `daily_goal`.
- `daily_activity` — `user_id`, `day`, `lessons_completed` (drives shared-streak evaluation and perfect week).
- `achievements` — seeded catalogue: `code`, `name`, `description`, `icon`, `criteria`.
- `user_achievements` — `user_id`, `achievement_code`, `unlocked_at`.
- `friendships` — `requester_id`, `addressee_id`, `status` (pending/accepted), `requested_at`, `accepted_at`, unique unordered pair.
- `shared_streaks` — `friendship_id`, `status`, `current_count`, `started_at`, `last_extended_day`.
- `nudges` — `from_user_id`, `to_user_id`, `shared_streak_id`, `sent_at`, unique per pair per day.

A `friends_can_view` security-definer helper gates friend-visible reads (streak, XP, achievements) so accepted friends can read each other's public fields without opening the tables to everyone.

Server functions under `src/lib/` (`profile.functions.ts`, `friends.functions.ts`, `achievements.functions.ts`) behind `requireSupabaseAuth` handle search, requests, shared-streak proposal/accept, nudge sending, streak extension and achievement unlocking. Shared-streak reset and achievement evaluation run on read (lazy evaluation against `daily_activity`) so no cron is needed. Nudge emails go through the existing email setup; if no sender domain is configured yet, in-app nudges ship and email is switched on once a domain is verified.

All profile/friends routes live under the authenticated area; signed-out visitors are sent to `/auth`.
