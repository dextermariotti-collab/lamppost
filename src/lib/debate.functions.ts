import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { screenLocally } from "./moderation";
import { parseGrade } from "./argument.functions";
import { WRITTEN_TASKS, type ArgumentGrade } from "./exercises";

/**
 * Async "debate a friend": both sides get the SAME motion, opposite assigned
 * sides, and are graded by the same Make-the-case rubric. Nobody sees the other
 * answer until both are in, so it can't be copied.
 */

const MODEL = "google/gemini-3.6-flash";
const TASK = WRITTEN_TASKS.case;
const MAX_SCORE = TASK.criteria.length * 4;

export type DebateSide = "for" | "against";

export type DebateSummary = {
  id: string;
  topic: string;
  prompt: string;
  passage: string;
  mySide: DebateSide;
  theirSide: DebateSide;
  opponent: { id: string; handle: string; displayName: string | null };
  status: "open" | "graded";
  myAnswer: string | null;
  theirAnswer: string | null;
  myGrade: ArgumentGrade | null;
  theirGrade: ArgumentGrade | null;
  /** "you" | "them" | "tie" | null while unfinished. */
  winner: "you" | "them" | "tie" | null;
  /** True when it's this user's move. */
  myTurn: boolean;
  /** True when results are in and this user hasn't looked yet. */
  unseenResult: boolean;
  createdAt: string;
};

type Row = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  topic: string;
  prompt: string;
  passage: string;
  challenger_side: string;
  opponent_side: string;
  challenger_answer: string | null;
  opponent_answer: string | null;
  challenger_scores: unknown;
  opponent_scores: unknown;
  challenger_total: number | null;
  opponent_total: number | null;
  challenger_tip: string | null;
  opponent_tip: string | null;
  max_score: number;
  status: string;
  challenger_seen_result: boolean;
  opponent_seen_result: boolean;
  created_at: string;
};

function gradeOf(
  scores: unknown,
  total: number | null,
  tip: string | null,
  max: number,
): ArgumentGrade | null {
  if (!scores || total === null) return null;
  return {
    scores: scores as ArgumentGrade["scores"],
    total,
    tip: tip ?? "",
    max,
  };
}

function toSummary(
  row: Row,
  userId: string,
  profiles: Map<string, { handle: string; display_name: string | null }>,
): DebateSummary {
  const mine = row.challenger_id === userId;
  const opponentId = mine ? row.opponent_id : row.challenger_id;
  const profile = profiles.get(opponentId);
  const myAnswer = mine ? row.challenger_answer : row.opponent_answer;
  const theirAnswer = mine ? row.opponent_answer : row.challenger_answer;
  const graded = row.status === "graded";
  const myGrade = gradeOf(
    mine ? row.challenger_scores : row.opponent_scores,
    mine ? row.challenger_total : row.opponent_total,
    mine ? row.challenger_tip : row.opponent_tip,
    row.max_score,
  );
  const theirGrade = gradeOf(
    mine ? row.opponent_scores : row.challenger_scores,
    mine ? row.opponent_total : row.challenger_total,
    mine ? row.opponent_tip : row.challenger_tip,
    row.max_score,
  );

  const winner =
    graded && myGrade && theirGrade
      ? myGrade.total > theirGrade.total
        ? ("you" as const)
        : theirGrade.total > myGrade.total
          ? ("them" as const)
          : ("tie" as const)
      : null;

  return {
    id: row.id,
    topic: row.topic,
    prompt: row.prompt,
    passage: row.passage,
    mySide: (mine ? row.challenger_side : row.opponent_side) as DebateSide,
    theirSide: (mine ? row.opponent_side : row.challenger_side) as DebateSide,
    opponent: {
      id: opponentId,
      handle: profile?.handle ?? "a friend",
      displayName: profile?.display_name ?? null,
    },
    status: graded ? "graded" : "open",
    myAnswer,
    // The other side stays hidden until both have written.
    theirAnswer: graded ? theirAnswer : null,
    myGrade,
    theirGrade: graded ? theirGrade : null,
    winner,
    myTurn: !myAnswer,
    unseenResult: graded && !(mine ? row.challenger_seen_result : row.opponent_seen_result),
    createdAt: row.created_at,
  };
}

const COLUMNS =
  "id, challenger_id, opponent_id, topic, prompt, passage, challenger_side, opponent_side, challenger_answer, opponent_answer, challenger_scores, opponent_scores, challenger_total, opponent_total, challenger_tip, opponent_tip, max_score, status, challenger_seen_result, opponent_seen_result, created_at";

async function loadProfiles(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Map<string, { handle: string; display_name: string | null }>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from("profiles").select("id, handle, display_name").in("id", ids);
  return new Map(
    ((data ?? []) as { id: string; handle: string; display_name: string | null }[]).map((p) => [
      p.id,
      { handle: p.handle, display_name: p.display_name },
    ]),
  );
}

const MOTION_SYSTEM = `You write debate motions for Lamppost, a critical-thinking trainer.
Reply with ONLY minified JSON: {"topic":string,"passage":string,"prompt":string}
- "topic" is 2-5 words naming the issue.
- "passage" is the motion plus 2-3 sentences of neutral, even-handed context that gives BOTH sides
  something real to work with. Never take a side. Never invent statistics, studies or named sources.
- "prompt" is one sentence telling the writer to argue their assigned side in three to five sentences
  with a claim, support, and an answer to the strongest objection.
Pick an everyday, arguable issue: school and work policy, technology, cities, money, media, sport.
Avoid anything involving self-harm, sexual content, violence, medical or legal advice, or the
personal details of real named individuals. Nothing partisan about live elections or named politicians.`;

export const challengeToDebate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ opponentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.opponentId === userId) throw new Error("You can't debate yourself.");

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI isn't configured for this project yet.");

    const { streamText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { screenOutput } = await import("./moderation.server");
    const gateway = createLovableAiGatewayProvider(key);

    const text = await streamText({
      model: gateway(MODEL),
      system: MOTION_SYSTEM,
      prompt: "Write one fresh debate motion now.",
      maxRetries: 1,
    }).text;

    const screened = screenOutput(text);
    if (!screened.allowed) throw new Error(screened.message);

    const match = text.match(/\{[\s\S]*\}/);
    let motion: { topic?: string; passage?: string; prompt?: string } = {};
    if (match) {
      try {
        motion = JSON.parse(match[0]) as typeof motion;
      } catch {
        motion = {};
      }
    }
    if (!motion.passage || !motion.prompt) {
      throw new Error("A motion couldn't be written just now. Try again in a moment.");
    }

    const challengerFirst = Math.random() < 0.5;
    const { data: row, error } = await supabase
      .from("debates")
      .insert({
        challenger_id: userId,
        opponent_id: data.opponentId,
        topic: motion.topic?.slice(0, 80) ?? "Debate",
        passage: motion.passage.slice(0, 2000),
        prompt: motion.prompt.slice(0, 500),
        challenger_side: challengerFirst ? "for" : "against",
        opponent_side: challengerFirst ? "against" : "for",
        max_score: MAX_SCORE,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string } | null)?.id ?? null };
  });

export const listDebates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DebateSummary[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("debates")
      .select(COLUMNS)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Row[];
    const profiles = await loadProfiles(
      supabase,
      rows.map((r) => (r.challenger_id === userId ? r.opponent_id : r.challenger_id)),
    );
    return rows.map((row) => toSummary(row, userId, profiles));
  });

export const getDebate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<DebateSummary | null> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("debates")
      .select(COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const typed = row as Row;
    const profiles = await loadProfiles(supabase, [
      typed.challenger_id === userId ? typed.opponent_id : typed.challenger_id,
    ]);
    return toSummary(typed, userId, profiles);
  });

export const submitDebateResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), answer: z.string().min(1).max(4000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const screened = screenLocally(data.answer);
    if (!screened.allowed) return { ok: false as const, reason: screened.message };
    if (data.answer.trim().split(/\s+/).length < 25) {
      return {
        ok: false as const,
        reason: "Write three to five sentences so there's a case to grade.",
      };
    }

    const { data: row, error } = await supabase
      .from("debates")
      .select(COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: false as const, reason: "That debate no longer exists." };
    const typed = row as Row;
    const mine = typed.challenger_id === userId;
    if ((mine ? typed.challenger_answer : typed.opponent_answer) !== null) {
      return { ok: false as const, reason: "You've already made your case." };
    }

    const key = process.env["LOVABLE_API_KEY"];
    if (!key)
      return { ok: false as const, reason: "Grading isn't configured for this project yet." };

    const { streamText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { graderSystem, graderPrompt } = await import("./argument.server");
    const gateway = createLovableAiGatewayProvider(key);

    const side = mine ? typed.challenger_side : typed.opponent_side;
    const graded = await streamText({
      model: gateway(MODEL),
      system: graderSystem("case"),
      prompt: graderPrompt({
        lessonTitle: `Debate: ${typed.topic}`,
        objective: `Argue ${side} the motion with a claim, support and an answer to the strongest objection.`,
        taskType: "case",
        passage: typed.passage,
        prompt: `${typed.prompt} You are arguing ${side.toUpperCase()} the motion.`,
        answer: data.answer.trim(),
        attempt: 1,
      }),
      maxRetries: 1,
    }).text;

    const parsed = parseGrade(graded, TASK.criteria);
    if (!parsed)
      return { ok: false as const, reason: "The grader's reply couldn't be read. Try again." };

    const bothIn = (mine ? typed.opponent_answer : typed.challenger_answer) !== null;
    const patch = mine
      ? {
          challenger_answer: data.answer.trim(),
          challenger_scores: parsed.grade.scores,
          challenger_total: parsed.grade.total,
          challenger_tip: parsed.grade.tip,
        }
      : {
          opponent_answer: data.answer.trim(),
          opponent_scores: parsed.grade.scores,
          opponent_total: parsed.grade.total,
          opponent_tip: parsed.grade.tip,
        };

    const { error: updateError } = await supabase
      .from("debates")
      .update({ ...patch, ...(bothIn ? { status: "graded" } : {}) })
      .eq("id", typed.id);
    if (updateError) throw new Error(updateError.message);

    return { ok: true as const, graded: bothIn, total: parsed.grade.total, max: parsed.grade.max };
  });

export const markDebateSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("debates")
      .select("id, challenger_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return { ok: false };
    const mine = (row as { challenger_id: string }).challenger_id === userId;
    await supabase
      .from("debates")
      .update(mine ? { challenger_seen_result: true } : { opponent_seen_result: true })
      .eq("id", data.id);
    return { ok: true };
  });
