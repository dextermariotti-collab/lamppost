import { z } from "zod";

export const BriefSchema = z.object({
  topic: z.string(),
  lessons: z.number(),
  difficulty: z.string(),
  quizRigor: z.string(),
  experience: z.string(),
  focus: z.string(),
  goal: z.string(),
});

export type CourseBrief = z.infer<typeof BriefSchema>;

export const StubSchema = z.object({
  index: z.number(),
  title: z.string(),
  subtitle: z.string(),
  emoji: z.string(),
});

export type LessonStub = z.infer<typeof StubSchema>;

export type CourseOutline = {
  slug: string;
  topic: string;
  tagline: string;
  emoji: string;
  stubs: LessonStub[];
};

export const ChunkSchema = z.object({
  brief: BriefSchema,
  courseTitle: z.string(),
  stubs: z.array(StubSchema),
});

export type ChunkInput = z.infer<typeof ChunkSchema>;

export const LENGTHS = [
  { value: 5, label: "Quick", hint: "5 lessons" },
  { value: 8, label: "Standard", hint: "8 lessons" },
  { value: 12, label: "Deep dive", hint: "12 lessons" },
];

export const DIFFICULTIES = [
  { value: "beginner", label: "Beginner", hint: "Plain language, gentle pace" },
  { value: "intermediate", label: "Intermediate", hint: "Assumes the basics" },
  { value: "advanced", label: "Advanced", hint: "Nuance and edge cases" },
];

export const QUIZ_RIGOR = [
  {
    value: "easy",
    label: "Easy",
    hint: "Clearly right answer, obviously wrong options",
  },
  {
    value: "tricky",
    label: "Tricky",
    hint: "Options sound reasonable — one detail decides it",
  },
  {
    value: "difficult",
    label: "Difficult",
    hint: "SAT-style: every option looks right, only one is",
  },
];

export const QUIZ_RIGOR_PROMPT: Record<string, string> = {
  easy: `Quiz rigor: EASY. The correct option is unambiguous and stated close to how the lesson said it. The two distractors are plainly wrong to anyone who read the lesson — no near-misses, no trick wording.`,
  tricky: `Quiz rigor: TRICKY. Every option must be phrased in confident, textbook-sounding language and be topically relevant. Two options must be wrong only because of one precise detail (a swapped cause and effect, a wrong threshold or number, an over-generalised rule, or a right idea applied in the wrong situation). A learner who skimmed should be tempted by a distractor; only careful reading of the lesson rules them out. Never use "all of the above", "none of the above", joke options, or obviously absurd options.`,
  difficult: `Quiz rigor: DIFFICULT — write these like SAT questions. All three options must be individually defensible-sounding statements that a knowledgeable person might accept in isolation, yet exactly one is objectively correct for the question as asked. Build distractors from real misconceptions in this subject: true statements that don't answer the question, statements that are right in general but wrong in this specific case, statements that reverse a relationship, and statements off by a precise degree or condition. Use qualifier words ("always", "only when", "because") to make the deciding difference precise rather than vague. The "explanation" must name exactly why the correct option wins AND why the closest distractor fails. Never use "all of the above", "none of the above", or absurd options, and never make the correct answer the longest or most detailed option by habit.`,
};

export const EXPERIENCE = [
  { value: "new", label: "Total newcomer", hint: "Never touched it" },
  { value: "some", label: "Some exposure", hint: "Dabbled a little" },
  { value: "rusty", label: "Rusty but familiar", hint: "Knew it once" },
];

export const FOCUS = [
  { value: "theory", label: "Theory first", hint: "Understand the why" },
  { value: "balanced", label: "Balanced", hint: "A bit of both" },
  { value: "practice", label: "Hands-on", hint: "Drills and doing" },
];

export const DEFAULT_BRIEF: CourseBrief = {
  topic: "",
  lessons: 8,
  difficulty: "beginner",
  experience: "new",
  focus: "balanced",
  goal: "",
};

const label = (list: { value: string; label: string }[], value: string, fallback: string) =>
  list.find((item) => item.value === value)?.label ?? fallback;

/** Coerces raw search params / stored values into a safe brief. */
export function clampBrief(raw: Partial<Record<keyof CourseBrief, unknown>>): CourseBrief {
  const topic = typeof raw.topic === "string" && raw.topic.trim() ? raw.topic.trim() : DEFAULT_BRIEF.topic;
  const lessonsRaw = Number(raw.lessons);
  const lessons = LENGTHS.some((l) => l.value === lessonsRaw) ? lessonsRaw : DEFAULT_BRIEF.lessons;
  const pickValue = (list: { value: string }[], value: unknown, fallback: string) =>
    typeof value === "string" && list.some((item) => item.value === value) ? value : fallback;

  return {
    topic: topic.slice(0, 120),
    lessons,
    difficulty: pickValue(DIFFICULTIES, raw.difficulty, DEFAULT_BRIEF.difficulty),
    experience: pickValue(EXPERIENCE, raw.experience, DEFAULT_BRIEF.experience),
    focus: pickValue(FOCUS, raw.focus, DEFAULT_BRIEF.focus),
    goal: typeof raw.goal === "string" ? raw.goal.trim().slice(0, 200) : "",
  };
}

export function briefChips(brief: CourseBrief): string[] {
  return [
    `${brief.lessons} lessons`,
    label(DIFFICULTIES, brief.difficulty, "Beginner"),
    label(FOCUS, brief.focus, "Balanced"),
  ];
}

export function quizCountFor(brief: CourseBrief) {
  return brief.lessons >= 8 ? 2 : 1;
}

/** Human sentence describing the learner, used in AI prompts. */
export function briefPrompt(brief: CourseBrief) {
  const lines = [
    `Topic: ${brief.topic}`,
    `Lessons: exactly ${brief.lessons}`,
    `Difficulty: ${label(DIFFICULTIES, brief.difficulty, "Beginner")}`,
    `Learner's prior experience: ${label(EXPERIENCE, brief.experience, "Total newcomer")}`,
    `Preferred style: ${label(FOCUS, brief.focus, "Balanced")}`,
  ];
  if (brief.goal) lines.push(`Learner's goal: ${brief.goal}`);
  return lines.join("\n");
}
