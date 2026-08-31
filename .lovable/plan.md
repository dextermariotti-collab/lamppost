# Lamppost calm editorial rebuild

## Goal
Refresh the existing phone-first app without changing its product structure or rebuilding its backend. The visual system will feel like a warm study journal: quieter, more mature, and less recognizably “AI-generated,” while preserving course creation, daily review, learning paths, progress, companions, and account flows.

## Locked direction
- **Format:** Vertical mobile app, retaining the current responsive phone frame and bottom navigation.
- **Palette:** Sage Journal — paper `#F5F0E8`, soft sage `#DCE5D4`, primary sage `#7D9B76`, deep ink `#25342C`.
- **Typography:** Lora for headings and moments of emphasis; Nunito Sans for controls, labels, and reading text.
- **Surfaces:** Matte paper backgrounds, fine ink/sage borders, little or no shadow, and modest 8–14px corner radii.
- **Motion:** 160–240ms fades, short vertical reveals, and smooth progress fills only. Remove floating, bouncing, pulsing, wiggle, shimmer, glow, confetti, and scale-heavy hover effects from normal workflows.
- **Companion:** Keep the user’s chosen companion, but place it only where it communicates feedback or guidance rather than as decoration.

## Scope of the rebuild
1. **Create the editorial design system**
   - Replace the lavender gradient-led tokens with the locked sage-paper palette in light and dark-compatible semantic roles.
   - Load Lora and Nunito Sans through the root document head.
   - Restyle global type, borders, shadows, radii, focus states, buttons, inputs, progress bars, and motion utilities.

2. **Refine the shared mobile shell**
   - Simplify the simulated phone chrome and remove ornamental status details that make the experience feel like a mockup.
   - Rework bottom navigation into a calm, labeled five-item bar with a restrained Create action rather than a floating gradient button.
   - Standardize screen headers, spacing, and touch targets.

3. **Recompose the core Home screen**
   - Lead with a quiet Lamppost masthead and a clear “Today’s review” section.
   - Present review status as the primary action without urgency theatrics.
   - Follow with one clean Continue Learning row, compact streak/weekly progress, and the course creator as a secondary action.
   - Use real empty states when no reviews or courses exist.

4. **Carry the system through key workflows**
   - **Course setup:** One calm question per screen, outlined selection rows, compact progress notation, and a purposeful companion response.
   - **Courses and learning path:** Replace colorful tile treatments and floating scenery with subject-aware typography, fine rules, and a readable vertical path.
   - **Lessons and prediction cards:** Prioritize long-form readability, reduce nested cards, and use sage selection/reveal states.
   - **Progress, profile, review, settings, and legal:** Apply the same restrained hierarchy while preserving all current functionality and safety/legal markers.

5. **Verification**
   - Check the main routes at phone width and desktop-framed width for overflow, readable hierarchy, and stable fixed navigation.
   - Verify reduced-motion behavior and remove any remaining jumpy animation classes from ordinary navigation and content states.
   - Confirm existing course generation, review state, companion persistence, auth, reporting, export, and deletion behavior remains unchanged.

## Technical notes
- Frontend/presentation refactor only; no database or AI-generation changes.
- No new motion or UI dependency. Existing CSS transitions and keyframes are sufficient.
- Implement semantic tokens in `src/styles.css`; components continue using token-based Tailwind utilities.
- Update shared primitives first, then migrate routes in focused batches so the app remains usable throughout.
