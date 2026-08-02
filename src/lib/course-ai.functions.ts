import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { buildCourse, slugify, type Course } from "./courses";

const Input = z.object({ topic: z.string() });

const CourseSchema = z.object({
  topic: z.string(),
  tagline: z.string(),
  emoji: z.string(),
  lessons: z.array(
    z.object({
      title: z.string(),
      subtitle: z.string(),
      emoji: z.string(),
      intro: z.string(),
      keyPoints: z.array(z.string()),
      quiz: z.object({
        question: z.string(),
        options: z.array(z.string()),
        correct: z.number(),
        explanation: z.string(),
      }),
    }),
  ),
});

export const generateCourse = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<Course> => {
    const topic = data.topic.trim().slice(0, 120) || "Something New";
    const slug = slugify(topic);

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return buildCourse(topic);

    try {
      const { streamText, Output } = await import("ai");
      const gateway = createLovableAiGatewayProvider(key);

      const result = streamText({
        model: gateway("google/gemini-3.6-flash"),
        output: Output.object({ schema: CourseSchema }),
        system:
          "You design short, delightful mobile mini-courses. Always return exactly 5 lessons, ordered beginner to advanced. " +
          "Each lesson: a punchy title (max 5 words), a subtitle under 6 words, one fitting emoji, an intro of 2-3 sentences " +
          "written warmly and concretely, 3 short key points (max 12 words each), and one multiple-choice quiz with exactly 3 " +
          "options, the index of the correct one, and a one-sentence explanation. Tagline max 60 characters.",
        prompt: `Create a beginner-friendly mini-course on: ${topic}`,
      });

      const output = (await result.output) as z.infer<typeof CourseSchema>;
      const lessons = output.lessons.slice(0, 5).map((l) => {
        const options = l.quiz.options.slice(0, 3);
        return {
          title: l.title,
          subtitle: l.subtitle,
          emoji: l.emoji || "✨",
          intro: l.intro,
          keyPoints: l.keyPoints.slice(0, 3),
          quiz: {
            question: l.quiz.question,
            options,
            correct: Math.min(Math.max(l.quiz.correct, 0), options.length - 1),
            explanation: l.quiz.explanation,
          },
        };
      });

      if (lessons.length < 3) return buildCourse(topic);

      return {
        slug,
        topic: output.topic || topic,
        tagline: output.tagline,
        emoji: output.emoji || "✨",
        lessons,
      };
    } catch (error) {
      console.error("Course generation failed", error);
      return buildCourse(topic);
    }
  });
