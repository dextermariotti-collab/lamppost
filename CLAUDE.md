# CLAUDE.md

Lamppost is a critical-thinking trainer: a fixed 7-unit / 35-lesson curriculum, each lesson
interactive steps (ending on a harder real-world case) → the idea in full (the lesson's notes) → a
graded written argument → an "explain it back" tutor chat. It is a **mobile app for iOS and Android**
(Capacitor, `docs/mobile.md`) and a website, from one codebase: the screens are a 420px "phone frame"
that also runs on desktop. It was started in Lovable and moved off it in October 2026: it builds with
plain Vite, the backend deploys to Cloudflare Workers, and it uses a Supabase project and a Gemini
API key of its own (`docs/deploy.md`).

## Read this first

- **Branches.** Never push to `main`, never force-push, rebase, amend or squash pushed commits (see
  `AGENTS.md`). Work on a branch and open a PR; CI must pass.
- **Generated files:** `src/routeTree.gen.ts` (TanStack Router, on dev/build),
  `src/integrations/supabase/types.ts` (`npm run db:types`) and `src/lib/acknowledgements.generated.ts`
  (`npm run licenses`). Regenerate them; don't hand-edit. The rest of `src/integrations/supabase`
  (clients, auth middleware) is ordinary code now.
- **Settings.** `.env.example` lists every setting; real values go in `.env` (ignored by git) and,
  in production, Cloudflare secrets. `src/architecture.test.ts` fails if a secret could reach the
  browser or a real value is committed.
- **Architecture.** `docs/architecture.md` has the October 2026 review: what is solid, how to extend
  each part, and the roadmap in order. `src/architecture.test.ts` enforces the structural rules below.
- **Migrations** live in `supabase/migrations/` only. The Supabase workflow (`.github/workflows/supabase.yml`)
  applies new ones in order when they are pushed, and `npm run db:push` does the same by hand. Add
  new SQL there with a later timestamp than the newest file. The four `20260920…` files are the
  former `drizzle/migrations`, folded in at the point Lovable used to apply them.

## Commands

```sh
npm install                     # package-lock.json is the lockfile (npm ci in CI)
npm run dev                     # vite dev on :8080, loads .env
npm run build                   # production build: Nitro, Cloudflare Workers output in .output/
npm run deploy                  # build + wrangler deploy (docs/deploy.md)
npm test                        # vitest run (pure logic, jsdom components, pglite database rules)
npm run typecheck               # tsc --noEmit
npm run lint                    # eslint (prettier is an eslint rule); npx eslint --fix <files>
npm run db:push / db:types      # Supabase CLI: apply migrations / regenerate types
npm run app:sync                # build the phone app's screens (dist-app/) and copy into ios/ + android/
npm run app:ios / app:android   # open the native project in Xcode / Android Studio
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests, the web build, the app build and
`cap sync` on every PR, and all of them are clean: keep them that way. `vite.config.ts` is an explicit config (TanStack Start, React, Tailwind,
Nitro with the `cloudflare-module` preset; set `NITRO_PRESET` to build for another host).

## Stack

TanStack Start (React 19, file routes in `src/routes`, server functions via `createServerFn`),
Tailwind v4 (tokens in `src/styles.css`), shadcn/Radix primitives in `src/components/ui`,
Supabase (auth + Postgres + RLS) via `@supabase/supabase-js`, Vercel AI SDK talking to Google's
Gemini API through its OpenAI-compatible endpoint (`AI_API_KEY`; `AI_BASE_URL` points it at another
OpenAI-compatible service; `lib/ai-gateway.server.ts`). Google sign-in is Supabase's own OAuth. TypeScript is `strict` with `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes` — index access returns `T | undefined`, and optional props must be
omitted, not set to `undefined`.

## Architecture

### Client-authoritative, local-first
Everything a learner does works **signed out**. State lives in `localStorage` (`lamppost-*` keys)
and is read through small external stores (`useSyncExternalStore` or event-listener hooks):

| Key | Module | Holds |
| --- | --- | --- |
| `lamppost-progress-v1` | `lib/progress.ts` | XP, gems, streak, freezes, hint tokens, unlocked cosmetics, chests opened today + history, weekly XP, per-day `history`, per-course lesson counts, the finished lessons (`doneLessonIds`, with `doneLessons` positions derived from them) |
| `lamppost-courses-v1` | `lib/course-store.ts`, `lib/curriculum-store.ts` | the curriculum course + downloaded lesson content |
| `lamppost-exercises-v1` | `lib/exercise-store.ts` | every drill attempt (`lessonId#index`) |
| `lamppost-review-drills-v1` | `lib/review-drills.ts` | spaced-repetition queue (1d → 3d → 7d → 14d → 30d → 60d → 120d), including the upkeep of finished units |
| `lamppost-case-v1` | `lib/daily-case.ts` | daily cases read: case id → local day, and each day's result (device only) |
| `lamppost-rating-v1`, `-written-v1`, `-levels-v1`, `-badges-v1`, … | `rating.ts`, `mastery.ts`, … | skill ratings, rubric scores, level-ups, badges |
| `lamppost-unit-checks-v1` | `lib/unit-checks.ts` | before/after/three-months-later unit check results (first result kept, never overwritten; device only) |

Signed-in users additionally get a Supabase account: `useProgress` pulls the account's numbers on
sign-in and pushes changes through the `syncProgress` server function (`lib/profile.functions.ts`).
Because lessons are completed in the browser, **the server can bound and record progress but cannot
prove a lesson was done** — see "Security model".

### Progress, streaks and days
- **Every unit is open from day one.** The 35 lessons have a suggested order, not a lock: any lesson can
  be started, and finishing one records *that* lesson. Finished lessons are **saved by id**
  (`doneLessonIds`); the 0-based positions in `doneLessons` are derived from the ids whenever the state
  is loaded or saved (`loadLessons`/`saveLessons`), so adding or reordering a lesson never moves anyone's
  progress. Older saves (positions, or only a count) upgrade on read. Use `useProgress().doneLessons`
  (a `Set` of positions) with `nextLessonIndex`, `unitProgress` and `unitEntryIndex`; never treat
  `completed` as "everything before this is done". **A shipped lesson id is permanent**
  (`curriculum-progress.test.ts` pins them): add a lesson rather than rename one.
- **Unit sizes come from the data.** Never write `% 5` or `index * 5`: `lessonPlace(index)` gives the
  unit and "stop n of m", and `unitProgress` works out each unit's span from `LESSONS`.
- **Finished lessons follow the account.** `syncProgress` adds the device's ids to `profiles.done_lessons`
  (server-only, known ids only, never removes one) and returns the list; `getMyProfile` returns it on
  sign-in and the device unions it in (`adoptLessons`). The rest of the learning state (reviews,
  ratings, checks) is still device-only — see `docs/architecture.md`, roadmap 2.
- **The day boundary is the device's local calendar day**, as a `YYYY-MM-DD` key. Use
  `dayKey()` / `shiftDay()` from `lib/days.ts` (never `toISOString().slice(0, 10)`, which is UTC).
  History keys, `lastActiveDay`, freeze logs, review due dates and the daily case all use it.
- Streak rules live in `lib/streak.ts` (pure, unit-tested): completing a lesson/review/case
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
results are kept the first time and never overwritten. Ninety days after an after-check, its own three
questions come back once (`later` phase, `LATER_CHECK_DAYS`) to see what stuck. They show on My Path,
on Home when one is open, and in Progress → Before and after (`BeforeAfterTable`), always framed as a
rough signal. `content/unit-checks.test.ts` keeps them fresh (no overlap with lesson text), fair
(answer positions and lengths) and well-formed.

### After the map: keeping it sharp
Finishing all 35 lessons is a graduation, not a dead end. The lesson that completes the map says so
on its arrival board and points to `/final-check`, which runs the after-checks not yet taken back to
back and then shows every line's before and after. Home then switches from "Up next" to "Keep it
sharp": today's case is the main sign, with rows for the final check, any three-months-later check
and reviews.
- **The daily case** (`/case`, replacing the one-drill daily challenge; `/challenge` redirects there)
  is one real-world text and three questions from three different units, about three minutes.
  Cases are authored data in `content/cases.ts` (format and picker in `lib/daily-case.ts`, held to
  the lesson content rules by `content/cases.test.ts`). The picker is pure (`caseForDay`): a case
  finished today stays today's; otherwise the next unread case in library order, preferring the one
  with fewest units the learner hasn't started; once all are read, the one read longest ago comes
  back. A finished case counts once for the day and the streak (`applyCase`, XP from `caseXp`), and
  a missed question puts its lesson in the review queue. Add new cases at the end with the next id.
- **AI-written cases** take over once every written case has been read (`wantsNew` from
  `useDailyCase`, fetched by `useAiCaseTopUp`). `getGeneratedCase` (`cases.functions.ts`) serves one
  case per local day from the server-only `generated_cases` table; on a miss it writes one under
  the `caseGeneration` limit and a per-day lease: the day's plan (`casePlanForDay`: three lessons
  from three units, a source, a setting), a writer pass, `readGeneratedCase` (the same format,
  content and fairness rules as the written cases, options reshuffled), then a reviewer pass. Any
  failure falls back to the written case read longest ago. Devices keep the last 30 AI cases, and
  every AI case carries the AI label.
- **Upkeep reviews.** When a unit is finished (`UpkeepWatcher`, idempotent, also covers saves from
  before this existed), each of its lessons joins the review queue on the 30-day rung, then climbs
  to 60 and 120 days (`upkeepEntries`, reason `keep`), one per day so it never arrives in a lump.

### Authored lessons and notes
Every lesson is written as data: `content/lessons/<unit>.ts` holds its steps (schema and cross-field
rules in `lib/steps/types.ts`, one component per step kind in `components/steps`), the takeaway and the
writing task, and `content/notes/<unit>.ts` holds its notes (`lib/lesson-notes.ts`: the hook shown above
the first step, the idea, key terms, a worked example, two subtleties, a question to carry and something
to try this week). `StepLesson` plays them; problem first, explanation after, so the notes come after
the steps and only open in the `/notes` library once the lesson is done. Each lesson's last step is a
harder "Putting it together" case. `lessons.test.ts` and `notes.test.ts` hold both to their word limits,
answer-position balance and the content rules in `content/content-rules.ts` (made-up names, no party
line). The generated pipeline below is the fallback (`LegacyLesson`) and still feeds reviews and the
placement check.

### Lesson content pipeline
`lib/curriculum.ts` is the single source of truth for the 35 lessons (objective, key idea, the trap
each drill must test, the ordered **drill plan**, and the written task type). Content is generated
once per lesson by the AI gateway, validated by a second AI pass, and cached in
`curriculum_lessons`; validated drills also seed the shared `drill_variants` pool that reviews and the
placement check draw from. Relevant files: `curriculum-generate.server.ts`,
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

### The phone apps
`vite build --mode app` (`npm run build:app`) builds the same screens as a single-page app (TanStack
Start's SPA shell) into `dist-app/`, which Capacitor bundles into `ios/` and `android/`. Everything a
server does still runs on the deployed backend: in the app build, server-function calls go to
`VITE_API_URL` (`apiFetch` in `lib/platform.ts`, set in `start.ts`), and the backend accepts the app
origins `capacitor://localhost` and `https://localhost` (`lib/app-origins.ts`: CORS in `server.ts`,
the cross-site check in `start.ts`; Vite's own CORS is off so dev matches production). Rules:
- **Never assume the page's origin is the website.** Links that leave the device (invites, email
  redirects) use `publicUrl()`. Native-only behaviour checks `isNativeApp()` and loads Capacitor
  plugins with a dynamic `import()`.
- **Sign-in** goes through `startOAuth` (`lib/oauth.ts`): in the app, the system browser and back
  through `com.lamppost.app://auth-callback` with PKCE, finished by `NativeShell`. Google sign-in comes
  with Sign in with Apple (App Store rule 4.8).
- **Edge to edge:** anything pinned to the top or bottom of the screen pads with `var(--inset-top)` /
  `var(--inset-bottom)` (status bar, notch, home indicator).
- **Files** go through `saveTextFile` (a download on the web, the share sheet in the app).
- Fonts are bundled (`@fontsource`), so the app works offline and contacts no font service.
- The app id `com.lamppost.app` appears in six places; `oauth.test.ts` keeps them the same.

### UI shell
Every screen renders inside `components/PhoneFrame.tsx` (bottom nav on phones, sidebar layout at
≥1024px). Design tokens are CSS variables in `src/styles.css`. Every screen shares one light and one
dark set (Settings switches between them): don't re-theme a single screen, because a screen that changes
colour and type on its own reads as a different app (the Home and course-map screens used to). Text colours
must meet WCAG AA (4.5:1 body, 3:1 large/graphics) in both sets — `styles.contrast.test.ts` checks it.

The look is **Wayfinding** (October 2026): transit signage by day, a lit street at night.
- Type is Overpass (Overpass Mono for numbers and counts). Overpass draws `·` with no width, so the
  font stacks start with a "Middle Dot" face that borrows it from system fonts; keep that first.
- Signs, not cards: square corners (the radius scale tops out at 4px), a 2px `--edge` rule instead of
  shadows (`sign` utility), and `legend` for small tracked capitals. No gradients, glows or confetti.
  Day is black on pavement grey; night is deep blue with sodium amber as `--primary`, and the active
  step sits in a `lamp-pool` (`--lamp-pool` is `none` by day).
- Each unit is a numbered line with its own colour (`--line-1`…`--line-7`, lettering `--on-line-n`,
  read through `unitAccent()`), drawn with `LineBullet` and `Stops` (`components/LineBullet.tsx`).
  Lessons are stops: "stop n of 5". The contrast test holds every line to 3:1 and its lettering to 4.5:1.
- The guide is a lamp (`GuideMark`), not a mascot: it stands beside feedback, in the tutor chat and on the
  sign-up screens. A person's chosen companion only identifies them (profile, friends, league, invites).

The tone is a calm coach that never shouts; the league lives under Friends, and there is nothing to buy
or open.

My Path (`/courses`) is the only map, drawn as a line map: each unit opens in place into its five
lessons as stops on its line, "You are here" marks the next one, the unit checks sit at either end as
interchanges, and a finished stop links to its notes (`/notes`, also under Progress). Home answers "what
should I do now?" (one sign for the next lesson, a row each for reviews and today's case, the seven
lines with their stops; after the whole map, "Keep it sharp" as above) and the skills graph lives under Progress → Skills → Map. A finished lesson ends on
an arrival board (`LessonFinished`: three numbers, today's goal, the next stop). `/course/:slug` redirects
to My Path. Onboarding is three screens (intro, one real question, setup); a companion can be chosen from
Profile.

### Check something you saw
`/look` (a row on Home once a learner has started): paste a post, an advert, a headline or a
chatbot answer and get the questions from the lessons that matter most for it, what in the text
to look at, and one way to check it elsewhere. **It never says whether the text is true**: the
prompt forbids verdicts and `readLookResult` throws away a reply that gives one. `lookCloser`
(`look-closer.functions.ts`) caps the text at 1,500 characters, screens it locally, counts it
against the `lookCloser` limit (guests included, tightly), and stores nothing.

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
  the account: it recomputes the streak from stored activity, bounds XP/gems and back-dating, and only
  adds known lesson ids to `done_lessons` (`lib/progress-limits.ts`) — it cannot prove a lesson was done.
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
- **Models are named in one place.** `lib/ai-models.ts` maps each feature to its gateway model;
  `architecture.test.ts` fails if a model name appears anywhere else.
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
- Secrets: only `SUPABASE_URL` and the publishable key reach the browser (as `VITE_` values); those
  are public by design. `SUPABASE_SERVICE_ROLE_KEY`, `AI_API_KEY` and `WARM_TOKEN` are server-only:
  in the local `.env` (never committed) and as Cloudflare secrets. Never give them a `VITE_` name or
  read them in client code.
- User-generated text goes through `lib/moderation.ts` (`screenLocally`) before it reaches a model,
  and generated text through `screenOutput`.
- When the schema changes, update `docs/data-inventory.md` and `src/lib/legal.ts` (privacy policy).

## Testing

Vitest (`npm test`). Pure logic (`lib/days.ts`, `lib/streak.ts`, `lib/progress-core.ts`, curriculum
invariants, colour contrast of `styles.css`) is tested in node; component tests use jsdom; the
database rules run against the real migrations in pglite (`src/db`). Tests that depend on the timezone set it
explicitly (`process.env.TZ`) — the day-boundary suite simulates 9pm US Eastern. `src/architecture.test.ts`
scans the source for the structural rules: no static import of a `.server` module from browser code,
secrets only in server code and never under a `VITE_` name, `.env` ignored and `.env.example` blank, every device key prefixed `lamppost-` (account deletion
clears by that prefix), no UTC day keys outside `days.ts`, model names only in `ai-models.ts`, and a
rollback in `docs/rollback/` for every migration since the write lockdown. When you fix a bug
in progress/streak/day logic, add the failing case to those suites first.

## Conventions

- Match the surrounding code: no new comments unless they explain a non-obvious *why*.
- Copy is short and plain; the app talks to learners as a calm coach, not a game show.
- Prefer server-side truth for anything social (friends, shared streaks, debates); prefer
  local-first for anything a signed-out learner can do.
