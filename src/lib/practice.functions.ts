import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { screenLocally } from "./moderation";
import { FREE_WEEKLY_PRACTICE, MAX_PRACTICE_TURNS, type PracticeTurn } from "./practice";
import { limitedFailure, type LimitedFailure } from "./rate-limit";

/** Monday-start week key used for the free allowance window. */
function weekStartIso() {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7;
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day, 0, 0, 0),
  );
  return start.toISOString();
}

/** Longest reply a learner can send the tutor in one turn. */
export const MAX_PRACTICE_ANSWER_CHARS = 1500;

const ContextSchema = z.object({
  slug: z.string().min(1).max(120),
  lessonIndex: z.number().int().min(0).max(200),
  topic: z.string().min(1).max(200),
  lessonTitle: z.string().min(1).max(200),
  lessonText: z.string().max(6000),
  earlierLessons: z.array(z.string().max(200)).max(40),
  companionName: z.string().min(1).max(40),
});

export const TurnSchema = z.object({
  context: ContextSchema,
  transcript: z
    .array(z.object({ role: z.enum(["tutor", "learner"]), text: z.string().max(2000) }))
    .max(MAX_PRACTICE_TURNS * 2 + 2),
  /** Empty on the opening turn. */
  answer: z.string().max(MAX_PRACTICE_ANSWER_CHARS),
  sessionId: z.string().uuid().nullable(),
});

export type PracticeAccess = {
  subscribed: boolean;
  usedThisWeek: number;
  freeAllowance: number;
  /** Sessions left before the upgrade card appears. */
  remaining: number;
  canPractise: boolean;
};

export type PracticeReply =
  | {
      ok: true;
      sessionId: string;
      reply: string;
      done: boolean;
      verdict: "solid" | "shaky" | "revisit" | null;
      remembered: string | null;
      connectionMade: boolean;
      access: PracticeAccess;
    }
  | { ok: false; reason: string; upgrade?: boolean; blocked?: boolean }
  | LimitedFailure;

type ModelReply = {
  reply: string;
  done: boolean;
  verdict: "solid" | "shaky" | "revisit" | "none";
  remembered: string;
  connectionMade: boolean;
};

/**
 * Gemini does not enforce response schemas, so parse its JSON loosely and
 * normalise the field names it actually emits (question vs reply, null close).
 * Falls back to treating the raw text as a plain reply when it is not JSON.
 */
function parseModelReply(text: string, forcedClose: boolean): ModelReply {
  const trimmed = text.trim();
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      reply: trimmed.slice(0, 600),
      done: forcedClose,
      verdict: "none",
      remembered: "",
      connectionMade: false,
    };
  }
  try {
    const raw = JSON.parse(match[0]) as Record<string, unknown>;
    const reply = [raw["reply"], raw["response"], raw["feedback"]].find(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
    const question = [raw["question"], raw["follow_up_question"], raw["followUpQuestion"]].find(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
    const verdict = ["solid", "shaky", "revisit"].includes(String(raw["verdict"]))
      ? (raw["verdict"] as ModelReply["verdict"])
      : "none";
    return {
      reply: [reply, question].filter(Boolean).join("\n\n").trim().slice(0, 600),
      done: raw["done"] === true,
      verdict,
      remembered: typeof raw["remembered"] === "string" ? raw["remembered"] : "",
      connectionMade: raw["connectionMade"] === true || raw["connection_made"] === true,
    };
  } catch {
    return {
      reply: trimmed.slice(0, 600),
      done: forcedClose,
      verdict: "none",
      remembered: "",
      connectionMade: false,
    };
  }
}

function describe(error: unknown): { reason: string } {
  const text = (() => {
    const parts: string[] = [];
    let current: unknown = error;
    for (let depth = 0; depth < 4 && current; depth += 1) {
      const e = current as Record<string, unknown>;
      for (const key of ["message", "responseBody", "statusCode", "status"]) {
        const value = e[key];
        if (typeof value === "string" || typeof value === "number") parts.push(String(value));
      }
      current = e["cause"];
    }
    return parts.join(" ") || String(error);
  })();
  console.error("Practice gateway error:", text);
  if (/402|credit|quota|billing|payment/i.test(text)) {
    return { reason: "Practice is unavailable right now — the AI workspace is out of credits." };
  }
  if (/429|rate.?limit/i.test(text)) {
    return { reason: "Practice is busy right now. Wait a moment and tap retry." };
  }
  return { reason: "Practice is unavailable right now. Tap retry in a moment." };
}

type Ctx = { supabase: SupabaseLike; userId: string };
type SupabaseLike = {
  from: (table: string) => any;
};

async function readAccess({ supabase, userId }: Ctx): Promise<PracticeAccess> {
  const db = supabase as any;
  const [{ data: sub }, { count }] = await Promise.all([
    db
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", userId)
      .maybeSingle(),
    db
      .from("practice_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", weekStartIso()),
  ]);

  const status = (sub?.status ?? "none") as string;
  const notExpired =
    !sub?.current_period_end || new Date(sub.current_period_end).getTime() > Date.now();
  const subscribed = ["active", "trialing", "past_due"].includes(status) && notExpired;
  const usedThisWeek = count ?? 0;
  const remaining = Math.max(0, FREE_WEEKLY_PRACTICE - usedThisWeek);

  return {
    subscribed,
    usedThisWeek,
    freeAllowance: FREE_WEEKLY_PRACTICE,
    remaining,
    canPractise: subscribed || remaining > 0,
  };
}

/** Paid status + how much of the free weekly allowance is left. */
export const getPracticeAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PracticeAccess> => readAccess(context as unknown as Ctx));

/**
 * One tutor turn. The opening turn (empty `answer`) creates the session row,
 * which is also what the weekly allowance is counted from.
 */
export const practiceTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TurnSchema.parse(input))
  .handler(async ({ data, context }): Promise<PracticeReply> => {
    const ctx = context as unknown as Ctx;
    const { supabase: db, userId } = ctx;
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false, reason: "AI isn't configured for this project yet." };

    const opening = data.sessionId === null;
    const access = await readAccess(ctx);
    if (opening && !access.canPractise) {
      return {
        ok: false,
        upgrade: true,
        reason: "You've used this week's free practice sessions.",
      };
    }

    if (!opening) {
      const screened = screenLocally(data.answer);
      if (!screened.allowed) return { ok: false, reason: screened.message, blocked: true };
      if (data.answer.trim().length === 0) {
        return { ok: false, reason: "Write a sentence or two first." };
      }
    }

    // Counted before the session row exists, so a refused turn never uses up one of
    // the week's free sessions.
    const { limiter } = await import("./rate-limit.server");
    const verdict = await limiter().enforce("practiceTurn");
    if (!verdict.ok) return limitedFailure(verdict);

    // Session rows are what the free weekly allowance is counted from, so the browser
    // can't create, edit or delete them; they are written here with the service role.
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

    let sessionId = data.sessionId;
    if (!opening) {
      // A follow-up turn must belong to a real, unfinished session of this learner;
      // otherwise a made-up id would get unlimited tutor turns without opening one.
      const { data: existing } = await db
        .from("practice_sessions")
        .select("id, completed_at")
        .eq("id", sessionId!)
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing || existing.completed_at) {
        return { ok: false, reason: "That practice session has ended. Start a new one." };
      }
    }
    if (opening) {
      const { data: row, error } = await admin
        .from("practice_sessions")
        .insert({
          user_id: userId,
          course_slug: data.context.slug,
          course_topic: data.context.topic,
          lesson_index: data.context.lessonIndex,
          lesson_title: data.context.lessonTitle,
          transcript: [],
        })
        .select("id")
        .single();
      if (error || !row) {
        console.error("Could not open practice session", error);
        return { ok: false, reason: "Practice couldn't start. Tap retry in a moment." };
      }
      sessionId = row.id as string;
    }

    const transcript: PracticeTurn[] = opening
      ? []
      : [...data.transcript, { role: "learner" as const, text: data.answer.trim() }];
    const learnerTurns = transcript.filter((t) => t.role === "learner").length;

    try {
      const { streamText } = await import("ai");
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const { PRACTICE_SYSTEM, openingPrompt, turnPrompt } = await import("./practice.server");
      const gateway = createLovableAiGatewayProvider(key);

      const forcedClose = learnerTurns >= MAX_PRACTICE_TURNS;
      const result = streamText({
        model: gateway("google/gemini-3.7-flash"),
        system: PRACTICE_SYSTEM(data.context),
        prompt: opening
          ? openingPrompt(data.context)
          : turnPrompt(data.context, transcript, learnerTurns),
        maxRetries: 1,
      });
      const text = await result.text;
      if (!text.trim()) throw new Error("Empty reply from the AI gateway");
      const parsed = parseModelReply(text, forcedClose);

      const done = parsed.done || forcedClose;
      const verdict = done ? (parsed.verdict === "none" ? "shaky" : parsed.verdict) : null;
      const nextTranscript: PracticeTurn[] = [
        ...transcript,
        { role: "tutor", text: parsed.reply.trim() },
      ];

      await admin
        .from("practice_sessions")
        .update({
          transcript: nextTranscript,
          ...(done
            ? {
                verdict,
                remembered: parsed.remembered.trim() || null,
                connection_made: parsed.connectionMade,
                completed_at: new Date().toISOString(),
              }
            : {}),
        })
        .eq("id", sessionId!)
        .eq("user_id", userId);

      return {
        ok: true,
        sessionId: sessionId!,
        reply: parsed.reply.trim(),
        done,
        verdict,
        remembered: done ? parsed.remembered.trim() || null : null,
        connectionMade: done ? parsed.connectionMade : false,
        access: opening ? await readAccess(ctx) : access,
      };
    } catch (error) {
      return { ok: false, ...describe(error) };
    }
  });

/** Recent finished sessions, for the profile/progress read-out. */
export const listPracticeSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase: db, userId } = context as unknown as Ctx;
    const { data } = await db
      .from("practice_sessions")
      .select(
        "id, course_slug, course_topic, lesson_title, verdict, remembered, connection_made, completed_at",
      )
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(20);
    return data ?? [];
  });
