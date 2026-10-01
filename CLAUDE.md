# CLAUDE.md

Lamppost is a critical-thinking trainer: a fixed 7-unit / 35-lesson curriculum, each lesson
interactive steps (ending on a harder real-world case) → the idea in full (the lesson's notes) → a
graded written argument → an "explain it back" tutor chat. It is a mobile-first web app (a 420px "phone frame" that also runs on desktop), built with
Lovable and two-way synced with this repo.

## Read this first

- **Lovable sync.** `main` syncs both ways with Lovable. Never push to `main`, never force-push,
  rebase, amend or squash pushed commits (see `AGENTS.md`). Work on a branch and open a PR. Keep
  every pushed commit buildable — commits on the connected branch show up in the Lovable editor.
- **Don't hand-edit generated files:** `src/routeTree.gen.ts`, `src/integrations/supabase/*`
  (client, server client, middleware, types), `drizzle/schema.ts`, `.env`.
- **Two migration folders.** `supabase/migrations/` (timestamped, Lovable Cloud) and
  `drizzle/migrations/` (drizzle-kit). Both are applied to the same Postgres. Add new SQL to
  `supabase/migrations/` with a later timestamp than the newest file there.

## Commands

```sh
npm install --no-package-lock   # see "Dependencies" below
npm run dev                     # vite dev
npm run build                   # production build (nitro, Cloudflare-style worker output)
npm test                        # vitest run (pure logic + a few jsdom component tests)
npx tsc --noEmit                # typecheck
npx eslint <files>              # lint (prettier is an eslint rule)
```

Baseline you should not make worse: `tsc` reports one pre-existing error
(`src/routes/__root.tsx` `errorComponent` prop type) and eslint reports pre-existing
`prettier/prettier` noise in a few generated or Lovable-authored files (`types.ts`, `badges.ts`,
`BadgeIcon.tsx`, `CompanionAura.tsx`, `share-image.ts`, `settings.tsx`, `previewAuthStorage.ts`)
plus three non-prettier errors (`prefer-const` in `previewAuthStorage.ts`, two `no-explicit-any`
in `practice.functions.ts`). Format only the files you touch; do not run `prettier --write .` (it
rewrites those unrelated files and creates sync conflicts with Lovable).

**Dependencies.** `bun.lock` is the canonical lockfile but it points at Lovable's private
package mirror, which returns 403 outside Lovable's sandbox. `package-lock.json` is stale and does
not match `package.json`. Outside Lovable, install with `npm install --no-package-lock` and don't
commit lockfile churn you can't verify.

## Stack

TanStack Start (React 19, file routes in `src/routes`, server functions via `createServerFn`),
Tailwind v4 (tokens in `src/styles.css`), shadcn/Radix primitives in `src/components/ui`,
Supabase (auth + Postgres + RLS) via `@supabase/supabase-js`, Vercel AI SDK talking to the
Lovable AI Gateway (`LOVABLE_API_KEY`). TypeScript is `strict` with `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes` — index access returns `T | undefined`, and optional props must be
omitted, not set to `undefined`.

## Architecture

### Client-authoritative, local-first
Everything a learner does works **signed out**. State lives in `localStorage` (`lamppost-*` keys)
and is read through small external stores (`useSyncExternalStore` or event-listener hooks):

| Key | Module | Holds |
| --- | --- | --- |
| `lamppost-progress-v1` | `lib/progress.ts` | XP, gems, streak, freezes, hint tokens, unlocked cosmetics, chests opened today + history, weekly XP, per-day `history`, per-course lesson counts, the finished lessons (`doneLessons`) |
| `lamppost-courses-v1` | `lib/course-store.ts`, `lib/curriculum-store.ts` | the curriculum course + downloaded lesson content |
| `lamppost-exercises-v1` | `lib/exercise-store.ts` | every drill attempt (`lessonId#index`) |
| `lamppost-review-drills-v1` | `lib/review-drills.ts` | spaced-repetition queue (1d → 3d → 7d → 14d) |
| `lamppost-challenge-v1`, `-rating-v1`, `-written-v1`, `-levels-v1`, `-badges-v1`, … | `lib/challenge.ts`, `rating.ts`, `mastery.ts`, … | daily challenge, skill ratings, rubric scores, level-ups, badges |
| `lamppost-unit-checks-v1` | `lib/unit-checks.ts` | before/after unit check results (first result kept, never overwritten; device only) |

Signed-in users additionally get a Supabase account: `useProgress` pulls the account's numbers on
sign-in and pushes changes through the `syncProgress` server function (`lib/profile.functions.ts`).
Because lessons are completed in the browser, **the server can bound and record progress but cannot
prove a lesson was done** — see "Security model".

### Progress, streaks and days
- **Every unit is open from day one.** The 35 lessons have a suggested order, not a lock: any lesson can
  be started, and finishing one records *that* lesson (`doneLessons`, 0-based indexes; `courses[slug].completed`
  is always its size). A save from before this has only the count and reads as the first N lessons
  (`doneLessonIndexes`). Use `useProgress().doneLessons` (a `Set`) with `nextLessonIndex`, `unitProgress` and
  `unitEntryIndex`; never treat `completed` as "everything before this is done".
- **The day boundary is the device's local calendar day**, as a `YYYY-MM-DD` key. Use
  `dayKey()` / `shiftDay()` from `lib/days.ts` (never `toISOString().slice(0, 10)`, which is UTC).
  History keys, `lastActiveDay`, freeze logs, review due dates and the daily challenge all use it.
- Streak rules live in `lib/streak.ts` (pure, unit-tested): completing a lesson/review/challenge
  advances the streak once per day; missed days are covered by held freezes; every screen displays
  the streak through the same selector so they cannot disagree.
- Server functions that need "today" take the caller's local day as an argument and sanity-check it
  against the server clock — they don't call `utcDay()` for user-facing logic.
- Any component that shows a number from `useProgress()` must render it directly. **Do not
  animate a value up from an initial `0`** — on first client render `useSyncExternalStore` returns
  the SSR snapshot (all zeros) and an animation that never runs leaves the zeros on screen (this
  regressed once already; see `components/CountUp.tsx` and its test).

### Streak freezes, the retired reward economy, and the friends league
Streak freezes are earned, never bought: one free every 7 days of streak, up to `MAX_FREEZES`.
**Gems, reward chests, hint tokens and companion cosmetics were retired from the app (October 2026).**
Their tables and SQL functions (`reward_chests`, `user_cosmetics`, `spend_gems()`, the `profiles`
wallet columns) are still in the database and nothing stored was deleted, so they can come back;
the screens, the client and server functions that bought or opened things, and their rate limits
are gone, and `/rewards` redirects to Progress. Nothing earns gems any more: the `gems` fields stay
in the saved state and in each sync only so accounts stay consistent (`syncProgress` still bounds
them and `firstSyncCarryOver` still checks what an old device carries, using `lib/rewards.ts`).
Every companion colour and accessory is free. Don't reintroduce a purchase on the client: if gems
return, they go through `spend_gems()` on the server with a server-held price.

The league (`lib/league.ts`, `league.functions.ts`, `/league`) compares weekly XP among accepted
friends only (`league_standings` joins through `are_friends`). Weeks start Monday in local day keys
(`lib/weeks.ts`). Only the most recent finished week is judged, once (`apply_league_result` is
idempotent), and a quiet week never demotes anyone. No copy in these screens may create urgency:
no countdowns, "only N left", or guilt notifications. The Monday recap (`lib/recap.ts`) is built
from the device's own history and shows nothing for an empty week.

### Measuring transfer: before/after unit checks
Each unit has a three-question check before it and a different three after it
(`content/unit-checks.ts`): real-world posts, ads, headlines, emails and chatbot answers that no
lesson uses, no hints, first answer only (`CheckQuestion`). The before-check closes once any of the
unit is studied and the after-check opens when all five lessons are done (`checkAvailability`);
results are kept the first time and never overwritten. They show on My Path and in Progress →
Before and after, always framed as a rough signal. `content/unit-checks.test.ts` keeps them fresh
(no overlap with lesson text), fair (answer positions and lengths) and well-formed.

### Authored lessons and notes
Every lesson is written as data: `content/lessons/<unit>.ts` holds its steps (schema and cross-field
rules in `lib/steps/types.ts`, one component per step kind in `components/steps`), the takeaway and the
writing task, and `content/notes/<unit>.ts` holds its notes (`lib/lesson-notes.ts`: the hook shown above
the first step, the idea, key terms, a worked example, two subtleties, a question to carry and something
to try this week). `StepLesson` plays them; problem first, explanation after, so the notes come after
the steps and only open in the `/notes` library once the lesson is done. Each lesson's last step is a
harder "Putting it together" case. `lessons.test.ts` and `notes.test.ts` hold both to their word limits,
answer-position balance and the content rules in `content/content-rules.ts` (made-up names, no party
line). The generated pipeline below is the fallback (`LegacyLesson`) and still feeds reviews, the daily
challenge and the placement check.

### Lesson content pipeline
`lib/curriculum.ts` is the single source of truth for the 35 lessons (objective, key idea, the trap
each drill must test, the ordered **drill plan**, and the written task type). Content is generated
once per lesson by the AI gateway, validated by a second AI pass, and cached in
`curriculum_lessons`; validated drills also seed the shared `drill_variants` pool that reviews, the
daily challenge and the placement check draw from. Relevant files: `curriculum-generate.server.ts`,
`exercise-ai.server.ts` (prompts + normalisers), `exercise-validate.server.ts`, `drills.functions.ts`,
and `routes/api/public/warm-curriculum.ts` (token-protected warm-up endpoint). Bump
`CONTENT_VERSION` in `curriculum-generate.server.ts` whenever prompts, drill plans or validators
change so stale cached lessons are regenerated.

**A cold cache must not block a learner.** The warm-up writes whole lessons ahead of time, but a
lesson that is missing (a `CONTENT_VERSION` bump before the warm-up has run) is written in parts on
demand (`lib/lesson-parts.ts`, `lesson-parts.server.ts`, table `lesson_parts`): `getCurriculumLesson`
returns as soon as the idea card exists, the browser then asks `getLessonPart` for each drill and the
written task in parallel, and the request that stores the last part assembles the lesson into
`curriculum_lessons`. `lib/lesson-loader.ts` drives this in the browser and the lesson screen shows
the idea card and fills drills in as they arrive. Every part is generated under a per-part lease and
the `lessonPart` rate limit; parts already written are read, never counted.

### UI shell
Every screen renders inside `components/PhoneFrame.tsx` (bottom nav on phones, sidebar layout at
≥1024px). Design tokens are CSS variables in `src/styles.css`. Every screen shares one light and one
dark set (Settings switches between them): don't re-theme a single screen, because a screen that changes
colour and type on its own reads as a different app (the Home and course-map screens used to). Text colours
must meet WCAG AA (4.5:1 body, 3:1 large/graphics) in both sets — `styles.contrast.test.ts` checks it.
The tone is a calm coach: the companion sits at the edges (a small avatar beside feedback, the tutor chat,
the sign-up screens) and never shouts; the league lives under Friends, and there is nothing to buy
or open.

My Path (`/courses`) is the only map: each unit opens in place into its five lessons, and a finished
lesson's row links to its notes (`/notes`, also under Progress). Home answers "what
should I do now?" (the next lesson, one line about reviews, the seven units as a strip) and the skills graph
lives under Progress → Skills → Map. `/course/:slug` redirects to My Path. Onboarding is three screens
(intro, one real question, setup); choosing a companion is offered once, after the first lesson.

## Security model (read before touching Supabase)

- RLS is on for every table, and the browser roles hold **no write privilege** except a short
  allowlist: companion/settings columns on `profiles` (column-level `GRANT`), friend requests,
  nudges and content reports. Progress columns (`total_xp`, `gems`, streaks, `last_active_day`),
  `daily_activity`, `user_achievements`, `shared_streaks`, debates, `argument_attempts` and
  `practice_sessions` are written **only by server functions using the service-role client**
  (`client.server.ts`, loaded with a dynamic `import()` inside handlers so it never ships to the
  browser). Private `profiles` columns (invite code, goal, settings) are not readable by the
  browser role either — read the owner's row on the server. Don't add a client-side write path
  for any of this; `src/db/rls.test.ts` runs the real migrations in an in-memory Postgres and fails
  if the allowlist grows. `syncProgress` (`profile.functions.ts`) is the only way progress reaches
  the account: it recomputes the streak from stored activity and bounds XP/gems and back-dating
  (`lib/progress-limits.ts`) — it cannot prove a lesson was done.
- **Gems (retired) were spent only on the server.** The account keeps `gems_earned` (reported by
  devices in each sync, bounded, only rises) and `gems_spent` (changed only by `spend_gems()`, one
  atomic statement). Nothing calls it now; if anything is ever sold again, it goes through that
  function with a server-held price, never a price from the request.
- **League results are server-only writes** (`xp_weekly`, `league_results`, `profiles.league_tier`),
  as were the retired `reward_chests`, `user_cosmetics`, `profiles.gems_granted` / `hint_tokens`,
  through service-role SQL functions that browser roles cannot run. The rollback is
  `docs/rollback/20260929110000_rewards_and_league.down.sql`. What a companion wears is an ordinary
  profile column the browser can write, and every option is free.
- **Consent and age.** `record_consent` (service role only) stamps the acceptance time on the server and
  is the only writer of `profiles.terms_version/privacy_version/terms_accepted_at/age_band/guardian_confirmed`
  and `consent_records`. Only an age band is stored, never a date of birth. A signed-in account that has not
  accepted the current `TERMS_VERSION`/`PRIVACY_VERSION` (`lib/legal-config.ts`) is sent to `/consent` by
  `ConsentGate`; an unmigrated database reads as "unknown" and enforces nothing. Bump the version constants
  when a legal document changes in a way people should be asked about again. Every fact only the owner can
  supply (company, contact email, state, dates) is a `[PLACEHOLDER]` in `legal-config.ts`.
- **Account deletion is one step:** removing the sign-in identity cascades to every table. A new table that
  holds a person's data must reference `auth.users` with `ON DELETE CASCADE` (or `SET NULL` for safety
  records); `src/db/deletion.test.ts` and `src/db/rls-audit.test.ts` fail otherwise, and fail if a public
  table is added without RLS.
- **Social safety.** `profiles.profile_visibility` is `minimal` (name, handle and avatar only) unless the
  person turns on sharing; friends can then also see streak, XP, badges and activity, and both people
  must share to be in each other's league. The RLS policies on `profiles`, `daily_activity` and
  `user_achievements` go through `shares_progress_with()`, and any server function that returns a
  friend's numbers must go through `toCard(row, true)` in `friends.functions.ts` (which checks it too).
  Blocks and reports are written only by `safety.functions.ts` (`block_user()` ends the friendship, its
  shared streak, nudges and open debates in one transaction; a trigger refuses requests between a blocked
  pair). Search and invite lookup never return a streak. Every model call passes its system prompt through
  `withGuardrails()` (`ai-guardrails.server.ts`); `ai-guardrails.test.ts` scans the source and fails if a
  call skips it.
- **Public AI endpoints are rate limited in the database** (`lib/rate-limit.ts` holds the numbers,
  `rate-limit.server.ts` enforces them and **fails closed**). Cached content is served without
  touching the limiter; only a cache miss that would call the model is counted, under a per-job
  lease (`guardedGeneration`). Cap the length of every field a public function forwards to a model.
  Network addresses are only ever stored as an HMAC.
- Migrations that tighten access ship **in the same PR as the code that needs them**, with a
  tested rollback in `docs/rollback/` (never in `supabase/migrations/`, which is auto-applied).
- `requireSupabaseAuth` verifies the bearer token and gives handlers a per-user client that
  respects RLS. Use it on every mutating server function. Public server functions (lesson fetch,
  drill pool, grader) call the AI gateway with server-held credentials — keep inputs bounded.
- Secrets: only `SUPABASE_URL` and the publishable (anon) key are in `.env`; those are public by
  design. `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY` and `WARM_TOKEN` must exist only as
  server environment variables. Never add them to `.env` or client code.
- User-generated text goes through `lib/moderation.ts` (`screenLocally`) before it reaches a model,
  and generated text through `screenOutput`.
- When the schema changes, update `docs/data-inventory.md` and `src/lib/legal.ts` (privacy policy).

## Testing

Vitest (`npm test`). Pure logic (`lib/days.ts`, `lib/streak.ts`, `lib/progress-core.ts`, curriculum
invariants, colour contrast of `styles.css`) is tested in node; component tests use jsdom; the
database rules run against the real migrations in pglite (`src/db`). Tests that depend on the timezone set it
explicitly (`process.env.TZ`) — the day-boundary suite simulates 9pm US Eastern. When you fix a bug
in progress/streak/day logic, add the failing case to those suites first.

## Conventions

- Match the surrounding code: no new comments unless they explain a non-obvious *why*.
- Copy is short and plain; the app talks to learners as a calm coach, not a game show.
- Prefer server-side truth for anything social (friends, shared streaks, debates); prefer
  local-first for anything a signed-out learner can do.
