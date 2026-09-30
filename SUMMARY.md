# Revision pass: interactive lessons, legal and safety

Branch `revamp/interactive-legal`, based on the head of PR #4 (so it carries the still-open PRs #2, #3 and #4).
Nothing was pushed to `main` and no PR was opened. 19 commits, each built (`npm run build`) before it was made.
Tests: 1,230 passing (`npm test`). Typecheck and lint are at the baseline in `CLAUDE.md`.

## What changed, by feature

### 1. Interactive lessons (Part 1)

- **All 35 lessons are rewritten as short interactive steps** (`src/content/lessons/<unit>.ts`, one file per
  unit, plain data). 276 steps; 87% are interactive (the fewest in any one lesson is 86%); each lesson opens with
  a problem, never a text card, and ends with a one-line takeaway, then the graded written argument and the
  explain-it-back chat as before.
- **Eight reusable, typed step components** (`src/components/steps`): Spot the Flaw, Argument Builder, Sort It,
  Confidence Slider, Which Is Stronger, Evidence Updater, Correlation vs Causation, Fill the Gap (plus a plain
  choice and a text card). Every drag has a tap or keyboard route. Right and wrong are shown with a word, an icon
  and a border style, not colour alone. Motion respects `prefers-reduced-motion`.
- **Lesson player:** progress bar, Continue locked until the step is answered, instant feedback with one or two
  sentences of "why", a specific reason for every wrong answer with retry, hints on the harder steps (costs half
  the XP), "Show me" after two misses, a celebration at the end (mascot, XP, streak). Level-up and badge popups
  wait until the lesson is over.
- **Existing systems still fed:** mastery, calibration (the confidence steps), spaced-repetition review queue,
  skill rating, badges, XP and streak.
- **Content rules enforced by tests** (`src/content/lessons/lessons.test.ts`): at most 40 words before an
  interaction, explanations at most 3 sentences, at least half the steps hinted, only made-up people and
  companies, no partisan topics, answer positions and lengths not predictable, all numbers checked by
  hand-worked figures (base rates, expected value).
- A lesson that fails validation falls back to the old AI-generated flow (`LegacyLesson`), so a bad script can
  never lock someone out.

### 2. Legal and compliance (Part 2)

| # | Item | What was done |
| - | ---- | ------------- |
| 1 | Privacy Policy | Rewritten in plain English from the code: what is collected and why, the real third parties, retention, deletion, teens, contact. Placeholders where facts are yours to supply. |
| 2 | Terms of Service | Acceptable use, age, AI disclaimer, educational use only, no warranty, liability, termination, change notice, governing-law placeholder. Also: AI content notice, cookies/storage, community guidelines, "not professional advice", copyright notice. |
| 3 | Sign-up consent | Unchecked "I agree to the Terms and Privacy Policy" with both linked; the server stamps the time and stores the versions (`consent_records`). Existing accounts see a consent screen once. |
| 4 | Age gate | Neutral date-of-birth entry (no hint which age gets in). Under 13: no account, and nothing entered is stored anywhere. 13-17: must confirm a parent or guardian's permission. Only the band (`13-17` / `18+`) is kept, never the date. |
| 5 | Delete and export | Settings, Your data: download everything as JSON (includes consent history, blocks and reports you sent), and a typed-confirmation permanent delete that removes the sign-in identity and everything under it in one step. "Request my data" links to the contact email. |
| 6 | AI disclosure | "AI-generated" label or note on tutor chat, written feedback, debate motion and scoring, drills from the AI pool. Every model call passes through `withGuardrails()`: critical thinking only, learner text is data, it is an AI that can be wrong, no medical/legal/financial advice, refuse harmful or explicit requests. A test scans the source and fails if a call skips it. |
| 7 | Social safety | Block, report and remove a friend. Profiles are **minimal by default** (name, handle, avatar); streak, XP, badges and the weekly league need the owner to switch on sharing. Blocking ends the friendship, shared streak, nudges and open debates and hides each person from the other. There is no free-text messaging anywhere; nudges and debates are friends-only. |
| 8 | RLS | Audited from the real migrations (`docs/rls-audit.md`). All 25 tables have RLS. Findings and fixes below. |
| 9 | Accessibility | axe-core over 30 routes at 375px and 1280px, light and dark, sign-up states, the Friends screen and every lesson step. Fixed landmarks (there was no `<main>`), added a skip link, course-map text contrast (3.3:1 to 5.6:1), 44px touch targets, missing h1s and unlabelled fields. Now zero violations on everything checked. |
| 10 | Acknowledgements | `/legal/acknowledgements`, generated from the installed packages (`npm run licenses`). A test fails if a dependency is missing or not permissively licensed. Fonts listed separately. |
| 11 | Honest claims | Removed or softened: "Learn anything with AI" (the app no longer builds courses), "any topic", "learning sticks", "sharper", "timed to when you'd forget", Apple Pay, "cancel any time in Settings". A test bans them. Removed an invented `safety@lamppost.app`. |
| 12 | Links | Privacy, Terms, Acknowledgements and Support are in the footer of sign-in, onboarding, consent and every legal page, and in Settings. New `/support` page. |

**RLS audit findings:** no table was missing RLS. Fixed: `moderation_blocks` carried a stray privilege
(migration 2); friends could read each other's streak, XP, activity and badges whatever the owner wanted, and
search returned strangers' streaks (migration 3). Also found and fixed outside the database: the Friends screen
loaded a QR code from `api.qrserver.com` on every visit, sending the invite link to a third party; it now loads
only on request and is disclosed.

### 3. Polish (Part 3)

No console errors and no failed loads on any of the 30 routes at 375px or desktop, light or dark. Key screens
spot-checked by eye at both widths. New screens have empty, loading and error states. What I could not do is in the
checklist below.

## Decisions I made without you

- **Account deletion is a server function, not a Supabase Edge Function.** The point of the Edge Function was to
  keep the service-role key away from the browser; a server function does exactly that, is how every privileged
  write here already works, and is testable. An Edge Function needs Deno deployment I can't run from here, and
  a silently failed deploy would break account deletion (an App Store requirement). It can be wrapped later.
- **Minimum age 13; 13-17 confirm guardian permission with a checkbox** (no verification).
- **Age band, not date of birth**; an under-13 who reloads can enter again, because remembering the block would
  mean storing something derived from what they entered. Flagged for a lawyer.
- **Everyone starts on minimal visibility, including existing accounts.** The friends league becomes opt-in in
  effect. Accepting a shared streak shares "did you practise today" with that friend.
- **Reports about people** are kept unlinked from the reporter if they delete their account; deleted with the
  reported person. Blocks are deleted with either account.
- **Existing accounts are shown the consent screen once**; declining signs them out (data stays).
- **Lessons are not labelled "AI-generated"**, because they are written in advance and checked by tests. The
  documents say so honestly: drafted with AI assistance, not reviewed by a subject-matter expert.
- **The old per-step Socratic pop-up and the inserted "easier drill" are not part of the new lesson flow** (they
  belong to the old drill sequence). The old flow remains as the fallback.
- **The legal-page "Draft" banner shows only while a `[PLACEHOLDER]` is open.**
- **Placeholders, never guesses,** for every legal or business fact.

## New migrations (apply in this order, after PRs #2-#4)

All are additive; nothing is dropped or renamed. Each has a tested rollback in `docs/rollback/` (not applied
automatically).

1. `20260930100000_consent_and_age.sql`: profile columns for accepted versions, age band and guardian
   confirmation; `consent_records`; `record_consent()`.
2. `20260930100100_tighten_moderation_blocks.sql`: revokes a stray browser privilege on `moderation_blocks`.
3. `20260930100200_blocks_reports_visibility.sql`: `profiles.profile_visibility` (default `minimal`),
   `user_blocks`, `user_reports`, `block_user()`, a trigger refusing requests between blocked people, stricter
   friend-read policies, and search, invite and league functions that respect blocks and visibility.

`src/integrations/supabase/types.ts` was extended by hand for these; Lovable will regenerate it.

## Dependencies

**None added.** `axe-core` and the audit scripts live outside the repo. One npm script was added
(`npm run licenses`).

## Needs Dexter

**Fill in (all in `src/lib/legal-config.ts`; every legal page reads from it):**
- [ ] `COMPANY_NAME`, `CONTACT_EMAIL`, `MAILING_ADDRESS`, `GOVERNING_STATE`, `EFFECTIVE_DATE`.
- [ ] The four `[CONFIRM: ...]` notes in `src/lib/legal.ts` (search for `CONFIRM`): backup retention, whether the
      AI provider keeps or trains on requests, any other processors, a payments provider.
- [ ] When you change the legal text in a way people should be asked about again, bump `TERMS_VERSION` /
      `PRIVACY_VERSION`; everyone then sees the consent screen once.

**For a lawyer** (22 sections carry a "Needs legal review" tag):
- [ ] The age position: 13 minimum, checkbox guardian confirmation for 13-17, and the under-13 retry.
- [ ] Liability limits, governing law, dispute resolution, termination, the AI-content and "not professional
      advice" wording, the DMCA agent details.
- [ ] Retention of reports about people, and of content reports.

**For a parent or teen reader:** the teen sign-up copy and the "Children and teens" section of the policy.

**Before you merge:**
- [ ] Merge PRs #2, #3, #4 first (this branch sits on top of them), then apply the three migrations.
- [ ] Check the fonts' licences on Google Fonts (all five are listed as SIL OFL 1.1; I could not verify from here).

**Can't verify from here:**
- [ ] `src/assets/fox-mascot.png` and `src/assets/ai-bot.png` are **not used anywhere**, are of unknown origin,
      and probably AI-generated in Lovable. Delete them or confirm you have the right to them. Same for
      `public/favicon.ico`. The companions, badges and illustrations in the app are drawn in code.
- [ ] The lessons were drafted with AI assistance and checked by tests, not by a person. Have someone read them
      for facts and tone; the worked figures (base rates, expected value) were checked by hand.

**Recommended follow-ups:**
- [ ] Self-host the five fonts. Google Fonts sees every visitor's address and browser; the policy discloses it.
- [ ] Delete `generateOutline` and `generateLessonChunk` (`course-ai.functions.ts`): no screen calls them, but
      they are still public, rate-limited AI endpoints.
- [ ] A signed-out person can use every screen, including the AI features, without an age check (they are
      limited by IP rate limits only). Decide whether that is acceptable.
- [ ] Payments are not live (the Practice page says so). When you enable them, update the policy and Terms.

**Unfinished / paused:**
- The installable PWA, web-push reminders and the Playwright end-to-end suite from the earlier plan (PRs 5,
  5b, 6) are paused. The Lighthouse baseline (mobile: performance 66, accessibility 100, best practices 96,
  SEO 92, PWA 38; Lighthouse 11, production build, gzip).
- I walked lesson 1 end to end in a real browser and checked every step of every lesson in jsdom (renders, axe
  clean in two states), but did not drive all 35 lessons in a browser. Signed-in screens (Friends, Settings'
  account section) were checked in jsdom, not with a real account, because there is no test login here.
- Lesson steps in dark mode were checked through token contrast tests, not by eye.

## Follow-up: one calm theme (after the pass above)

Asked whether to go serious or all-in on the animal, I kept the companion but made it a supporting character:

- **One theme.** The course map used to switch to its own dark "expedition" theme, and Home used a different
  type and colour set (sans headings, amber nav). Both now use the same light and dark tokens as every other
  screen; dark is a Settings choice, not a per-screen switch. The map's wording is plainer: "Your path", "Up
  next", "Lesson 2" instead of "Expedition route" and "checkpoints cleared".
- **Fixed a bug found on the way:** the map's labels were laid out side by side instead of stacked, which
  squeezed the text (visible as "Lesson / 2" cut off at the edge).
- **Quieter companion.** Smaller on the sign-up and consent screens, calm "happy" instead of "excited" and
  no bounce after answers, and the end-of-lesson celebration is smaller. "Nailed it." and "Called it!" became
  "Correct." and "You called it."
- **Game layer off the main path.** The reward chest after a lesson, review or challenge is one quiet row
  ("A reward chest is waiting" and an Open button) instead of a card; the odds and history stay one tap away on
  the Rewards screen. Streak and XP are unchanged.
- **Fixed:** the completion overlay said "+100 XP" whatever the real amount; it now says "Progress saved".
- Not done: testing with real learners. That is the part only you can do.

## Follow-up: Progress and the three step types that stalled (from the design review)

- **Progress opens with what you have learned.** A streak strip (the number, the longest run, seven dots)
  comes first and opens a sheet with the calendar, freezes and today's goal. Then Skills, with the strongest
  skill and any under 65% named in words once there are three answers to go on (`lib/progress-view.ts`), and a
  List / Map switch (the map is the Home graph). Calibration, Achievements, Written responses and This week
  are one-line rows that open. The streak "N h left" countdown is now "A lesson today keeps the streak going."
  The per-unit level names ("Proficient" next to 56%) are gone from this list; they read as contradicting the
  percentage. The streak calendar now has the month and weekday letters.
- **Sort it** shows one card at a time with all buckets in reach; **Spot the flaw** is one paragraph with the
  phrases underlined in place and no Try again button; the **evidence updater** keeps the three answers on screen,
  marked, with the verdict under them and Next last, and hides the hint once a card is answered.
- **Different from the mock-ups:** a wrong sorted card has no one-tap "Move it to the right bucket" button, because
  that would hand over the answer and get round "Show me after two misses"; it says why and you move it yourself.
  Phrases in Spot the flaw are inline text, so they are about 32px tall rather than 44px (WCAG 2.5.8 allows this
  for targets inside a sentence); `steps-visual.test.tsx` says so.
- **Found, not fixed:** the badge and level-up pop-up's small label ("BRONZE UNLOCKED") is 2.9:1 on the light
  theme (`RewardHost.tsx`, tier colours in `BadgeIcon.tsx`).

## Follow-up: the rest of the design review (headers, settings, onboarding, one map, small fixes)

- **One header.** `ScreenHeader` is a back arrow, the page title in the serif and an optional line of
  description, 20px gutter, 24px before the first block. The daily review, schedule, challenge, league, debates and
  companion screens use it; the league's rules fold into one row. Lessons and reviews in progress keep just the bar.
- **Settings** is four short groups (Practice, Comfort, Account and data, About). The nine legal cards are one row that
  opens **About and policies** (`/legal`), one line per document. Training focus is a row that opens a sheet that says
  it only changes review drills. Clear progress on this device is a plain red row behind the same confirm.
- **Onboarding is three screens:** intro, one real question with the real feedback (`FIRST_QUESTION` in
  `lib/onboarding.ts`), and a setup screen (daily goal; start from the beginning, skip what I know, or choose a unit).
  The motivation question is gone from onboarding (it is still "Training focus" in Settings). Choosing a companion is
  offered once on Home after the first lesson and is final on "Not now". **Changed on purpose:** onboarding no longer
  ends on the sign-up screen; Profile and Settings still offer it.
- **One map.** My Path's units open in place into their five lessons; Home is the next lesson, one line about reviews
  and the seven units as a strip; the winding trail screen is gone (`/course/:slug` redirects to My Path).
- **Every unit is open.** This needed a real change to what "done" means: progress used to be a count ("the first N
  lessons"), so finishing lesson 20 would have marked 1 to 19 done. It is now the set of lessons finished
  (`doneLessons`); the count is its size, and older saves read as the first N (tested). The graph has no locks.
- **Small fixes done:** no disabled checkout on the Practice page; Profile says so when there are no badges; rows stop
  touching; an empty review says when the next one is; the hint cost shares a line with the hint; the locked challenge
  doesn't promise a streak; Home shows no counters or empty review card before the first lesson.
- Not changed: anything signed-in that I can't see without a test login (friends, account data), and the daily
  challenge still draws only from lessons you have finished.

## Suggested App Store privacy label (from the data the code actually handles)

Not legal advice; check against the live app before submitting.

| Category | Collected? | Linked to the person | Used for |
| -------- | ---------- | -------------------- | -------- |
| Contact info: email address | Yes (accounts) | Yes | Account and app functionality |
| Contact info: name | Yes (display name, chosen by the user) | Yes | App functionality (shown to friends) |
| Identifiers: user ID | Yes | Yes | App functionality |
| User content: other user content | Yes (written arguments, tutor chat, debate answers) | Yes | App functionality (sent to an AI provider to reply) |
| Usage data: product interaction | Yes (lessons, XP, streak, daily activity) | Yes | App functionality |
| Other: age band (13-17 / 18+) | Yes | Yes | App functionality, legal compliance |
| Diagnostics | No ([CONFIRM] Lovable's preview error capture) | n/a | n/a |
| Purchases | No (payments not live) | n/a | n/a |
| Location, contacts, health, financial, browsing or search history, sensitive info | No | n/a | n/a |

- **Tracking:** No. No ads, analytics SDK or tracking pixel is installed.
- **Data used to track you:** none.
- **Account deletion in the app:** Yes (Settings, Your data).
- **Third parties that receive data:** the hosting and auth provider, the AI provider (typed text only when a
  feature is used), Google Fonts (address and browser details), Google (only if the person signs in with it),
  api.qrserver.com (only if the person taps Show QR code).
- **Google Play Data safety:** same answers; data is encrypted in transit (HTTPS); deletion is available in the
  app and by contacting support.

## Where to look

`PLAN.md` (what I planned and what changed), `docs/rls-audit.md`, `docs/data-inventory.md`,
`docs/rollback/`, `CLAUDE.md` (updated for consent, deletion, visibility and guardrails).
