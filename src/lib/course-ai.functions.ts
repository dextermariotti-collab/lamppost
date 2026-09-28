import { createServerFn } from "@tanstack/react-start";
import { BriefSchema, ChunkSchema, quizCountFor, type CourseOutline } from "./course-brief";
import type { Lesson } from "./courses";
import { screenLocally } from "./moderation";
import { limitedFailure, type LimitedFailure } from "./rate-limit";
import {
  CONTENT_SYSTEM,
  OUTLINE_SYSTEM,
  contentPrompt,
  outlinePrompt,
  parseLessonContent,
  parseOutline,
} from "./course-ai.server";

export type OutlineResult =
  | { ok: true; outline: CourseOutline }
  | { ok: false; reason: string; blocked?: boolean }
  | LimitedFailure;

export type ChunkResult =
  | { ok: true; lessons: Lesson[] }
  | { ok: false; reason: string; blocked?: boolean }
  | LimitedFailure;

/** Turns provider errors into a short, human message for the UI. */
function describe(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth++) {
    const e = current as Record<string, unknown>;
    for (const key of ["message", "responseBody", "statusCode", "status"]) {
      const value = e[key];
      if (typeof value === "string" || typeof value === "number") parts.push(String(value));
    }
    current = e["cause"];
  }
  const text = parts.join(" ") || String(error);
  console.error("AI gateway error detail:", text);

  if (/402|credit|quota|billing|payment/i.test(text)) {
    return "Your AI workspace is out of credits, so no lessons could be written. Top up AI credits, then tap Try again.";
  }
  if (/429|rate.?limit/i.test(text)) {
    return "The AI tutor is rate limited right now. Wait a moment and try again.";
  }
  return "The AI tutor couldn't finish writing this course. Try again in a moment.";
}

export const generateOutline = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BriefSchema.parse(input))
  .handler(async ({ data: brief }): Promise<OutlineResult> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) {
      return { ok: false, reason: "AI isn't configured for this project yet." };
    }

    // Free local screen first, then the limit, then the paid AI classifier.
    const local = screenLocally(`${brief.topic} ${brief.goal}`);
    if (!local.allowed) return { ok: false, reason: local.message, blocked: true };
    const { limiter } = await import("./rate-limit.server");
    const verdict = await limiter().enforce("topicGeneration");
    if (!verdict.ok) return limitedFailure(verdict);

    const { screenTopicText, screenOutput, logModerationBlock } =
      await import("./moderation.server");

    // Input pass: nothing is generated for a disallowed topic.
    const gate = await screenTopicText(brief.topic, brief.goal, key);
    if (!gate.allowed) {
      void logModerationBlock({
        topic: brief.topic,
        category: gate.category,
        stage: "input",
        userId: null,
      });
      return { ok: false, reason: gate.message, blocked: true };
    }

    try {
      const { streamText } = await import("ai");
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(key);

      const result = streamText({
        model: gateway("google/gemini-3.6-flash"),
        system: OUTLINE_SYSTEM,
        prompt: outlinePrompt(brief),
      });

      const text = await result.text;

      // Output pass: never surface content the rules would have refused.
      const output = screenOutput(text);
      if (!output.allowed) {
        void logModerationBlock({
          topic: brief.topic,
          category: output.category,
          stage: "output",
          userId: null,
        });
        return { ok: false, reason: output.message, blocked: true };
      }

      const outline = parseOutline(text, brief);
      if (!outline) {
        return { ok: false, reason: "The AI reply couldn't be read as a course outline." };
      }
      return { ok: true, outline };
    } catch (error) {
      console.error("Outline generation failed", error);
      return { ok: false, reason: describe(error) };
    }
  });

export const generateLessonChunk = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChunkSchema.parse(input))
  .handler(async ({ data }): Promise<ChunkResult> => {
    const { brief, courseTitle, stubs } = data;
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false, reason: "AI isn't configured for this project yet." };
    if (stubs.length === 0) return { ok: true, lessons: [] };

    const { screenOutput, logModerationBlock } = await import("./moderation.server");
    const requested = screenLocally(`${brief.topic} ${brief.goal}`);
    if (!requested.allowed) {
      return { ok: false, reason: requested.message, blocked: true };
    }
    const { limiter } = await import("./rate-limit.server");
    const verdict = await limiter().enforce("topicGeneration");
    if (!verdict.ok) return limitedFailure(verdict);

    try {
      const { streamText } = await import("ai");
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(key);

      const result = streamText({
        model: gateway("google/gemini-3.6-flash"),
        system: CONTENT_SYSTEM,
        prompt: contentPrompt(brief, courseTitle, stubs),
      });

      const text = await result.text;
      const output = screenOutput(text);
      if (!output.allowed) {
        void logModerationBlock({
          topic: brief.topic,
          category: output.category,
          stage: "output",
          userId: null,
        });
        return { ok: false, reason: output.message, blocked: true };
      }

      const lessons = parseLessonContent(text, stubs, quizCountFor(brief));
      if (lessons.length < stubs.length) {
        return { ok: false, reason: "The AI reply couldn't be read as lesson content." };
      }
      return { ok: true, lessons };
    } catch (error) {
      console.error("Lesson generation failed", error);
      return { ok: false, reason: describe(error) };
    }
  });
