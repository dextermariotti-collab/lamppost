import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dailyCaseSchema, caseProblems, type DailyCase } from "./daily-case";
import { isPlausibleLocalDay } from "./days";
import { limitedFailure, type LimitedFailure } from "./rate-limit";

const Input = z.object({ day: z.string().max(10) });

export type GeneratedCaseResult =
  { ok: true; case: DailyCase } | { ok: false; reason: string; retry?: boolean } | LimitedFailure;

type Row = { content: unknown };
type CasesTable = {
  select(columns: string): {
    eq(
      column: string,
      value: string,
    ): {
      maybeSingle(): PromiseLike<{ data: Row | null; error: { message: string } | null }>;
    };
  };
  upsert(
    row: Record<string, unknown>,
    opts: { onConflict: string; ignoreDuplicates: boolean },
  ): PromiseLike<{ error: { message: string } | null }>;
};

/** The table isn't in the generated client types until the migration is applied there. */
const casesTable = (client: unknown) =>
  (client as { from(name: string): CasesTable }).from("generated_cases");

const usable = (content: unknown): DailyCase | null => {
  const parsed = dailyCaseSchema.safeParse(content);
  return parsed.success && caseProblems(parsed.data).length === 0 ? parsed.data : null;
};

/**
 * The AI-written daily case for a local day, for a learner who has read every written case.
 * A day's case is written once, checked, stored, and then served to everyone who asks for that
 * day without touching the limiter; only writing a new one is counted, under a per-day lease.
 */
export const getGeneratedCase = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<GeneratedCaseResult> => {
    if (!isPlausibleLocalDay(data.day)) return { ok: false, reason: "That isn't today." };
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const stored = await casesTable(supabaseAdmin)
        .select("content")
        .eq("day", data.day)
        .maybeSingle();
      const cached = stored.data ? usable(stored.data.content) : null;
      if (cached) return { ok: true, case: cached };

      const key = process.env["LOVABLE_API_KEY"];
      if (!key) return { ok: false, reason: "AI isn't configured for this project yet." };

      const { guardedGeneration } = await import("./rate-limit.server");
      const { writeCaseForDay, CASE_MODEL } = await import("./case-generate.server");
      const attempt = await guardedGeneration({
        policy: "caseGeneration",
        lockKey: `case:${data.day}`,
        lockTtlSeconds: 240,
        run: async () => {
          const written = await writeCaseForDay(data.day, key);
          if (written.ok) {
            const { error } = await casesTable(supabaseAdmin).upsert(
              { day: data.day, content: written.case, model: CASE_MODEL },
              { onConflict: "day", ignoreDuplicates: true },
            );
            if (error) console.error("[cases] storing the case failed", error.message);
          }
          return written;
        },
      });
      if (attempt.status === "limited") return limitedFailure(attempt);
      if (attempt.status === "busy")
        return { ok: false, reason: "Today's case is being written.", retry: true };
      return attempt.value.ok
        ? { ok: true, case: attempt.value.case }
        : { ok: false, reason: "No new case today." };
    } catch (error) {
      console.error("[cases] fetching the day's case failed", error);
      return { ok: false, reason: "No new case today." };
    }
  });
