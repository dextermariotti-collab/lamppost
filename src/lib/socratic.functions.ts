import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AI_MODELS, aiOutput } from "./ai-models";
import { LESSONS, type CurriculumLesson } from "./curriculum";
import { screenLocally } from "./moderation";
import { limitedFailure, type LimitedFailure } from "./rate-limit";

const MODEL = AI_MODELS.socratic;

/**
 * The lesson is named by id; older apps send its title and objective instead, which are only
 * used to find the lesson. Whatever the browser says about the lesson never reaches the model,
 * and the companion name older apps send is ignored.
 */
const Input = z.object({
  mode: z.enum(["question", "reply"]),
  lessonId: z.string().max(80).optional(),
  lessonTitle: z.string().max(160).default(""),
  objective: z.string().max(400).default(""),
  /** What the learner just did, for "question" mode. */
  exercise: z.string().max(1200).default(""),
  learnerAnswer: z.string().max(600).default(""),
  correct: z.boolean().default(true),
  /** The guide's question and the learner's reply, for "reply" mode. */
  question: z.string().max(300).default(""),
  reply: z.string().max(800).default(""),
});

export type SocraticResult =
  { ok: true; line: string } | { ok: false; reason: string } | LimitedFailure;

const QUIET = "The guide is quiet right now.";

function lessonFor(input: z.infer<typeof Input>): CurriculumLesson | undefined {
  if (input.lessonId) return LESSONS.find((lesson) => lesson.id === input.lessonId);
  const title = input.lessonTitle.trim();
  return title ? LESSONS.find((lesson) => lesson.title === title) : undefined;
}

/**
 * One line from the guide: a Socratic follow-up after an exercise, or a short
 * response to the learner's optional reply. Never blocks lesson progress — the
 * UI simply hides the bubble when this fails.
 */
export const socraticLine = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<SocraticResult> => {
    if (data.mode === "reply" && !data.reply.trim()) {
      return { ok: false, reason: "Nothing to respond to yet." };
    }
    const meta = lessonFor(data);
    if (!meta) return { ok: false, reason: QUIET };
    const sent =
      data.mode === "reply" ? [data.reply, data.question] : [data.exercise, data.learnerAnswer];
    for (const text of sent) {
      const screened = screenLocally(text);
      if (!screened.allowed) return { ok: false, reason: screened.message };
    }

    const key = process.env["AI_API_KEY"];
    if (!key) return { ok: false, reason: "AI isn't configured for this project yet." };

    const { limiter } = await import("./rate-limit.server");
    const verdict = await limiter().enforce("socratic");
    if (!verdict.ok) return limitedFailure(verdict);

    try {
      const { streamText } = await import("ai");
      const { createAiProvider } = await import("./ai-gateway.server");
      const { SOCRATIC_SYSTEM, socraticQuestionPrompt, socraticReplyPrompt } =
        await import("./socratic.server");
      const { withGuardrails } = await import("./ai-guardrails.server");
      const { screenOutput } = await import("./moderation.server");
      const gateway = createAiProvider(key);

      const result = streamText({
        model: gateway(MODEL),
        system: withGuardrails(SOCRATIC_SYSTEM),
        prompt:
          data.mode === "question"
            ? socraticQuestionPrompt({
                lessonTitle: meta.title,
                objective: meta.objective,
                exercise: data.exercise,
                learnerAnswer: data.learnerAnswer,
                correct: data.correct,
              })
            : socraticReplyPrompt({
                lessonTitle: meta.title,
                objective: meta.objective,
                question: data.question,
                reply: data.reply,
              }),
        maxRetries: 1,
        ...aiOutput("socratic"),
      });
      const text = (await result.text).trim();
      if (!screenOutput(text).allowed) return { ok: false, reason: QUIET };
      const line =
        text
          .split("\n")
          .find((l) => l.trim().length > 0)
          ?.trim() ?? "";
      if (!line) return { ok: false, reason: "No reply." };
      return { ok: true, line: line.replace(/^["'“]|["'”]$/g, "").slice(0, 220) };
    } catch (error) {
      console.error("Socratic line failed:", error);
      return { ok: false, reason: QUIET };
    }
  });
