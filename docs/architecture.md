# Architecture review (October 2026)

A read of every layer (routes, components, `src/lib`, content, server functions, migrations, tests)
asking one question: can the next year of features be built on this without a rewrite? This file
says what was fixed in this pass, what is solid and should be kept, and what to do next, in order.
CLAUDE.md stays the day-to-day guide; this is the reasoning behind it.

## The short answer

The data and security foundation is sound. Server-only writes, column grants, RLS tested against
real migrations, fail-closed rate limits and pure, tested progress logic are better than most apps
at this stage. The weak points were in **identity and drift**: progress keyed by position, state
that never left the device, and rules that lived only in prose. This pass fixed those. What remains
is consolidation work: one exercise model, one way to store local state, and syncing the rest of
the learning state. None of it blocks new features, but each gets more expensive the longer it waits.

## Fixed in this pass

| # | Problem | Why it mattered | What changed |
| --- | --- | --- | --- |
| 1 | Finished lessons were saved as **positions** (`doneLessons: [0, 3, 7]`), and six places did `% 5` or `index * LESSONS_PER_UNIT` arithmetic | Inserting, removing or reordering one lesson would silently move every learner's progress onto lessons they never did, and a unit with four or six lessons would draw the map wrong | Finished lessons are saved by **id** (`doneLessonIds`). Positions are worked out from the ids on load and save (`loadLessons`/`saveLessons` in `progress-core.ts`). Old saves upgrade on read. Unit spans and "stop n of m" come from the lesson data (`lessonPlace`, `UNIT_SPANS`). Tests cover reordering, inserted lessons, retired ids and contiguous units, and pin every shipped id so none can be renamed |
| 2 | Which lessons were finished **never reached the account** | A second device showed the right XP and streak over an empty map, and the next-lesson suggestion started from lesson 1 | `profiles.done_lessons` (server-written, private, at most 200, only grows) is filled by `syncProgress`. Only known lesson ids are accepted (`doneLessonsToStore`), and the list is returned by `getMyProfile` and unioned on the device (`adoptLessons`). Old databases without the column still sync. Migration, rollback and pglite tests are included |
| 3 | No CI, and a type error that everyone had learned to ignore | Every rule in CLAUDE.md depended on someone remembering to run it | `.github/workflows/ci.yml` runs typecheck, lint, tests, the web build, the app build and `cap sync` on every PR and every push to `main`. `tsc` is at **zero errors** (the root `errorComponent` now takes `ErrorComponentProps`), and `npm run typecheck` exists |
| 4 | 14 dead modules (about 1,400 lines), including a **public AI endpoint with no screen** (`generateOutline`, course generation) | Unused code that can still call a paid model is cost and attack surface. Dead stores and components mislead the next reader | Deleted, along with its `topicGeneration` rate-limit policy and its tests |
| 5 | Model names hard-coded in eight files, with the tutor on a different version from everything else | Upgrading a model meant a hunt, and drift went unnoticed | `lib/ai-models.ts` names the model for each feature, and a test fails if a model name appears anywhere else |
| 6 | Structural rules existed only as prose | New files broke them without anyone noticing | `src/architecture.test.ts` checks the source. Server-only modules are never imported statically from browser code. Secrets are read only in server code and never get a `VITE_` name; their real values live only in the local `.env` (ignored by git) and in Cloudflare secrets, and `.env.example` holds blanks and placeholders. Every device key starts with `lamppost-`, which is what account deletion clears. Day keys never come from the UTC date. Model names live in one file. Every migration since the write lockdown has a rollback outside the auto-applied folder. Each rule was checked against a planted violation |
| 7 | Small correctness issues | | The data download was named by UTC date (now the local day). The practice server function used `any` for its database client (now typed). Tests in `friends.functions.test.ts` used `any` |

## What is solid: keep it this way

- **Server-authoritative writes.** Browser roles write only a short allowlist, everything else goes
  through service-role server functions, and `src/db/*.test.ts` runs the real migrations in pglite
  to prove it. New tables cannot skip RLS or account-deletion cascades without a test failing.
- **Pure core, thin shell.** Streaks, days, progress transitions, the case picker, unit-check
  availability and review spacing are pure functions with their own tests. React hooks only wire
  them to storage. New rules belong in the pure layer.
- **Content as data, held to rules by tests.** Lessons, notes, cases and unit checks are typed
  data. Tests enforce word limits, answer-position balance, made-up names and no overlap between
  checks and lessons. Adding content means adding data, not code.
- **AI behind five gates.** Every model call goes through `withGuardrails()` and an output cap
  (`aiOutput()`; both tested by scanning the source), a database rate limit that fails closed, input
  screening (`screenLocally`) and output screening or parsing (`readLookResult`,
  `readGeneratedCase`). Lesson context in a prompt is built on the server from the lesson id, never
  taken from the request. Learners are asked once before their text first goes to the provider
  (`useAiConsentGate`) and can report what comes back (`ReportContentButton`). New AI features should copy the
  shape of `look-closer.*`: a pure module for limits and parsing, a `.server.ts` prompt, and a
  `.functions.ts` handler.
- **Local days everywhere.** One module (`days.ts`) makes day keys, and the 9pm-Eastern suite
  guards it.

## Can it be extended without refactoring?

| Adding… | Today | Notes |
| --- | --- | --- |
| A lesson, or a unit of any size | **Yes** | Add it to `curriculum.ts`, `content/lessons`, `content/notes`, then run the tests. Never rename a shipped id (the test says so) |
| A step kind | **Yes** | Add the schema in `lib/steps/types.ts`, a component in `components/steps`, and register it |
| An AI feature | **Yes** | Copy `look-closer.*`, add a policy in `rate-limit.ts`, and a model and an `AI_REPLY_TOKENS` cap in `ai-models.ts` |
| A table holding personal data | **Yes** | Add it with RLS and `ON DELETE CASCADE`. The audit tests enforce both |
| A field that follows the learner across devices | **Partly** | Progress has a path (`syncProgress`), but each field needs its own merge rule written by hand. See roadmap 2 |
| Another curriculum or course | **No** | `CURRICULUM_SLUG` is a constant throughout, and `courses[slug]` is a leftover of generated courses. Fine while there is one curriculum. Make it a parameter first if a second one is planned |

## Roadmap, in order

1. **One exercise model.** Lessons use authored steps (`lib/steps`), but reviews and the placement
   check still serve AI-written drills in the older `Exercise` format. That format comes with the
   generation pipeline (`curriculum-generate.server.ts`, `exercise-ai.server.ts`, `lesson-parts`,
   `drill_variants`, `CONTENT_VERSION`, `LegacyLesson`), which every lesson has now outgrown. Serve
   reviews from the authored steps instead: each lesson has eight or more, plus its case, and the
   review queue already knows the lesson. Add new review variants in the step format, written by
   hand or by AI. Then retire the legacy pipeline, its tables and its rate limits. This is the
   biggest simplification available, and it removes the main source of AI cost.
2. **Sync the learning state, not just the numbers.** The review queue, skill ratings, unit-check
   results, badges and drill attempts are still device-only (about ten stores). A new phone gets
   XP, streak, lessons and the streak's recent days (`getMyProfile` returns the last 60 active
   days), but not the reviews that are due. Store one versioned, server-bounded
   `learning_state` document per account, merged the way progress is. Decide this before many
   people use two devices, because merging two histories later is harder than syncing from the start.
3. **One local-store primitive.** About twenty `lamppost-` stores are each read through hand-written
   parse/write/event code, and most trust `JSON.parse(raw) as T`, so an old or corrupt save flows
   straight into rendering. Write `createLocalStore({ key, version, schema, migrate, initial })` on
   the shared-snapshot pattern `progress.ts` already uses, with a zod schema and migrations. Move
   stores across one at a time as they're touched.
4. **Feature folders.** `src/lib` holds 100 modules: domain logic, server code, hooks and storage
   sit side by side. Group by feature (`features/lessons`, `reviews`, `cases`, `social`, `account`)
   with `lib/` kept for shared building blocks. Do it as files are touched. Once it exists, extend
   `architecture.test.ts` so features import each other only through an index.
5. **One way to call the server.** Social screens use TanStack Query, while learning screens call
   server functions in effects with their own loading and error state. Route every call through
   Query (or route loaders) so retries, caching and errors behave the same everywhere.
6. **Bundle.** The entry chunk is about 188 KB gzipped, mostly React, the router and the Supabase
   client, which loads even for signed-out visitors. Load Supabase on first sign-in or sync, and
   add a size budget to CI.
7. **Regenerate the database types.** `generated_cases` and `profiles.done_lessons` are reached
   through small untyped accessors (`casesTable`, `doneLessonsOf`), because `types.ts` predates them.
   The social safety migration (October 19) changed `search_profiles` to take a viewer, so it is
   called through `UntypedRpc` in `friends.functions.ts` for now. Once the new Supabase project is
   built, run `npm run db:types` and delete the accessors.
8. **Decide on the retired economy.** Gems, carry-over and hint tokens still travel in every sync so
   that accounts stay consistent. If they are not coming back, one migration (with a rollback) can
   drop the columns and tables and shrink the sync payload.
9. ~~**Lint in CI.**~~ Done when the app moved to its own build: generated files are ignored, the rest is
   formatted, and CI runs `npm run lint`.
