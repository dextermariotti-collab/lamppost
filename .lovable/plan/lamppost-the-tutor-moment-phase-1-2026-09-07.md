# Lamppost: the tutor moment (phase 1)

Only the active-practice AI feature ships in this pass, with real paid access. Streak forgiveness, the character cast, leagues and reminder copy come in separate passes after this one.

## What the learner experiences

After finishing a lesson's quiz, a new final step appears: **Explain it back.**

1. The companion asks one open question about the lesson just finished — "In your own words, why does X happen?" — no options to pick from.
2. The learner types (or dictates via the keyboard) a few sentences.
3. The companion replies in seconds with real feedback: what they got right, what they missed, and one nudge — then asks one follow-up question that builds on their exact wording.
4. After two or three exchanges it closes with a short read on their understanding: solid, shaky, or needs another look — plus the single sentence they should remember.
5. That read feeds the review schedule: a shaky explanation brings the lesson back sooner, a strong one pushes it further out (same mechanism prediction answers already use).

Skipping is always allowed; the lesson still completes and XP is still awarded.

## Serving the connections moat, not just the streak

XP here is not paid for finishing — it is paid for the explanation. The follow-up question deliberately asks the learner to link the new idea to something from an earlier lesson in the same course, and a bonus is awarded only when they actually make that link. This keeps the reward tied to demonstrated understanding rather than attendance. Noted as a standing rule for every later gamification addition.

## Free vs paid

- Free stays complete: every generated course, every lesson, every quiz, the review schedule, streaks, and profile — untouched.
- **Lamppost Practice** is the paid tier and covers the explain-it-back conversations.
- Everyone gets a small weekly allowance of practice sessions (3) so the feature is felt before it is bought; past that, the step shows a short upgrade card instead of the paywall-blocking the lesson.
- Real checkout: a monthly subscription with a manage/cancel link, plus a restore path so an existing subscriber is recognised on any device. Confirming the payment provider is the first build step, since connecting it needs your account.

## Empty and failure states

- Out of AI credits, rate limited, or the model errors: an honest card ("Practice is unavailable right now") with a retry, never a fake reply.
- No network mid-conversation: the draft is preserved.
- Off-topic or abusive input runs through the existing moderation gate before reaching the model.

## Technical notes

- New `src/lib/practice.functions.ts` server function drives the dialogue: streamed gateway call (`streamText` consumed server-side), companion-voiced system prompt built from the lesson's title, parts, prediction and quiz text, plus prior turns. Structured close-out (verdict, remembered sentence, connection-made flag) via a small `Output.object` schema with the `NoObjectGeneratedError` fallback.
- Model: `google/gemini-3.7-flash` for turn latency; entitlement and allowance are checked server-side before any gateway call.
- New tables: `practice_sessions` (user, course slug, lesson index, transcript, verdict, connection flag) and `subscriptions` (user, status, provider ids), both with RLS and explicit grants; weekly allowance derived from `practice_sessions` counts, never from client state.
- `src/lib/reviews.ts` gains a practice signal alongside the existing prediction weighting; `progress.ts` awards the connection bonus.
- New `PracticeChat` component rendered as the last step in `src/routes/course.$slug.lesson.$index.tsx`, styled with the existing lavender/lamplight language and the user's chosen companion; no new animation dependency.
- Payments wired through the recommended provider's hosted checkout with a signed webhook under `src/routes/api/public/` updating `subscriptions`.
