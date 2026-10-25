# PLAN — revamp/interactive-legal

> This is the October 2026 revamp plan, kept for history. Parts of it (the hosted AI gateway,
> the open PR chain) no longer describe the app: see `SUMMARY.md` and `docs/architecture.md`.

Written before any code was changed. It says what exists, what I will change, and the calls I am
making because the brief says nobody is available to ask. `SUMMARY.md` (written last) reports what
actually happened and where it differs from this.

## 0. Starting point

- Branch `revamp/interactive-legal` is cut from `claude/pr4-retention-loop`, the newest work in the
  stacked PR chain (#2 abuse protection, #3 drill types, #4 rewards/league; all still open, none
  merged). I based it there because the drill types, rate limits, server wallet and rewards it
  builds on only exist there. **Consequence:** a PR from this branch to `main` also carries #2–#4.
  Merge those first, or retarget.
- The PWA/reminders/quality PRs (chain items 5, 5b, 6) are paused; this brief took priority. The only
  thing done for them is a Lighthouse baseline (perf 66, a11y 100, best-practices 96, SEO 92, PWA 38;
  Lighthouse 11, mobile, gzip, production build).
- Only pushes to `revamp/interactive-legal`. Never `main`. No PR is opened (not asked for).

## 1. What exists today

**Stack.** TanStack Start (React 19, file routes, `createServerFn`), Tailwind v4 tokens in
`src/styles.css`, shadcn/Radix primitives, Supabase (auth + Postgres + RLS), Vercel AI SDK to a
hosted AI gateway. Local-first: everything works signed out from `localStorage`; signed-in accounts
sync through server functions that use the service-role client (never shipped to the browser).

**Curriculum.** `src/lib/curriculum.ts`: 7 units, 35 lessons, each with `keyIdea`, `trap`, a drill
plan (4–5 of 14 drill kinds) and a written-task type. There is no free topic generation any more.

**Lesson content today.** Generated once per lesson by the AI gateway, validated by a second pass,
cached in `curriculum_lessons`, written in parts (`lesson_parts`) on a cold cache, cached again in
`localStorage` (`lamppost-courses-v1`). Shape (`Lesson` in `courses.ts`): a concept card
(`title/body/example`), `exercises[]`, `written`, `keyPoints`. The lesson screen
(`course.$slug.lesson.$index.tsx`, 757 lines) is already a paged flow: concept card → drills → written
argument → summary + "explain it back" tutor chat → celebration, with a segmented progress bar,
combo counter, XP, streak flame, mascot celebration, chest offer, Socratic nudge, reports.

**Drills (14 kinds, `components/exercises/*`).** claim, flaw, assumption, rank, sort, predict,
steelman, judge, highlight, rewrite, order, numeric, slider, chart. Deterministic quality rules in
`exercise-rules.ts`; tap-alternative reordering in `ReorderList`; 44px targets; tests. Attempts are
stored per `lessonId#index` (`exercise-store.ts`) and feed reviews (`review-drills.ts`), ratings
(`rating.ts`), mastery and a calibration view (`mastery.calibration()` reads `answer.confidence`;
shown on Progress).

**Legal (already there, but stale).** `src/lib/legal.ts` holds seven draft documents rendered by
`LegalScreen` under `/legal/*` (privacy, terms, health, ai-content, cookies, community, dmca).
Problems found:
- Written for an older product ("courses you generate", fitness programs). The app is now a fixed
  curriculum.
- Contact addresses (`privacy@lamppost.app`, `legal@…`, `safety@…`) are invented facts.
- Terms has no age requirement, no governing-law placeholder, no change-notification clause.
- No third-party list beyond "our backend provider"; Google Fonts is loaded from Google's servers
  (IP address shared) and is not disclosed; the hosted sign-in, the hosted AI gateway and the editor's
  error reporting are not named.
- `auth.tsx` says "By continuing you agree…" (no checkbox, nothing stored), has no age gate.
- `settings.tsx` already has "Export my data" and "Delete my account" with a typed confirmation, backed
  by `account-data.functions.ts` (`exportMyData`, `deleteMyAccount`; server-side, service role, ten
  sequential steps, cascades for the rest).
- `ReportContentButton` reports **content**. `removeFriend` exists. There is **no block and no
  report-user**. `searchPeople` returns handle + streak to anyone; profiles show streak/XP to friends.
- `AiDisclaimer` sits on the lesson screen only.

**AI surfaces and their prompts.** Socratic nudge, "explain it back" tutor (`practice.server.ts`),
rubric grader, debate motion writer + grader, drill/lesson generators, moderation classifier. All but
the **practice tutor** append `CONTENT_POLICY_RULES` (refuse sexual/violent/hateful content, no
personalised medical/legal/financial instruction). The practice tutor does not, and none say "stay on
critical thinking" explicitly.

**Database.** 22 public tables. Every one is created with RLS enabled (the newer four via a dynamic
`format()` loop, which is why a text grep misses them). Browser roles hold no writes except a short
allow-list (`src/db/rls.test.ts` guards it). Not yet proven from the catalog: "RLS is on for every
public table" as a test, which I will add.

**Assets/licences.** Fonts: Caveat, DM Sans, Lora, Nunito Sans, Space Grotesk via Google Fonts (all
SIL OFL). Icons: `lucide-react` (ISC). Images: `src/assets/fox-mascot.png`, `ai-bot.png` (unused by
any code; committed by an AI tool, so AI-generated; provenance/licence unverifiable),
`public/favicon.ico` (unknown origin). The companion mascots are drawn in code (`CompanionAvatar`),
which is original.

**Copy that overclaims** (from a grep; the full sweep is item 11): onboarding "think sharper",
premium page "That moment is where learning sticks", "Sharper review timing", "Every course, in full,
on any topic" (no longer true).

## 2. What I will change

Priority order follows the brief: legal 1–5 and 8 first, then the component library, then lessons,
then the rest.

### Phase A — launch-blocking legal (Part 2 items 1–5, 8)

1. **`src/lib/legal-config.ts`**: one file of placeholders (`[COMPANY NAME]`, `[CONTACT EMAIL]`,
   `[STATE]`, `[EFFECTIVE DATE]`, `[MAILING ADDRESS]`) plus `TERMS_VERSION` / `PRIVACY_VERSION`. Every
   document reads from it. Invented contact addresses go away.
2. **Privacy Policy** rewritten in plain English against the code as it is: data by category (account,
   profile, learning progress, friends, what is sent to AI, technical/security data), why, the real
   processors (Supabase for database and sign-in, the hosted AI gateway and the model
   providers behind it, Google Sign-In, Google Fonts, the editor's error reporting), retention,
   deletion, children, rights, contact. Analytics: none exists, and it says so.
3. **Terms of Service** rewritten: acceptable use, age requirements, AI disclaimer, educational-use-only,
   no warranty, limitation of liability, termination, how changes are communicated, governing law
   placeholder. The other five documents are brought in line with the current product (the fitness
   document becomes an "educational use, not professional advice" notice at the same URL).
4. **Signup consent.** Unchecked checkbox "I agree to the Terms and Privacy Policy" with links that
   open both. Required for email signup and for the Google button. The acceptance is recorded by a
   server function (`recordConsent`) with a **server-side timestamp** and the versions accepted, on
   `profiles`. A signed-in account with no acceptance of the current version is sent to a `/consent`
   screen before it can use account features (existing accounts hit it once). Guest use is unchanged.
5. **Age gate.** A neutral month/day/year picker: no defaults, no "must be 13" hint. Under 13: signup
   is blocked, nothing they entered is stored anywhere (not `localStorage`, not the server; the block
   lasts only until the page reloads). 13–17: a required "I have a parent's or guardian's
   permission" checkbox. I store an **age band** (`13-17` / `18+`) and the guardian confirmation, not a
   date of birth.
6. **Deletion.** Keep and harden the existing in-app flow (confirm step, typed `DELETE`), route the
   deletion through one SQL function `delete_user_data(uuid)` so it is atomic and covers the new tables,
   and clear local data and sign out afterwards. Add "Request my data": the existing JSON download
   plus an email link to `[CONTACT EMAIL]`.
7. **RLS audit.** A catalog-based test that fails if any `public` table lacks RLS, that lists policies
   per table, and that checks user-owned tables never expose another user's rows. Findings go in
   `docs/rls-audit.md` and `SUMMARY.md`.

### Phase B — interactive step components (Part 1, library)

`src/components/steps/`: eight components, each with typed props, content from data, mobile-first,
a tap/keyboard alternative for every drag, and correct/incorrect states that don't rely on colour alone
(icon + text label + border style):

| # | Component | Interaction | Fallback for drag |
|---|-----------|-------------|-------------------|
| 1 | `SpotTheFlaw` | tap the phrase containing the flaw | native: taps + arrow keys |
| 2 | `ArgumentBuilder` | place premises/evidence/conclusion into an argument map; live structure check | tap a card, tap a slot |
| 3 | `SortIt` | drag claims into buckets | tap a card, tap a bucket |
| 4 | `ConfidenceSlider` | set 0–100% before reveal; calibration recorded | native slider + buttons |
| 5 | `WhichIsStronger` | pick one of two arguments; deciding factor revealed | buttons |
| 6 | `EvidenceUpdater` | probability bar moves as evidence cards are revealed | reveal buttons |
| 7 | `CauseExplorer` | toggle a hidden variable and watch the chart/scenario change | toggle |
| 8 | `FillTheGap` | choose the missing assumption | buttons |

Shared: a `StepShell` (≤40-word prompt, hint button, retry, "why" panel), a `StepFeedback` panel
(icon + "Correct"/"Not quite" text + 1–2 sentence specific reason), and a strict schema (`zod`) for
step data. Hand-rolled pointer-event drag (no new dependency); the existing `ReorderList` pattern is
the model for the keyboard/tap path.

### Phase C — step-based lessons

- **Format.** A lesson is an array of `LessonStep`s (discriminated union on `kind`), authored as
  TypeScript data under `src/content/lessons/<unit>.ts`, one unit per file, loaded on demand with
  dynamic `import()`. Each lesson also carries its written task (prompt, passage) and a one-line
  summary. Roughly 7–9 steps a lesson.
- **Why authored data instead of AI-generated content.** The brief's constraints (≤40 words per
  step, problem before explanation, a specific "why" for each wrong answer, ≥70% interactive) can't
  be guaranteed from model output and I can't call the gateway from here to check it. Static data is
  testable: a test validates every step against the schema, counts words, counts the interactive
  share, and scans for real names/brands. The trade-off is that lesson text no longer changes without
  a code change. The AI pipeline stays in place for reviews, the daily challenge, the placement
  check, the tutor and the grader.
- **Player.** New `LessonPlayer`: progress bar on top, one step per screen, Continue locked until the
  step resolves, first-try/retry/hint scoring, XP and attempts recorded through the existing
  `recordExercise`, `useLessonAttempts` (own key namespace so old attempts aren't mixed in),
  `trackDrillResult`, `recordDrillOutcome`. After the steps: the existing written argument and
  explain-it-back chat (both skippable), then the existing celebration (mascot, XP, streak, chest offer).
  `prefers-reduced-motion` is already honoured globally in CSS; I'll verify the JS-driven bits.
- **Content rules.** Fictional people, companies and products only (a test looks for known real
  brand/person names); no partisan positions; contested topics show more than one side.
- **Old path.** The AI lesson loader and its tests stay in the tree, unused by the lesson route.
  I won't delete it in this pass.

### Phase D — remaining Part 2

- **Item 6, AI disclosure.** An `AiLabel` ("AI-generated · can make mistakes") on tutor chat, Socratic
  nudges, written-argument feedback, debate grading and AI-generated review/challenge drills. The
  lesson steps are authored, so they are **not** labelled AI-generated (labelling them would be false).
  Policy text added to every system prompt including the practice tutor: stay on critical thinking,
  refuse harmful or explicit requests, no medical/legal/financial advice; a test asserts every system
  prompt carries it.
- **Item 7, social safety.** `user_blocks` and `user_reports` tables (new migration); server functions
  `blockUser`, `unblockUser`, `reportUser`; block removes the friendship and stops search, requests
  and league visibility; a trigger refuses friend requests between blocked pairs. `profile_visibility`
  column, default `minimal`: strangers see display name + avatar only; friends see streak/XP/league
  tier only if the owner opts in. Nudges stay friends-only and there is still no free-text messaging.
- **Item 9, accessibility.** Audit with axe-core injected from a temporary install (not added to the
  project) at 375px and desktop; fix labels, focus rings, targets (the 36px back arrow), contrast,
  landmarks.
- **Item 10, acknowledgements.** `/legal/acknowledgements` generated from installed packages' licences
  into a static data file; a test fails if a `dependencies` entry is missing from it. Flags the
  AI-generated images and the favicon as unverified.
- **Item 11, honest claims.** Sweep and soften; add a test that bans a list of unbackable phrases.
- **Item 12, links.** A `LegalFooter` (Privacy, Terms, Acknowledgements, Support) on onboarding, auth,
  consent and legal pages; a Legal & support block in settings; a new `/support` page.

### Phase E — polish and hand-off

Playwright pass over every route at 375px and 1280px: console errors, dead buttons, empty/loading/
error states. Then `SUMMARY.md`.

## 3. Migrations (all additive, all with a rollback in `docs/rollback/`)

1. `consent_and_age` — `profiles`: `terms_version`, `terms_accepted_at`, `privacy_version`,
   `age_band`, `guardian_confirmed`; `profile_visibility` (default `minimal`). Server-only writes
   (the browser grant does not include them).
2. `blocks_and_user_reports` — tables `user_blocks`, `user_reports` (RLS on, server-only writes),
   trigger blocking friend requests between blocked pairs, `league_standings` respecting blocks and
   visibility.
3. `delete_user_data` — a service-role-only SQL function that deletes or anonymises everything a
   user owns in one transaction.

No drops, renames or data rewrites of existing columns.

## 4. Dependencies

None planned. Drag-and-drop, the argument map and the charts are hand-built with pointer events and
SVG. `axe-core` and `lighthouse` are used from a scratch directory outside the repo for audits only.

## 5. Decisions I'm making without you

- **Deletion stays a server function, not a Supabase Edge Function.** The point of the Edge Function
  request is that the service-role key never reaches the client; a TanStack server function has the
  same property, is already how every privileged write here works, and is testable with the rest of
  the suite. An Edge Function needs Deno deployment I can't exercise from here, and if it silently
  failed to deploy, account deletion (an App Store requirement) would break. The deletion logic moves
  into one SQL function so an Edge Function could wrap it later in a few lines.
- **Age band, not date of birth.** Less data kept. Cost: age can't be recomputed later.
- **Under-13 retry.** Nothing is persisted, so a reload lets the person enter again. Persisting a
  block would be storing something derived from what they entered. Noted for a lawyer.
- **Existing accounts see the consent screen once.** They never accepted the new terms, so they are
  asked; declining signs them out (their data stays).
- **Profile visibility applies to existing accounts too** (column default `minimal`). This reduces
  what friends see until people opt in, and makes the friends league opt-in in effect. Safer to
  under-share and let people turn it on.
- **Lesson steps aren't labelled AI-generated** (see above), and the documents describe their
  authorship honestly: drafted with AI assistance, checked by automated tests, not reviewed by a human
  subject-matter expert.
- **Placeholders, not guesses**, for every legal or business fact.

## 6. Verification

`npm run build` before every commit; `npm test`, `tsc` (baseline: the one existing `__root.tsx` error),
`eslint` on touched files. Real-browser checks (Playwright) for the signup flow, a full lesson, the
component keyboard paths, and the 375px/desktop sweep.

## 7. Changes from this plan (added at the end of the pass)

- **No `delete_user_data` migration.** Every table already cascades (or sets null) from the sign-in identity, so
  deleting the identity does it all in one step. `src/db/deletion.test.ts` enforces that for every table.
- **`profile_visibility` shipped in the third migration**, not the first, so the social-safety pieces are one
  reviewable change: `20260930100200_blocks_reports_visibility.sql`.
- **Reports about people** stay, unlinked, if the reporter deletes their account (like content reports), and go
  with the reported person's account.
- **Not built:** the PWA, web-push reminders and the Playwright suite from the earlier plan (paused, see
  SUMMARY.md).
