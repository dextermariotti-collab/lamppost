import { beforeEach, describe, expect, it, vi } from "vitest";
import { LESSONS } from "./curriculum";

vi.mock("@tanstack/react-start", async () => (await import("@/test/server-fn")).startMock);

const gen = vi.hoisted(() => ({
  readCachedLesson: vi.fn(),
  isUsableLesson: vi.fn(),
  ensureLessonContent: vi.fn(),
  seedPoolFromLesson: vi.fn(),
  generatePoolDrill: vi.fn(),
}));
const limits = vi.hoisted(() => ({
  guardedGeneration: vi.fn(),
  limiterForRequest: vi.fn(() => ({})),
}));
vi.mock("./curriculum-generate.server", () => gen);
vi.mock("./rate-limit.server", () => limits);

const lesson = LESSONS[0]!;
const limited = {
  status: "limited" as const,
  scope: "user" as const,
  retryAfterSeconds: 600,
  message: "You've asked for a lot of new lessons. Try again in about 10 minutes.",
};

beforeEach(() => {
  vi.clearAllMocks();
  gen.readCachedLesson.mockResolvedValue(null);
  gen.isUsableLesson.mockReturnValue(false);
});

describe("getCurriculumLesson", () => {
  it("serves a cached lesson without touching the limiter or the model", async () => {
    const cached = { title: "x", exercises: [] };
    gen.readCachedLesson.mockResolvedValue(cached);
    gen.isUsableLesson.mockReturnValue(true);
    const { getCurriculumLesson } = await import("./curriculum.functions");
    const result = await getCurriculumLesson({ data: { lessonId: lesson.id } });
    expect(result).toMatchObject({ ok: true, cached: true });
    expect(limits.guardedGeneration).not.toHaveBeenCalled();
    expect(gen.ensureLessonContent).not.toHaveBeenCalled();
  });

  it("generates only on a miss, under one lease per lesson and the lesson-generation limit", async () => {
    gen.ensureLessonContent.mockResolvedValue({
      ok: true,
      cached: false,
      lesson: { title: "x", exercises: [] },
    });
    limits.guardedGeneration.mockImplementation(async (opts: { run: () => Promise<unknown> }) => ({
      status: "ran",
      value: await opts.run(),
    }));
    const { getCurriculumLesson } = await import("./curriculum.functions");
    const result = await getCurriculumLesson({ data: { lessonId: lesson.id } });
    expect(result).toMatchObject({ ok: true });
    expect(limits.guardedGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ policy: "lessonGeneration", lockKey: `gen:lesson:${lesson.id}` }),
    );
    expect(gen.ensureLessonContent).toHaveBeenCalledTimes(1);
  });

  it("tells the browser it was limited, with the wait, instead of generating", async () => {
    limits.guardedGeneration.mockResolvedValue(limited);
    const { getCurriculumLesson } = await import("./curriculum.functions");
    const result = await getCurriculumLesson({ data: { lessonId: lesson.id } });
    expect(result).toEqual({
      ok: false,
      reason: limited.message,
      limited: true,
      retryAfterSeconds: 600,
    });
    expect(gen.ensureLessonContent).not.toHaveBeenCalled();
  });

  it("says it is being prepared when another request already holds the lease", async () => {
    limits.guardedGeneration.mockResolvedValue({ status: "busy" });
    const { getCurriculumLesson } = await import("./curriculum.functions");
    const result = await getCurriculumLesson({ data: { lessonId: lesson.id } });
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty("limited");
  });

  it("refuses an oversized or unknown lesson id before doing anything", async () => {
    const { getCurriculumLesson } = await import("./curriculum.functions");
    await expect(getCurriculumLesson({ data: { lessonId: "x".repeat(500) } })).rejects.toThrow();
    const unknown = await getCurriculumLesson({ data: { lessonId: "not-a-lesson" } });
    expect(unknown.ok).toBe(false);
    expect(gen.readCachedLesson).not.toHaveBeenCalled();
  });
});

/* ------------------------------ the drill pool ------------------------------ */

const pool = vi.hoisted(() => ({ rows: [] as unknown[] }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: async () => ({ data: pool.rows }),
      };
      return chain;
    },
  },
}));

const drill = (variant: number) => ({
  variant,
  kind: lesson.drills[0]!,
  difficulty: 2,
  domain: null,
  content: { question: `Question ${variant}` },
});

describe("getDrillVariant", () => {
  const ask = async () => {
    const { getDrillVariant } = await import("./drills.functions");
    return getDrillVariant({ data: { lessonId: lesson.id, kind: lesson.drills[0]! } });
  };

  it("serves from a healthy pool with no generation at all", async () => {
    pool.rows = Array.from({ length: 12 }, (_, i) => drill(i + 1));
    const result = await ask();
    expect(result).toMatchObject({ ok: true });
    expect(limits.guardedGeneration).not.toHaveBeenCalled();
    expect(gen.generatePoolDrill).not.toHaveBeenCalled();
  });

  it("an empty pool and an unusable cache generates only through the guard, and reports a limit", async () => {
    pool.rows = [];
    limits.guardedGeneration.mockResolvedValue(limited);
    const result = await ask();
    expect(limits.guardedGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ policy: "lessonGeneration", lockKey: `gen:lesson:${lesson.id}` }),
    );
    expect(gen.ensureLessonContent).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, limited: true, retryAfterSeconds: 600 });
  });

  it("an empty pool with a usable cached lesson seeds from it without generating", async () => {
    pool.rows = [];
    gen.readCachedLesson.mockResolvedValue({ exercises: [{ question: "q" }] });
    gen.isUsableLesson.mockReturnValue(true);
    await ask();
    expect(gen.seedPoolFromLesson).toHaveBeenCalledTimes(1);
    expect(limits.guardedGeneration).not.toHaveBeenCalled();
  });

  it("tops a thin pool up in the background, under the top-up lease and limit", async () => {
    pool.rows = [drill(1), drill(2)];
    limits.guardedGeneration.mockResolvedValue({ status: "busy" });
    const result = await ask();
    expect(result).toMatchObject({ ok: true });
    await vi.waitFor(() => expect(limits.guardedGeneration).toHaveBeenCalledTimes(1));
    expect(limits.guardedGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        policy: "poolTopUp",
        lockKey: `pool:${lesson.id}:${lesson.drills[0]}`,
      }),
      expect.anything(),
    );
    // The guard says no; the drill the learner asked for is still served.
    expect(gen.generatePoolDrill).not.toHaveBeenCalled();
  });
});
