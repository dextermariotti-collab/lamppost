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

const parts = vi.hoisted(() => ({
  livePartsDeps: vi.fn(async () => ({ store: {} })),
  readSnapshot: vi.fn(),
  assembleIfComplete: vi.fn(),
  ensurePart: vi.fn(),
}));
vi.mock("./lesson-parts.server", async () => {
  const actual =
    await vi.importActual<typeof import("./lesson-parts.server")>("./lesson-parts.server");
  return { ...actual, ...parts };
});

const emptySnapshot = { concept: null, drills: lesson.drills.map(() => null), written: null };
const withConcept = {
  ...emptySnapshot,
  concept: { concept: { title: "The idea", body: "A card." }, summary: ["One"] },
};
const ranWith = (value: unknown) => async (opts: { run: () => Promise<unknown> }) => {
  await opts.run();
  return { status: "ran", value };
};

describe("getCurriculumLesson", () => {
  beforeEach(() => {
    parts.readSnapshot.mockResolvedValue(emptySnapshot);
    parts.assembleIfComplete.mockResolvedValue(null);
  });

  it("serves a cached lesson without touching the limiter or the model", async () => {
    gen.readCachedLesson.mockResolvedValue({ title: "x", exercises: [] });
    gen.isUsableLesson.mockReturnValue(true);
    const { getCurriculumLesson } = await import("./curriculum.functions");
    const result = await getCurriculumLesson({ data: { lessonId: lesson.id } });
    expect(result).toMatchObject({ ok: true, complete: true, cached: true });
    expect(limits.guardedGeneration).not.toHaveBeenCalled();
    expect(parts.ensurePart).not.toHaveBeenCalled();
  });

  it("on a miss writes only the idea card, under its own lease and the lesson limit", async () => {
    parts.ensurePart.mockResolvedValue({
      status: "made",
      snapshot: withConcept,
      assembled: null,
    });
    limits.guardedGeneration.mockImplementation(
      ranWith({
        status: "made",
        snapshot: withConcept,
        assembled: null,
      }),
    );
    const { getCurriculumLesson } = await import("./curriculum.functions");
    const result = await getCurriculumLesson({ data: { lessonId: lesson.id } });
    expect(limits.guardedGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        policy: "lessonPart",
        lockKey: `gen:part:${lesson.id}:concept`,
      }),
    );
    expect(parts.ensurePart).toHaveBeenCalledWith(expect.anything(), "concept", expect.anything());
    expect(result).toMatchObject({ ok: true, complete: false });
    expect(result.ok && result.complete === false && result.lesson.concept?.body).toBe("A card.");
    expect(result.ok && result.complete === false && result.drills).toEqual(
      lesson.drills.map(() => null),
    );
  });

  it("hands back an idea card that already exists without generating or counting anything", async () => {
    parts.readSnapshot.mockResolvedValue(withConcept);
    const { getCurriculumLesson } = await import("./curriculum.functions");
    const result = await getCurriculumLesson({ data: { lessonId: lesson.id } });
    expect(result).toMatchObject({ ok: true, complete: false });
    expect(limits.guardedGeneration).not.toHaveBeenCalled();
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
    expect(parts.ensurePart).not.toHaveBeenCalled();
  });

  it("says to ask again shortly when another request is already writing it", async () => {
    limits.guardedGeneration.mockResolvedValue({ status: "busy" });
    const { getCurriculumLesson } = await import("./curriculum.functions");
    const result = await getCurriculumLesson({ data: { lessonId: lesson.id } });
    expect(result).toMatchObject({ ok: false, pending: true });
    expect(result).not.toHaveProperty("limited");
  });

  it("gives a soft failure, never an internal error, when the card can't be written", async () => {
    limits.guardedGeneration.mockImplementation(
      ranWith({ status: "failed", snapshot: emptySnapshot }),
    );
    const { getCurriculumLesson } = await import("./curriculum.functions");
    const result = await getCurriculumLesson({ data: { lessonId: lesson.id } });
    expect(result).toMatchObject({ ok: false });
    expect(result).not.toHaveProperty("pending");
    expect(result.ok === false && result.reason).toMatch(/still being prepared/i);
  });

  it("refuses an oversized or unknown lesson id before doing anything", async () => {
    const { getCurriculumLesson } = await import("./curriculum.functions");
    await expect(getCurriculumLesson({ data: { lessonId: "x".repeat(500) } })).rejects.toThrow();
    const unknown = await getCurriculumLesson({ data: { lessonId: "not-a-lesson" } });
    expect(unknown.ok).toBe(false);
    expect(gen.readCachedLesson).not.toHaveBeenCalled();
  });
});

describe("getLessonPart", () => {
  beforeEach(() => {
    parts.readSnapshot.mockResolvedValue(withConcept);
    parts.assembleIfComplete.mockResolvedValue(null);
  });
  const ask = async (part: string) => {
    const { getLessonPart } = await import("./curriculum.functions");
    return getLessonPart({ data: { lessonId: lesson.id, part } });
  };

  it("only accepts a drill or the written task, and only slots the lesson has", async () => {
    await expect(ask("concept")).rejects.toThrow();
    await expect(ask("drill:9")).rejects.toThrow();
    await expect(ask("../../etc")).rejects.toThrow();
    // A four-drill lesson has no fifth drill, though the part name is well formed.
    const short = LESSONS.find((l) => l.drills.length === 4)!;
    const { getLessonPart } = await import("./curriculum.functions");
    expect(await getLessonPart({ data: { lessonId: short.id, part: "drill:4" } })).toMatchObject({
      ok: false,
    });
    expect(limits.guardedGeneration).not.toHaveBeenCalled();
  });

  it("writes a missing drill under a lease of its own", async () => {
    const after = {
      ...withConcept,
      drills: lesson.drills.map((kind, i) => (i === 1 ? { kind } : null)),
    };
    limits.guardedGeneration.mockImplementation(
      ranWith({ status: "made", snapshot: after, assembled: null }),
    );
    const result = await ask("drill:1");
    expect(limits.guardedGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ policy: "lessonPart", lockKey: `gen:part:${lesson.id}:drill:1` }),
    );
    expect(result).toMatchObject({ ok: true, complete: false });
    expect(result.ok && result.complete === false && result.drills[1]).toMatchObject({
      kind: lesson.drills[1],
    });
  });

  it("returns a drill that is already written without generating or counting anything", async () => {
    parts.readSnapshot.mockResolvedValue({
      ...withConcept,
      drills: lesson.drills.map((kind, i) => (i === 0 ? { kind } : null)),
    });
    const result = await ask("drill:0");
    expect(result).toMatchObject({ ok: true, complete: false });
    expect(limits.guardedGeneration).not.toHaveBeenCalled();
  });

  it("returns the finished lesson when that part was the last one", async () => {
    limits.guardedGeneration.mockImplementation(
      ranWith({
        status: "made",
        snapshot: withConcept,
        assembled: { title: "Done", exercises: [] },
      }),
    );
    expect(await ask("written")).toMatchObject({ ok: true, complete: true, cached: false });
  });

  it("reports a limit, a busy writer and a failed part distinctly", async () => {
    limits.guardedGeneration.mockResolvedValueOnce(limited);
    expect(await ask("drill:0")).toMatchObject({ limited: true, retryAfterSeconds: 600 });
    limits.guardedGeneration.mockResolvedValueOnce({ status: "busy" });
    expect(await ask("drill:0")).toMatchObject({ pending: true });
    limits.guardedGeneration.mockImplementationOnce(
      ranWith({ status: "failed", snapshot: withConcept }),
    );
    const failed = await ask("drill:0");
    expect(failed).toMatchObject({ ok: false });
    expect(failed).not.toHaveProperty("pending");
    expect(failed).not.toHaveProperty("limited");
  });

  it("returns the finished lesson from the cache without touching the parts", async () => {
    gen.readCachedLesson.mockResolvedValue({ title: "x", exercises: [] });
    gen.isUsableLesson.mockReturnValue(true);
    expect(await ask("drill:0")).toMatchObject({ ok: true, complete: true, cached: true });
    expect(parts.readSnapshot).not.toHaveBeenCalled();
  });
});

/* ------------------------------ the drill pool ------------------------------ */

const pool = vi.hoisted(() => ({ rows: [] as unknown[], reads: [] as string[][] }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => {
      const read: string[] = [];
      pool.reads.push(read);
      const chain = {
        select: (columns: string) => (read.push(`select ${columns}`), chain),
        eq: (column: string, value: unknown) => (read.push(`${column}=${String(value)}`), chain),
        order: () => chain,
        limit: async (n: number) => (read.push(`limit ${n}`), { data: pool.rows }),
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

  it("reads only the kind asked for, a bounded number of rows, and only the columns it uses", async () => {
    pool.rows = Array.from({ length: 12 }, (_, i) => drill(i + 1));
    pool.reads = [];
    const { POOL_READ_LIMIT } = await import("./drills.functions");
    await ask();
    expect(pool.reads).toEqual([
      [
        "select variant, kind, content, difficulty, domain",
        `lesson_id=${lesson.id}`,
        `kind=${lesson.drills[0]}`,
        `limit ${POOL_READ_LIMIT}`,
      ],
    ]);
    expect(POOL_READ_LIMIT).toBeLessThanOrEqual(50);
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
