## 1. Remove the floating fox from the course header

Delete the absolutely-positioned fox image (and its import) in the course path hero at `src/routes/course.$slug.index.tsx`. The fox stays on Home, Profile, and the lesson celebration screen.

## 2. New survey step after typing a topic

Flow becomes: Home input → `/setup?topic=...` → `/create?topic=...&...` → learning path.

A single compact-but-scrollable survey card on the new `/setup` route collects:
- **Course length** — 5 / 8 / 12 lessons (pill selector)
- **Difficulty** — Beginner / Intermediate / Advanced
- **Prior experience** — Total newcomer / Some exposure / Rusty but familiar
- **Goal** — short free-text ("What do you want to be able to do?"), optional
- **Focus / learning style** — Theory-first / Balanced / Hands-on practice

"Build my course ✨" carries the answers as search params into the generation screen. Home's ideas/quick-start chips route through the survey too, with sensible defaults pre-selected so it's one tap to continue.

## 3. Longer, multi-part lessons

Each lesson becomes 2–3 "pages" (parts) plus a quiz at the end:
- Part titles with a paragraph of real teaching content each (~120–160 words per part)
- Key takeaways per lesson
- A worked example / common-mistake callout on the final part
- Quiz gated behind finishing the parts, with 2 questions for longer courses

The lesson screen gets part navigation: a segmented progress bar at the top, Next/Back between parts, then the quiz card, then Continue. Animations reuse the existing `rise-in` / `pop-in` utilities so part transitions feel like the current polish.

## 4. Generation updates

`generateCourse` takes the survey answers, adapts the prompt (lesson count, depth, tone, difficulty, goal), and returns the richer lesson shape. Generation is split per batch so long courses (12 lessons × 3 parts) don't stall on one huge response: an outline call first, then lesson-content calls in parallel batches, streamed into the reveal list on the create screen so it stays lively rather than sitting on a spinner.

The create screen shows the survey summary as chips ("12 lessons · Intermediate · Hands-on") and reveals lessons as they arrive.

## Technical notes

- New route `src/routes/setup.tsx` with `validateSearch` for topic + survey params and its own `head()` metadata.
- `src/lib/courses.ts`: extend `Lesson` with `parts: { title: string; body: string }[]` and allow `quiz` to be an array of questions; keep backward-compatible reads so already-stored courses still render.
- `src/lib/course-ai.functions.ts` / `.server.ts`: accept a `CourseBrief` (topic + survey), do outline → per-lesson content generation, keep the tolerant JSON normalizer and fallback path.
- `src/lib/course-store.ts` gains the brief alongside the course so re-generation and the path header can show settings.
- Progress tracking (`useProgress`) unchanged apart from part-level completion stored per lesson.
- Verify end-to-end with Playwright: survey → generation → path → multi-part lesson → quiz.
