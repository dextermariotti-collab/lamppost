import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { buildCourse, type Course } from "./courses";
import { parseCourse, SYSTEM } from "./course-ai.server";

export const generateCourse = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<Course> => {
    const topic = data.topic.trim().slice(0, 120) || "Something New";

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return buildCourse(topic);

    try {
      const { streamText } = await import("ai");
      const gateway = createLovableAiGatewayProvider(key);

      const result = streamText({
        model: gateway("google/gemini-3.6-flash"),
        system: SYSTEM,
        prompt: `Create a beginner-friendly mini-course on: ${topic}`,
      });

      const text = await result.text;
      return parseCourse(text, topic) ?? buildCourse(topic);
    } catch (error) {
      console.error("Course generation failed", error);
      return buildCourse(topic);
    }
  });
