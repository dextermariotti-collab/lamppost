import { createServerFn } from "@tanstack/react-start";
import { BriefSchema, ChunkSchema, quizCountFor, type CourseOutline } from "./course-brief";
import type { Lesson } from "./courses";
import {
  CONTENT_SYSTEM,
  OUTLINE_SYSTEM,
  contentPrompt,
  fallbackLesson,
  fallbackOutline,
  outlinePrompt,
  parseLessonContent,
  parseOutline,
} from "./course-ai.server";

export const generateOutline = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BriefSchema.parse(input))
  .handler(async ({ data: brief }): Promise<CourseOutline> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return fallbackOutline(brief);

    try {
      const { streamText } = await import("ai");
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(key);

      const result = streamText({
        model: gateway("google/gemini-3.6-flash"),
        system: OUTLINE_SYSTEM,
        prompt: outlinePrompt(brief),
      });

      return parseOutline(await result.text, brief) ?? fallbackOutline(brief);
    } catch (error) {
      console.error("Outline generation failed", error);
      return fallbackOutline(brief);
    }
  });

export const generateLessonChunk = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChunkSchema.parse(input))
  .handler(async ({ data }): Promise<Lesson[]> => {
    const { brief, courseTitle, stubs } = data;
    const key = process.env["LOVABLE_API_KEY"];
    if (!key || stubs.length === 0) {
      return stubs.map((stub) => fallbackLesson(stub, courseTitle));
    }

    try {
      const { streamText } = await import("ai");
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(key);

      const result = streamText({
        model: gateway("google/gemini-3.6-flash"),
        system: CONTENT_SYSTEM,
        prompt: contentPrompt(brief, courseTitle, stubs),
      });

      return parseLessonContent(await result.text, stubs, courseTitle, quizCountFor(brief));
    } catch (error) {
      console.error("Lesson generation failed", error);
      return stubs.map((stub) => fallbackLesson(stub, courseTitle));
    }
  });
