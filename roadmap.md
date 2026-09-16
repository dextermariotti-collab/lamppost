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
- [ ] Weight review intervals with drill accuracy (flaw + exercise scores)

## Phase 3 — small cast

- 2–3 extra characters mapped to celebration / correction / empty states

## Later
- Weekly leagues (~20–30 person XP brackets)
- Personality notification copy bank (in-app + email)

## Mobile note
- Revisit IAP if/when shipped as an iOS app (Apple rules for digital subscriptions).
