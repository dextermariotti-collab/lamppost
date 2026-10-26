import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import {
  EMPTY_LEARNING_STATE,
  LEARNING_LIMITS,
  boundLearningState,
  boundsNow,
  learningSignature,
  mergeLearningState,
  type LearningState,
} from "./learning-state";

type Row = { state: unknown; rev: number };
type Result<T> = PromiseLike<{ data: T; error: { message: string; code?: string } | null }>;
type LearningStateTable = {
  select(columns: "state, rev"): {
    eq(column: "user_id", value: string): { maybeSingle(): Result<Row | null> };
  };
  insert(row: { user_id: string; state: LearningState; rev: number }): Result<null>;
  update(row: { state: LearningState; rev: number; updated_at: string }): {
    eq(
      column: "user_id",
      value: string,
    ): {
      eq(
        column: "rev",
        value: number,
      ): { select(columns: "rev"): Result<{ rev: number }[] | null> };
    };
  };
};

/** `learning_state` isn't in the generated client types until its migration is applied there. */
const learningStateOf = (client: unknown) =>
  (client as { from(name: "learning_state"): LearningStateTable }).from("learning_state");

/** A table that isn't there yet: an unmigrated database stores nothing and enforces nothing. */
const missingTable = (error: { message: string; code?: string }) =>
  error.code === "42P01" ||
  error.code === "PGRST205" ||
  (/learning_state/.test(error.message) && /does not exist|could not find/i.test(error.message));

/** Tries to write a merge this many times when another device wrote in between. */
const ATTEMPTS = 3;

/**
 * Stores a device's learning state on the account and returns the account's copy, merged: the
 * review queue, skill ratings, drill attempts and graded writing (`lib/learning-state.ts`). The
 * device adopts what comes back, so its reviews and skills match every other device's.
 *
 * Only what `boundLearningState` believes is stored: known lessons, values in range, each part
 * capped. Nothing is ever taken away by a sync, only merged. A write that raced another
 * device's is merged again on top of it (the row's `rev`), so neither is lost. Like progress,
 * this is the learner's own record of what they did in the browser; it can't prove it.
 */
export const syncLearningState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    let size = Infinity;
    try {
      size = JSON.stringify(input).length;
    } catch {
      /* not JSON: refused below */
    }
    if (size > LEARNING_LIMITS.requestChars || typeof input !== "object" || input === null) {
      throw new Error("That didn't sync. Try again later.");
    }
    return { state: (input as { state?: unknown }).state };
  })
  .handler(async ({ data, context }): Promise<{ state: Json | null }> => {
    const { userId } = context;
    const { limiter } = await import("./rate-limit.server");
    const verdict = await limiter().enforce("learningSync");
    if (!verdict.ok) throw new Error(verdict.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = () => learningStateOf(supabaseAdmin);
    const bounds = boundsNow();
    const incoming = boundLearningState(data.state, bounds);

    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const read = await table().select("state, rev").eq("user_id", userId).maybeSingle();
      if (read.error) {
        if (missingTable(read.error)) return { state: null };
        throw new Error(read.error.message);
      }
      const stored = read.data
        ? boundLearningState(read.data.state, bounds)
        : boundLearningState(EMPTY_LEARNING_STATE, bounds);
      const merged = boundLearningState(mergeLearningState(stored, incoming), bounds);
      if (read.data && learningSignature(merged, bounds) === learningSignature(stored, bounds)) {
        return { state: merged as unknown as Json };
      }

      if (!read.data) {
        const { error } = await table().insert({ user_id: userId, state: merged, rev: 1 });
        if (!error) return { state: merged as unknown as Json };
        if (error.code === "23505") continue;
        throw new Error(error.message);
      }

      const { data: written, error } = await table()
        .update({ state: merged, rev: read.data.rev + 1, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("rev", read.data.rev)
        .select("rev");
      if (error) throw new Error(error.message);
      if (written && written.length > 0) return { state: merged as unknown as Json };
    }
    throw new Error("That didn't sync. Try again in a moment.");
  });
