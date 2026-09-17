# Lamppost roadmap

## Fixed critical-thinking curriculum (done)
- [x] One canonical curriculum in `src/lib/curriculum.ts`: 7 units × 5 lessons, objectives, prerequisites
- [x] Explicit cross-unit links (correlation↔base rates, confirmation bias↔cherry-picking, etc.)
- [x] Lesson content generated once per lesson id and cached in `curriculum_lessons` (public read)
- [x] Open-ended topic creation removed from the UI (`/setup`, `/create`, AI Create nav gone)
- [x] Course map + `/courses` show the seven units; home graph = unit nodes + curriculum edges
- [x] Home CTA is "Continue: <next lesson>"; onboarding copy rewritten around critical thinking
- [ ] Unit-level expansion of graph nodes to individual lessons

## Critical-thinking reframe (done)
- [x] Reasoning lens (`src/lib/thinking.ts`) applied to every outline + content prompt
- [x] Required "spot the flaw" drill per lesson: broken argument + 3 candidate diagnoses
- [x] Flaw page between the reading parts and the quiz; answer required to continue
- [x] Attempts persisted in `lamppost-flaws-v1`
- [ ] Weight review intervals with flaw attempts (currently prediction + practice only)

## Home knowledge graph
- [x] Seven-unit thinking-skills graph with real completion rings and curriculum-defined edges


## Course expedition map
- [x] Replace the playful winding trail with an asymmetric topographical route
- [x] Preserve real completed, current, locked, replay, and navigation states

## Phase 1 (in progress) — the tutor moment
- [x] practice_sessions + subscriptions tables (RLS, grants)
- [x] Practice tutor server functions (entitlement, allowance, turn handling)
- [x] PracticeChat UI on the lesson screen
- [x] Practice weighting in the review scheduler + connection XP bonus
- [ ] /premium upgrade page (checkout wired once payments enabled)
- [ ] Enable Paddle (Apple Pay supported at checkout) — form was dismissed; re-open with user

## Phase 2 (done) — streak forgiveness
- [x] Streak freeze: 1 earned every 7 streak days (max 2), buyable for 60 gems
- [x] Missed days covered automatically; "a freeze saved your streak" note on Progress

## Pivot phase 2 (done) — reasoning exercises
- [x] Exercise set: spot the flaw, hidden assumption, rank evidence, fact/opinion/value sort, predict + confidence, steelman
- [x] Lesson shape: concept card (~80 words + example) → 5 mixed drills → written argument → summary
- [x] Written argument graded 1–4 on claim/evidence/reasoning/counterargument, one revision, attempts stored
- [x] Socratic mascot line after wrong answers and ~1 in 3 right ones, optional reply
- [x] Home graph edges curve around unrelated nodes; locked-unit edges faded
- [x] Review intervals now driven directly by drill accuracy (see pivot phase 4)

## Phase 3 — small cast

- 2–3 extra characters mapped to celebration / correction / empty states

## Later
- Weekly leagues (~20–30 person XP brackets)
- Personality notification copy bank (in-app + email)

## Mobile note
- Revisit IAP if/when shipped as an iOS app (Apple rules for digital subscriptions).

## Pivot phase 3 (done)
- Per-lesson drill plans + written task type in `src/lib/curriculum.ts` (single source of truth).
- Generation constrained to the planned drills; new "find the claim" drill.
- Post-generation AI validation pass (`src/lib/exercise-validate.server.ts`): re-keys fixable drills, regenerates up to 2 times, only caches passing lessons, logs failures.
- Cached lessons invalidated via `CONTENT_VERSION = 3` and cleared rows.
- Three written task types (restate / make the case / critique) with matching passage, placeholder and rubric; grader scores against that rubric only and XP scales with score/max.
- Fixed a localStorage save loop that overflowed the stack on the lesson screen.

## Pivot phase 4 (done)
- Written-task guidance moved after submission (was spoiling the answer).
- Unfinished lessons always reload the current shared version (`useCurriculumLesson(index, completed)`); `CONTENT_VERSION = 4` regenerates every cached lesson.
- Validation pass gained two checks: no invented studies/statistics presented as fact (hypotheticals must be labelled), and no giveaway wording or length tells in options.
- Reviews are reasoning drills: `lamppost-review-drills-v1` queues drills missed or answered with low confidence, 1d → 3d → 7d → 14d, reset on a miss; each review is served as a FRESH variant from `drill_variants` (generated once, validated, shared).
- Daily challenge: one seeded drill per day from unlocked skills, counts toward the streak (`/challenge`).
- Onboarding survey: motivation, time-per-day (sets daily goal), optional 5-drill placement check that can mark the first unit-1 lessons known.
- Progress page: per-unit mastery from real drill accuracy, calibration (stated confidence vs actual), written-score trend — each with an empty state.
- Debate a friend (async): `debates` table, AI-written motion, assigned sides, both cases graded on the Make-the-case rubric, side-by-side result with winner and a tip each, badge on friends + debates list.

### Open
- [ ] Debate results are not emailed/pushed — badge only (in-app).

## Pivot phase 5 (done)
- Fixed the course-store recursion crash (infinite save/event loop).
- Lessons and drills now served from a pre-validated cache + drill pool
  (`curriculum-generate.server.ts`, `drills.functions.ts`,
  `/api/public/warm-curriculum`); runtime failures fall back silently.
- Daily challenge shows feedback + Socratic follow-up before the done card.
- Lesson-complete and unit-complete screens with accuracy, XP, streak,
  daily-goal ring and "what you practiced".
- Home: onboarding gate before render, daily goal ring next to the streak.
- Progress: one source of truth for lessons done and reviews due.
- Onboarding shortened to 1 intro slide + why + time + placement + companion
  pick; customization moved to the new `/companion` screen; copy and time
  labels corrected; duplicate headers removed.

Open: background warm-up job must finish all 35 lessons (rerun
`/api/public/warm-curriculum` until `remaining` is 0). Debate results are
still badge-only (no email/push).
