# Lamppost data inventory

Written against the real schema so the Privacy Policy's "what we collect" section can be
reviewed for accuracy instead of adapted from a template. Update this file whenever the
schema changes, then update `src/lib/legal.ts`.

Last checked: 2026-08-28.

## Backend tables (public schema)

| Table | Data categories | Personal? | Deleted on account deletion |
| --- | --- | --- | --- |
| `profiles` | display name, handle, invite code, companion appearance (preset/palette/accessory/expression), onboarding flag, daily goal, notification prefs, current/longest streak, total XP, gems, last active day | yes | deleted |
| `daily_activity` | per-day lesson counts | yes (behavioural) | deleted |
| `user_achievements` | achievement codes + unlock timestamps | yes | deleted |
| `achievements` | achievement catalogue (name, description, icon, criteria) | no | n/a |
| `friendships` | requester/addressee ids, status, requested/accepted timestamps | yes (social graph) | deleted |
| `shared_streaks` | friendship id, proposer, status, count, last extended day | yes (social) | deleted |
| `nudges` | sender/recipient ids, shared streak id, day, read timestamp | yes (social) | deleted |
| `content_reports` | reason, free-text details, course slug/topic, lesson index/title, excerpt of flagged text, status | yes until anonymised | `user_id` set to null, report retained for audit |
| `moderation_blocks` | refused topic text, category, stage (input/output) | pseudonymous | `user_id` set to null, row retained for audit |

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
