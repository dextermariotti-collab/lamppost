import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { screenLocally } from "./moderation";
import { limitedFailure, type LimitedFailure } from "./rate-limit";

const MODEL = "google/gemini-3.6-flash";

const Input = z.object({
  mode: z.enum(["question", "reply"]),
  companionName: z.string().min(1).max(40),
  lessonTitle: z.string().min(1).max(160),
  objective: z.string().min(1).max(400),
  /** What the learner just did, for "question" mode. */
  exercise: z.string().max(1200).default(""),
  learnerAnswer: z.string().max(600).default(""),
  correct: z.boolean().default(true),
  /** The mascot's question and the learner's reply, for "reply" mode. */
  question: z.string().max(300).default(""),
  reply: z.string().max(800).default(""),
});

export type SocraticResult =
  { ok: true; line: string } | { ok: false; reason: string } | LimitedFailure;

/**
 * One line from the mascot: a Socratic follow-up after an exercise, or a short
 * response to the learner's optional reply. Never blocks lesson progress — the
 * UI simply hides the bubble when this fails.
 */
export const socraticLine = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<SocraticResult> => {
    if (data.mode === "reply") {
      const screened = screenLocally(data.reply);
      if (!screened.allowed) return { ok: false, reason: screened.message };
      if (!data.reply.trim()) return { ok: false, reason: "Nothing to respond to yet." };
    }

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false, reason: "AI isn't configured for this project yet." };

    const { limiter } = await import("./rate-limit.server");
    const verdict = await limiter().enforce("socratic");
    if (!verdict.ok) return limitedFailure(verdict);

    try {
      const { streamText } = await import("ai");
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const { SOCRATIC_SYSTEM, socraticQuestionPrompt, socraticReplyPrompt } =
        await import("./socratic.server");
      const gateway = createLovableAiGatewayProvider(key);

      const result = streamText({
        model: gateway(MODEL),
        system: SOCRATIC_SYSTEM.replace("{companion}", data.companionName),
        prompt:
          data.mode === "question"
            ? socraticQuestionPrompt({
                lessonTitle: data.lessonTitle,
                objective: data.objective,
                exercise: data.exercise,
                learnerAnswer: data.learnerAnswer,
                correct: data.correct,
              })
            : socraticReplyPrompt({
                lessonTitle: data.lessonTitle,
                objective: data.objective,
                question: data.question,
                reply: data.reply,
              }),
        maxRetries: 1,
      });
      const text = (await result.text).trim();
      const line =
        text
          .split("\n")
          .find((l) => l.trim().length > 0)
          ?.trim() ?? "";
      if (!line) return { ok: false, reason: "No reply." };
      return { ok: true, line: line.replace(/^["'“]|["'”]$/g, "").slice(0, 220) };
    } catch (error) {
      console.error("Socratic line failed:", error);
      return { ok: false, reason: "The companion is quiet right now." };
    }
  });
