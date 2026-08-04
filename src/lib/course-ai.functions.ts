import { createServerFn } from "@tanstack/react-start";
import { BriefSchema, ChunkSchema, quizCountFor, type CourseOutline } from "./course-brief";
import type { Lesson } from "./courses";
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
  | { ok: false; reason: string };

export type ChunkResult = { ok: true; lessons: Lesson[] } | { ok: false; reason: string };

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
  return `The AI tutor couldn't finish writing this course. (${text.slice(0, 120)})`;
}

export const generateOutline = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BriefSchema.parse(input))
  .handler(async ({ data: brief }): Promise<OutlineResult> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) {
      return { ok: false, reason: "AI isn't configured for this project yet." };
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

      const outline = parseOutline(await result.text, brief);
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

    try {
      const { streamText } = await import("ai");
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(key);

      const result = streamText({
        model: gateway("google/gemini-3.6-flash"),
        system: CONTENT_SYSTEM,
        prompt: contentPrompt(brief, courseTitle, stubs),
      });

      const lessons = parseLessonContent(await result.text, stubs, quizCountFor(brief));
      if (lessons.length < stubs.length) {
        return { ok: false, reason: "The AI reply couldn't be read as lesson content." };
      }
      return { ok: true, lessons };
    } catch (error) {
      console.error("Lesson generation failed", error);
      return { ok: false, reason: describe(error) };
    }
  });
