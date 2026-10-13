import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  LOOK_SOURCES,
  LOOK_TEXT,
  lookInputProblem,
  readLookResult,
  type LookResult,
  type LookSource,
} from "./look-closer";
import { screenLocally } from "./moderation";
import { limitedFailure, type LimitedFailure } from "./rate-limit";

const Input = z.object({
  text: z.string().max(LOOK_TEXT.max + 200),
  source: z.enum(Object.keys(LOOK_SOURCES) as [LookSource, ...LookSource[]]).default("other"),
});

export type LookCloserResult =
  { ok: true; result: LookResult } | { ok: false; reason: string } | LimitedFailure;

const COULD_NOT = "That one didn't work out. Try again, or paste a different part of the text.";

/**
 * Looks at a text the learner pasted and returns the questions from the lessons that matter most
 * for it. Nothing is stored: the text goes to the AI service for this one reply and no further.
 */
export const lookCloser = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<LookCloserResult> => {
    const text = data.text.trim();
    const problem = lookInputProblem(text);
    if (problem) return { ok: false, reason: problem };
    const screened = screenLocally(text);
    if (!screened.allowed) return { ok: false, reason: screened.message };

    const key = process.env["AI_API_KEY"];
    if (!key) return { ok: false, reason: "AI isn't configured for this project yet." };

    const { limiter } = await import("./rate-limit.server");
    const verdict = await limiter().enforce("lookCloser");
    if (!verdict.ok) return limitedFailure(verdict);

    try {
      const { streamText } = await import("ai");
      const { createAiProvider } = await import("./ai-gateway.server");
      const { withGuardrails } = await import("./ai-guardrails.server");
      const { screenOutput } = await import("./moderation.server");
      const { extractJson } = await import("./exercise-ai.server");
      const { LOOK_MODEL, LOOK_SYSTEM, lookPrompt } = await import("./look-closer.server");
      const gateway = createAiProvider(key);

      const reply = await streamText({
        model: gateway(LOOK_MODEL),
        system: withGuardrails(LOOK_SYSTEM),
        prompt: lookPrompt(text, data.source),
        maxRetries: 1,
      }).text;
      if (!screenOutput(reply).allowed) return { ok: false, reason: COULD_NOT };
      const json = extractJson(reply);
      if (json?.["nothing"] === true)
        return {
          ok: false,
          reason:
            "There's no claim in that to look at. Try a post, an advert, a headline or a chatbot answer.",
        };
      const result = readLookResult(json);
      return result ? { ok: true, result } : { ok: false, reason: COULD_NOT };
    } catch (error) {
      console.error("[look-closer] failed", error);
      return { ok: false, reason: COULD_NOT };
    }
  });
