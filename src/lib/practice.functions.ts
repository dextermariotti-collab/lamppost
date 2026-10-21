import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AI_MODELS, aiOutput } from "./ai-models";
import { CURRICULUM_SLUG, LESSONS, type CurriculumLesson } from "./curriculum";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { screenLocally } from "./moderation";
import {
  FREE_WEEKLY_PRACTICE,
  MAX_PRACTICE_TURNS,
  practiceWeekStart,
  type PracticeTurn,
} from "./practice";
import { limitedFailure, type LimitedFailure } from "./rate-limit";

/** Longest reply a learner can send the tutor in one turn. */
export const MAX_PRACTICE_ANSWER_CHARS = 1500;

/**
 * Which lesson the session is about: its id, or (from older apps) its title or its 1-based place
 * in the course. Everything else older apps send (the topic, the lesson text, earlier lessons,
 * a companion name and the transcript so far) is ignored: the server builds the lesson's context
 * itself and reads the conversation from the stored session.
 */
const ContextSchema = z.object({
  lessonId: z.string().max(80).optional(),
  slug: z.string().max(120).optional(),
  lessonIndex: z.number().int().min(0).max(200).optional(),
  lessonTitle: z.string().max(200).optional(),
});

export const TurnSchema = z.object({
  context: ContextSchema.default({}),
  /** Empty on the opening turn. */
  answer: z.string().max(MAX_PRACTICE_ANSWER_CHARS),
  sessionId: z.string().uuid().nullable(),
});

export function practiceLesson(
  context: z.infer<typeof ContextSchema>,
): CurriculumLesson | undefined {
  if (context.lessonId) return LESSONS.find((lesson) => lesson.id === context.lessonId);
  const title = context.lessonTitle?.trim();
  const byTitle = title ? LESSONS.find((lesson) => lesson.title === title) : undefined;
  if (byTitle) return byTitle;
  const inCourse = (context.slug ?? CURRICULUM_SLUG) === CURRICULUM_SLUG;
  return inCourse && context.lessonIndex ? LESSONS[context.lessonIndex - 1] : undefined;
}

export type PracticeAccess = {
  subscribed: boolean;
  usedThisWeek: number;
  freeAllowance: number;
  /** Sessions left before the upgrade card appears. */
  remaining: number;
  canPractice: boolean;
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

const OFF_TOPIC_REPLY =
  "I can only help with critical thinking here. Try explaining the lesson's idea in your own words.";

const CROSSED_REPLY =
  "Another reply to this conversation arrived at the same moment. Tap retry to send yours.";

type ModelReply = {
  reply: string;
  done: boolean;
  verdict: "solid" | "shaky" | "revisit" | "none";
  remembered: string;
  connectionMade: boolean;
};

/**
 * Gemini does not enforce response schemas, so parse its JSON loosely and
 * normalize the field names it actually emits (question vs reply, null close).
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

type Ctx = { supabase: SupabaseClient<Database>; userId: string };

async function readAccess({ supabase: db, userId }: Ctx): Promise<PracticeAccess> {
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
      .gte("created_at", practiceWeekStart().toISOString()),
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
    canPractice: subscribed || remaining > 0,
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
  .validator((input: unknown) => TurnSchema.parse(input))
  .handler(async ({ data, context }): Promise<PracticeReply> => {
    const ctx = context as unknown as Ctx;
    const { supabase: db, userId } = ctx;
    const key = process.env["AI_API_KEY"];
    if (!key) return { ok: false, reason: "AI isn't configured for this project yet." };

    const opening = data.sessionId === null;
    const meta = practiceLesson(data.context);
    if (!meta) return { ok: false, reason: "Practice couldn't start for this lesson." };
    const access = await readAccess(ctx);
    if (opening && !access.canPractice) {
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

    const { PRACTICE_SYSTEM, openingPrompt, turnPrompt, lessonContext, storedTranscript } =
      await import("./practice.server");

    let sessionId = data.sessionId;
    let history: PracticeTurn[] = [];
    let readAt: string | null = null;
    if (!opening) {
      // A follow-up turn must belong to a real, unfinished session of this learner;
      // otherwise a made-up id would get unlimited tutor turns without opening one. The
      // conversation so far is the stored one, so the turn cap can't be reset by the browser.
      const { data: existing } = await db
        .from("practice_sessions")
        .select("id, completed_at, transcript, updated_at")
        .eq("id", sessionId!)
        .eq("user_id", userId)
        .maybeSingle();
      history = storedTranscript(existing?.transcript);
      const used = history.filter((t) => t.role === "learner").length;
      if (!existing || existing.completed_at || used >= MAX_PRACTICE_TURNS) {
        return { ok: false, reason: "That practice session has ended. Start a new one." };
      }
      readAt = existing.updated_at;
    }
    const lesson = await lessonContext(meta);

    // Counted before the session row exists, so a refused turn never uses up one of
    // the week's free sessions.
    const { limiter } = await import("./rate-limit.server");
    const verdict = await limiter().enforce("practiceTurn");
    if (!verdict.ok) return limitedFailure(verdict);

    // Session rows are what the free weekly allowance is counted from, so the browser
    // can't create, edit or delete them; they are written here with the service role.
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

    if (opening) {
      const { data: row, error } = await admin
        .from("practice_sessions")
        .insert({
          user_id: userId,
          course_slug: CURRICULUM_SLUG,
          course_topic: lesson.topic,
          lesson_index: LESSONS.indexOf(meta) + 1,
          lesson_title: meta.title,
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
      : [...history, { role: "learner" as const, text: data.answer.trim() }];
    const learnerTurns = transcript.filter((t) => t.role === "learner").length;

    try {
      const { streamText } = await import("ai");
      const { createAiProvider } = await import("./ai-gateway.server");
      const { withGuardrails } = await import("./ai-guardrails.server");
      const { screenOutput } = await import("./moderation.server");
      const gateway = createAiProvider(key);

      const forcedClose = learnerTurns >= MAX_PRACTICE_TURNS;
      const result = streamText({
        model: gateway(AI_MODELS.tutor),
        system: withGuardrails(PRACTICE_SYSTEM(lesson)),
        prompt: opening ? openingPrompt(lesson) : turnPrompt(lesson, transcript, learnerTurns),
        maxRetries: 1,
        ...aiOutput("tutor"),
      });
      const text = await result.text;
      if (!text.trim()) throw new Error("Empty reply from the AI gateway");
      if (!screenOutput(text).allowed) return { ok: false, reason: OFF_TOPIC_REPLY };
      const parsed = parseModelReply(text, forcedClose);

      const done = parsed.done || forcedClose;
      const verdict = done ? (parsed.verdict === "none" ? "shaky" : parsed.verdict) : null;
      const nextTranscript: PracticeTurn[] = [
        ...transcript,
        { role: "tutor", text: parsed.reply.trim() },
      ];

      // Two turns sent at the same moment both read the same stored conversation. Only the
      // first to finish is kept (any write moves `updated_at` on), so neither overwrites the
      // other and the session never holds more learner turns than the cap.
      let write = admin
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
      if (readAt !== null) write = write.eq("updated_at", readAt);
      const { data: stored, error: storeError } = await write.select("id");
      if (storeError) throw storeError;
      if (!stored || stored.length === 0) return { ok: false, reason: CROSSED_REPLY };

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
