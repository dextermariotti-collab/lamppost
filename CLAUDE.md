# CLAUDE.md

Lamppost is a critical-thinking trainer: a fixed 7-unit / 35-lesson curriculum, each lesson a
concept card → mixed reasoning drills → a graded written argument → an "explain it back" tutor
chat. It is a mobile-first web app (a 420px "phone frame" that also runs on desktop), built with
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
| `lamppost-progress-v1` | `lib/progress.ts` | XP, gems, streak, freezes, per-day `history`, per-course lesson counts |
| `lamppost-courses-v1` | `lib/course-store.ts`, `lib/curriculum-store.ts` | the curriculum course + downloaded lesson content |
| `lamppost-exercises-v1` | `lib/exercise-store.ts` | every drill attempt (`lessonId#index`) |
| `lamppost-review-drills-v1` | `lib/review-drills.ts` | spaced-repetition queue (1d → 3d → 7d → 14d) |
| `lamppost-challenge-v1`, `-rating-v1`, `-written-v1`, `-levels-v1`, `-badges-v1`, … | `lib/challenge.ts`, `rating.ts`, `mastery.ts`, … | daily challenge, skill ratings, rubric scores, level-ups, badges |

Signed-in users additionally get a Supabase account: `useProgress` pulls the account's numbers on
sign-in and pushes changes through the `syncProgress` server function (`lib/profile.functions.ts`).
Because lessons are completed in the browser, **the server can bound and record progress but cannot
prove a lesson was done** — see "Security model".

### Progress, streaks and days
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
≥1024px). Design tokens are CSS variables in `src/styles.css`; `.graph-home` and
`.course-expedition` re-theme the Home and course-map screens. Light-mode text colours must meet
WCAG AA (4.5:1 body, 3:1 large/graphics) — check any token you change.

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
