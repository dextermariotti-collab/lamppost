import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LESSONS } from "@/lib/curriculum";

/**
 * Warm-up pass: pre-generates and validates curriculum lessons and seeds the
 * shared drill pool, so learners always open a lesson from cache.
 *
 * Called by the team (or a scheduler) rather than by the app. It only writes
 * curriculum content, is idempotent, and is capped per request so a single call
 * stays inside the request budget.
 */

const Body = z.object({
  /** Lessons to work through in this request. */
  limit: z.number().int().min(1).max(6).default(3),
  /** Regenerate even when a current version is cached. */
  force: z.boolean().default(false),
  /** Extra pooled drills to add per warmed lesson. */
  extraDrills: z.number().int().min(0).max(4).default(0),
});

export const Route = createFileRoute("/api/public/warm-curriculum")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env["WARM_TOKEN"] ?? "lamppost-warm";
        if (request.headers.get("x-warm-token") !== token) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: unknown = {};
        try {
          body = await request.json();
        } catch {
          body = {};
        }
        const parsed = Body.safeParse(body);
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        const { limit, force, extraDrills } = parsed.data;

        const {
          ensureLessonContent,
          readCachedLesson,
          isUsableLesson,
          poolCounts,
          generatePoolDrill,
        } = await import("@/lib/curriculum-generate.server");

        const done: string[] = [];
        const failed: string[] = [];
        let remaining = 0;

        for (const lesson of LESSONS) {
          if (done.length + failed.length >= limit) {
            remaining++;
            continue;
          }
          if (!force) {
            const cached = await readCachedLesson(lesson.id);
            if (isUsableLesson(cached)) {
              // Cached: only top the pool up if asked to.
              if (extraDrills > 0) {
                const counts = await poolCounts(lesson.id);
                for (const kind of lesson.drills) {
                  if ((counts[kind] ?? 0) >= 2 + extraDrills) continue;
                  await generatePoolDrill(lesson.id, kind);
                }
              }
              continue;
            }
          }
          const result = await ensureLessonContent(lesson.id, { force });
          if (result.ok) done.push(lesson.id);
          else failed.push(`${lesson.id}:${result.reason}`);
        }

        return Response.json({ done, failed, remaining });
      },
    },
  },
});
