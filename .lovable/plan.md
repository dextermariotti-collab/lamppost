# Winding learning path + a fox with real personality

Rebuild the course path screen to match the winding-trail reference, and upgrade the fox companion so it looks polished and animates on its own.

## 1. Winding path screen (`/course/$slug`)

- Replace the flat vertical lesson list with an S-curve trail: a dashed SVG path drawn behind the nodes, nodes alternating left/center/right down the screen.
- Node states, matching the reference:
  - **Done** — filled purple circle with a check ring.
  - **Current** — larger circle carrying the fox avatar, with a soft pulsing ring and a floating "Start +50 XP" callout card next to it (title, "Earn XP", play + mic buttons).
  - **Locked** — muted dashed circle with a lock icon.
- Course header card stays, restyled toward the reference: title, one-line blurb, segmented progress bar with the percentage on the right.
- Add a "unit complete / locked unit" card in the reference's style (lock badge, "Complete all the lessons in this unit to advance", "Keep Going" button) shown when the next unit isn't reachable yet.
- Stat pill row at the top (streak / XP / gems) in the compact rounded-capsule style from the reference.
- Trail decoration: faint clouds/bushes in the background, using existing tokens only.

## 2. Fox mascot polish

- Redraw the fox in `CompanionAvatar` so it reads well at small sizes: rounder head, defined snout and cheek fluff, brighter ear inners, highlighted eyes, tail curl behind the body. Still pure code-drawn SVG — no image assets.
- Give it its own idle life via CSS-only animations on grouped SVG parts:
  - gentle breathing bob (whole body),
  - periodic blink,
  - tail sway,
  - ear twitch on an offset loop,
  - a hop + wiggle "reaction" variant for correct answers and celebrations.
- Add a `pose` prop (`idle | happy | cheer | peek`) so screens pick the behaviour instead of hardcoding classes.

## 3. Fox peeking over cards

- New small wrapper that anchors the fox to the top edge of a card so it always overlaps the card border (never free-floating): used on the locked-unit card and the course header card.
- Peek pose animates in with a rise + settle, then falls into the idle loop.

## Scope notes

- Presentation only: no changes to progress, review scheduling, or AI generation logic.
- Keeps the current lavender/purple palette, Baloo 2 + Nunito type, bottom nav, and all existing routes.
- All animation stays CSS keyframes in `src/styles.css` (no new dependency), with `prefers-reduced-motion` respected.

## Technical details

- `src/components/CompanionAvatar.tsx` — redrawn fox geometry, grouped `<g>` layers for animatable parts, new `pose` prop; other species keep working unchanged.
- `src/components/CompanionPeek.tsx` — new anchored peek wrapper.
- `src/components/LessonTrail.tsx` — new component owning the SVG dashed curve, node placement, and callout card.
- `src/routes/course.$slug.index.tsx` — swap the lesson list for `LessonTrail`, restyle header, add unit-lock card.
- `src/styles.css` — add keyframes/utilities: `fox-bob`, `fox-blink`, `fox-tail`, `fox-ear`, `fox-hop`, `peek-in`, `trail-dash`.
