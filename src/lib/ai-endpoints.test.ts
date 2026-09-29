import { beforeEach, describe, expect, it, vi } from "vitest";
import { LESSONS } from "./curriculum";

vi.mock("@tanstack/react-start", async () => (await import("@/test/server-fn")).startMock);
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

const enforce = vi.hoisted(() => vi.fn());
vi.mock("./rate-limit.server", () => ({ limiter: () => ({ enforce }) }));
const model = vi.hoisted(() => ({ streamText: vi.fn() }));
vi.mock("ai", () => model);
vi.mock("./ai-gateway.server", () => ({ createLovableAiGatewayProvider: () => () => "model" }));
const moderation = vi.hoisted(() => ({
  screenTopicText: vi.fn(),
  screenOutput: vi.fn(() => ({ allowed: true })),
  logModerationBlock: vi.fn(),
}));
vi.mock("./moderation.server", async () => ({
  ...(await vi.importActual<typeof import("./moderation.server")>("./moderation.server")),
  ...moderation,
}));

const lesson = LESSONS[0]!;
const refusal = {
  ok: false as const,
  scope: "user" as const,
  retryAfterSeconds: 90,
  message: "That's a lot of grading for now. Try again in about 2 minutes.",
};
const limitedResult = {
  ok: false,
  reason: refusal.message,
  limited: true,
  retryAfterSeconds: 90,
};

const ANSWER =
  "The claim is that the change lowers costs, but the evidence given only shows that costs fell after it, which could have other causes entirely.";

const gradeInput = (over: Record<string, unknown> = {}) => ({
  lessonId: lesson.id,
  lessonTitle: "A lesson",
  objective: "Do the thing.",
  taskType: "case",
  passage: "A short passage.",
  prompt: "Make the case.",
  answer: ANSWER,
  attempt: 1,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env["LOVABLE_API_KEY"] = "test-key";
  enforce.mockResolvedValue({ ok: true });
});

describe("gradeArgument", () => {
  it("counts a request that would really call the model, and stops when refused", async () => {
    enforce.mockResolvedValue(refusal);
    const { gradeArgument } = await import("./argument.functions");
    const result = await gradeArgument({ data: gradeInput() });
    expect(result).toEqual(limitedResult);
    expect(enforce).toHaveBeenCalledWith("grading");
    expect(model.streamText).not.toHaveBeenCalled();
  });

  it("does not spend a limit on an answer that is refused for free", async () => {
    const { gradeArgument } = await import("./argument.functions");
    const tooShort = await gradeArgument({ data: gradeInput({ answer: "no" }) });
    expect(tooShort).toMatchObject({ ok: false });
    expect(tooShort).not.toHaveProperty("limited");
    expect(enforce).not.toHaveBeenCalled();
  });

  it("only grades a lesson that exists, and caps every field it forwards to the model", async () => {
    const { GradeInput, MAX_ANSWER_CHARS } = await import("./argument.functions");
    expect(GradeInput.safeParse(gradeInput()).success).toBe(true);
    expect(GradeInput.safeParse(gradeInput({ lessonId: "made-up" })).success).toBe(false);
    expect(GradeInput.safeParse(gradeInput({ answer: "a".repeat(MAX_ANSWER_CHARS) })).success).toBe(
      true,
    );
    expect(
      GradeInput.safeParse(gradeInput({ answer: "a".repeat(MAX_ANSWER_CHARS + 1) })).success,
    ).toBe(false);
    for (const field of ["lessonTitle", "objective", "passage", "prompt"]) {
      expect(GradeInput.safeParse(gradeInput({ [field]: "x".repeat(5000) })).success).toBe(false);
    }
    expect(GradeInput.safeParse(gradeInput({ attempt: 30 })).success).toBe(false);
  });
});

describe("socraticLine", () => {
  const input = (over: Record<string, unknown> = {}) => ({
    mode: "question",
    companionName: "Lumi",
    lessonTitle: "A lesson",
    objective: "Do the thing.",
    exercise: "An exercise",
    learnerAnswer: "B",
    correct: false,
    ...over,
  });

  it("is limited before it reaches the model", async () => {
    enforce.mockResolvedValue(refusal);
    const { socraticLine } = await import("./socratic.functions");
    expect(await socraticLine({ data: input() })).toEqual(limitedResult);
    expect(enforce).toHaveBeenCalledWith("socratic");
    expect(model.streamText).not.toHaveBeenCalled();
  });

  it("does not count an empty reply", async () => {
    const { socraticLine } = await import("./socratic.functions");
    const result = await socraticLine({ data: input({ mode: "reply", reply: "   " }) });
    expect(result).toMatchObject({ ok: false });
    expect(enforce).not.toHaveBeenCalled();
  });

  it("rejects oversized inputs", async () => {
    const { socraticLine } = await import("./socratic.functions");
    await expect(socraticLine({ data: input({ exercise: "x".repeat(5000) }) })).rejects.toThrow();
  });
});

describe("the practice tutor's inputs", () => {
  const context = {
    slug: "critical-thinking",
    lessonIndex: 0,
    topic: "Critical thinking",
    lessonTitle: "A lesson",
    lessonText: "Text",
    earlierLessons: [],
    companionName: "Lumi",
  };
  const turn = (over: Record<string, unknown> = {}) => ({
    context,
    transcript: [],
    answer: "My explanation",
    sessionId: null,
    ...over,
  });

  it("caps the reply, the lesson text and the transcript sent to the model", async () => {
    const { TurnSchema, MAX_PRACTICE_ANSWER_CHARS } = await import("./practice.functions");
    expect(TurnSchema.safeParse(turn()).success).toBe(true);
    expect(
      TurnSchema.safeParse(turn({ answer: "a".repeat(MAX_PRACTICE_ANSWER_CHARS) })).success,
    ).toBe(true);
    expect(
      TurnSchema.safeParse(turn({ answer: "a".repeat(MAX_PRACTICE_ANSWER_CHARS + 1) })).success,
    ).toBe(false);
    expect(
      TurnSchema.safeParse(turn({ context: { ...context, lessonText: "x".repeat(6001) } })).success,
    ).toBe(false);
    const long = Array.from({ length: 40 }, () => ({ role: "tutor", text: "hi" }));
    expect(TurnSchema.safeParse(turn({ transcript: long })).success).toBe(false);
  });

  it("only accepts a real session id, not free text", async () => {
    const { TurnSchema } = await import("./practice.functions");
    expect(TurnSchema.safeParse(turn({ sessionId: "not-a-uuid" })).success).toBe(false);
    expect(
      TurnSchema.safeParse(turn({ sessionId: "11111111-1111-4111-8111-111111111111" })).success,
    ).toBe(true);
  });
});

describe("course generation", () => {
  const brief = {
    topic: "Bread",
    lessons: 5,
    difficulty: "beginner",
    quizRigor: "light",
    experience: "none",
    focus: "practical",
    goal: "Bake a loaf",
  };

  it("is limited after the free screen and before the model", async () => {
    enforce.mockResolvedValue(refusal);
    const { generateOutline } = await import("./course-ai.functions");
    expect(await generateOutline({ data: brief })).toEqual(limitedResult);
    expect(enforce).toHaveBeenCalledWith("topicGeneration");
    expect(model.streamText).not.toHaveBeenCalled();
  });

  it("stops, without blaming the topic or logging a block, when the topic check can't run", async () => {
    moderation.screenTopicText.mockResolvedValue({
      allowed: false,
      category: "other",
      message: "Topic checks are temporarily unavailable, so nothing was created.",
      unavailable: true,
    });
    const { generateOutline } = await import("./course-ai.functions");
    const result = await generateOutline({ data: brief });
    expect(result).toEqual({
      ok: false,
      reason: "Topic checks are temporarily unavailable, so nothing was created.",
    });
    expect(moderation.logModerationBlock).not.toHaveBeenCalled();
    expect(model.streamText).not.toHaveBeenCalled();
  });

  it("caps the brief, so a topic can't be a wall of text or ask for a hundred lessons", async () => {
    const { BriefSchema, ChunkSchema } = await import("./course-brief");
    expect(BriefSchema.safeParse(brief).success).toBe(true);
    expect(BriefSchema.safeParse({ ...brief, topic: "x".repeat(500) }).success).toBe(false);
    expect(BriefSchema.safeParse({ ...brief, lessons: 100 }).success).toBe(false);
    expect(BriefSchema.safeParse({ ...brief, lessons: 0 }).success).toBe(false);
    const stubs = Array.from({ length: 50 }, (_, index) => ({
      index,
      title: "t",
      subtitle: "s",
      emoji: "x",
    }));
    expect(ChunkSchema.safeParse({ brief, courseTitle: "t", stubs }).success).toBe(false);
  });
});
