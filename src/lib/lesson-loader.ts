import type { Lesson } from "./courses";
import type { Exercise, ExerciseKind, WrittenPrompt } from "./exercises";
import type { LessonContentResult } from "./curriculum.functions";
import { isPending, requestableParts, slotOf, type PartName } from "./lesson-parts";
import { isLimited } from "./rate-limit";

/**
 * Opens a lesson in the browser without ever blocking on the slow part.
 *
 * A cached lesson arrives whole. One that isn't is written in parts (see
 * lesson-parts.ts): this asks for the idea card, hands it over the moment it
 * exists, then asks for every drill and the written task at once and hands each
 * over as it lands. Framework-free so the timing and the failure handling can be
 * tested without React; the hook in curriculum-store.ts wraps it.
 */

export type LoaderState = {
  /** The lesson so far: the idea card once it exists, the whole lesson when complete. */
  lesson: Lesson | null;
  /** One entry per planned drill; null until that drill has been written. */
  drills: (Exercise | null)[];
  written: WrittenPrompt | null;
  complete: boolean;
  /** The lesson couldn't be opened at all (there is no idea card to show). */
  error: string | null;
  /** Something is slow or limited but the lesson is usable so far. */
  notice: string | null;
  /** Parts that gave up after retrying; a retry starts them again. */
  failed: PartName[];
};

export const emptyState = (plan: readonly ExerciseKind[]): LoaderState => ({
  lesson: null,
  drills: plan.map(() => null),
  written: null,
  complete: false,
  error: null,
  notice: null,
  failed: [],
});

export type LoaderDeps = {
  /** Where to pick up from, so a retry keeps the drills that already arrived. */
  initial?: LoaderState;
  fetchLesson(): Promise<LessonContentResult>;
  fetchPart(part: PartName): Promise<LessonContentResult>;
  onChange(state: LoaderState): void;
  isCancelled(): boolean;
  sleep?(ms: number): Promise<void>;
  /** How often to ask again while someone else is writing a part. */
  pollMs?: number;
  /** How long to keep asking before saying it is taking a while. */
  maxWaitMs?: number;
  /** Waits before each retry of a part that failed. */
  retryMs?: readonly number[];
};

const TAKING_LONG = "This is taking longer than usual.";
const COULD_NOT_OPEN = "This lesson couldn't be loaded. Try again in a moment.";

export async function loadLesson(plan: readonly ExerciseKind[], deps: LoaderDeps): Promise<void> {
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const pollMs = deps.pollMs ?? 2000;
  const maxWaitMs = deps.maxWaitMs ?? 180_000;
  const retryMs = deps.retryMs ?? [1500, 4000, 9000];

  let state = deps.initial ?? emptyState(plan);
  let done = false;
  const publish = (next: Partial<LoaderState>) => {
    if (deps.isCancelled()) return;
    state = { ...state, ...next };
    deps.onChange(state);
  };

  const adopt = (lesson: Lesson) =>
    publish({
      lesson,
      drills: plan.map((_, i) => lesson.exercises?.[i] ?? null),
      written: lesson.written ?? null,
      complete: true,
      error: null,
      notice: null,
      failed: [],
    });

  /** Folds whatever a response knows into the state. Returns false if it holds nothing new. */
  const merge = (result: LessonContentResult): boolean => {
    if (!result.ok) return false;
    if (done) return true;
    if (result.complete) {
      done = true;
      adopt(result.lesson);
      return true;
    }
    publish({
      lesson: result.lesson,
      drills: state.drills.map((mine, i) => mine ?? result.drills[i] ?? null),
      written: state.written ?? result.written,
      error: null,
    });
    return true;
  };

  /** Runs one request, absorbing "someone else is writing it" until it clears or we lose patience. */
  const request = async (
    ask: () => Promise<LessonContentResult>,
    ready: (result: LessonContentResult) => boolean,
  ): Promise<LessonContentResult | "gave-up"> => {
    let waited = 0;
    let attempts = 0;
    for (;;) {
      if (deps.isCancelled() || done) return "gave-up";
      let result: LessonContentResult;
      try {
        result = await ask();
      } catch {
        result = { ok: false, reason: COULD_NOT_OPEN };
      }
      if (deps.isCancelled()) return "gave-up";
      // A reply that isn't a result at all (an error page, a dropped response) is a failure too.
      if (!result || typeof result !== "object") result = { ok: false, reason: COULD_NOT_OPEN };
      if (result.ok && (done || ready(result))) return result;
      // The server answered but the piece isn't in it: an ordinary failure, retried a few times.
      if (result.ok) result = { ok: false, reason: TAKING_LONG };
      if (isLimited(result)) return result;
      if (isPending(result)) {
        if (waited >= maxWaitMs) return { ok: false, reason: TAKING_LONG };
        await sleep(pollMs);
        waited += pollMs;
        continue;
      }
      if (attempts >= retryMs.length) return result;
      await sleep(retryMs[attempts]!);
      attempts += 1;
    }
  };

  // 1. The lesson itself: the whole thing if it is cached, else the idea card.
  const first = await request(
    deps.fetchLesson,
    (r) => r.ok && (r.complete || r.lesson.concept !== undefined),
  );
  if (first === "gave-up") return;
  if (!first.ok) {
    publish({ error: first.reason || COULD_NOT_OPEN });
    return;
  }
  merge(first);
  if (state.complete) return;

  // 2. Every drill and the written task, at once. Each lands on its own.
  const has = (part: PartName) =>
    part === "written" ? state.written !== null : state.drills[slotOf(part)!] != null;
  const wanted = requestableParts(plan).filter((part) => !has(part));

  await Promise.all(
    wanted.map(async (part) => {
      const slot = slotOf(part);
      const result = await request(
        () => deps.fetchPart(part),
        (r) =>
          r.ok && (r.complete || (slot === null ? r.written !== null : r.drills[slot] != null)),
      );
      if (result === "gave-up") return;
      if (result.ok) {
        merge(result);
        return;
      }
      publish({
        failed: [...state.failed, part],
        notice: isLimited(result) ? result.reason : TAKING_LONG,
      });
    }),
  );
  if (done || deps.isCancelled()) return;

  // 3. Everything is in: take the assembled lesson from the cache so what the
  // learner keeps is exactly what everyone else gets. Best effort.
  if (state.failed.length === 0 && wanted.every(has)) {
    try {
      const final = await deps.fetchLesson();
      if (final.ok && final.complete) adopt(final.lesson);
    } catch {
      /* the lesson in hand is complete enough to finish */
    }
  }
}
