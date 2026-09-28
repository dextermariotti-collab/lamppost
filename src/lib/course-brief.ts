import { z } from "zod";

export const BriefSchema = z.object({
  topic: z.string().min(1).max(120),
  lessons: z.number().int().min(1).max(12),
  difficulty: z.string().max(40),
  quizRigor: z.string().max(40),
  experience: z.string().max(40),
  focus: z.string().max(120),
  goal: z.string().max(300),
});

export type CourseBrief = z.infer<typeof BriefSchema>;

export const StubSchema = z.object({
  index: z.number().int().min(0).max(100),
  title: z.string().max(160),
  subtitle: z.string().max(300),
  emoji: z.string().max(16),
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
  courseTitle: z.string().max(160),
  stubs: z.array(StubSchema).max(12),
});

export type ChunkInput = z.infer<typeof ChunkSchema>;

export const LENGTHS = [
  {
    value: 5,
    label: "Quick",
    hint: "5 lessons",
    reaction: "Nice, we'll keep it short and to the point.",
  },
  {
    value: 8,
    label: "Standard",
    hint: "8 lessons",
    reaction: "Nice pick — a solid, well-paced course.",
  },
  {
    value: 12,
    label: "Deep dive",
    hint: "12 lessons",
    reaction: "Going deep, I like it. Buckle up.",
  },
];

export const DIFFICULTIES = [
  {
    value: "beginner",
    label: "Beginner",
    hint: "Plain language, gentle pace",
    reaction: "Nice pick — we'll keep things plain and easy to follow.",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    hint: "Assumes the basics",
    reaction: "Got it, we'll build on what you already know.",
  },
  {
    value: "advanced",
    label: "Advanced",
    hint: "Nuance and edge cases",
    reaction: "Bring it — we'll get into the real nuance.",
  },
];

export const QUIZ_RIGOR = [
  {
    value: "easy",
    label: "Easy",
    hint: "Clearly right answer, obviously wrong options",
    reaction: "Low pressure, straightforward questions ahead.",
  },
  {
    value: "tricky",
    label: "Tricky",
    hint: "Options sound reasonable — one detail decides it",
    reaction: "Sharp choice, you'll have to read carefully.",
  },
  {
    value: "difficult",
    label: "Difficult",
    hint: "SAT-style: every option looks right, only one is",
    reaction: "No shortcuts here, every option's a trap.",
  },
];

export const QUIZ_RIGOR_PROMPT: Record<string, string> = {
  easy: `Quiz rigor: EASY. The correct option is unambiguous and stated close to how the lesson said it. The two distractors are plainly wrong to anyone who read the lesson — no near-misses, no trick wording.`,
  tricky: `Quiz rigor: TRICKY. Every option must be phrased in confident, textbook-sounding language and be topically relevant. Two options must be wrong only because of one precise detail (a swapped cause and effect, a wrong threshold or number, an over-generalised rule, or a right idea applied in the wrong situation). A learner who skimmed should be tempted by a distractor; only careful reading of the lesson rules them out. Never use "all of the above", "none of the above", joke options, or obviously absurd options.`,
  difficult: `Quiz rigor: DIFFICULT — write these like SAT questions. All three options must be individually defensible-sounding statements that a knowledgeable person might accept in isolation, yet exactly one is objectively correct for the question as asked. Build distractors from real misconceptions in this subject: true statements that don't answer the question, statements that are right in general but wrong in this specific case, statements that reverse a relationship, and statements off by a precise degree or condition. Use qualifier words ("always", "only when", "because") to make the deciding difference precise rather than vague. The "explanation" must name exactly why the correct option wins AND why the closest distractor fails. Never use "all of the above", "none of the above", or absurd options, and never make the correct answer the longest or most detailed option by habit.`,
};

export const EXPERIENCE = [
  {
    value: "new",
    label: "Total newcomer",
    hint: "Never touched it",
    reaction: "Starting clean, so I'll define everything as we go.",
  },
  {
    value: "some",
    label: "Some exposure",
    hint: "Dabbled a little",
    reaction: "You've dabbled, so I'll skip the absolute basics.",
  },
  {
    value: "rusty",
    label: "Rusty but familiar",
    hint: "Knew it once",
    reaction: "Rusty is fine — I'll jog your memory first.",
  },
];

export const FOCUS = [
  {
    value: "theory",
    label: "Theory first",
    hint: "Understand the why",
    reaction: "Then I'll explain the why before the how.",
  },
  {
    value: "balanced",
    label: "Balanced",
    hint: "A bit of both",
    reaction: "A little theory, a little doing. Steady mix.",
  },
  {
    value: "practice",
    label: "Hands-on",
    hint: "Drills and doing",
    reaction: "Less reading, more drills. Let's get to work.",
  },
];

export const DEFAULT_BRIEF: CourseBrief = {
  topic: "",
  lessons: 8,
  difficulty: "beginner",
  // Required question — empty means the learner hasn't answered yet.
  quizRigor: "",
  experience: "new",
  focus: "balanced",
  goal: "",
};

const label = (list: { value: string; label: string }[], value: string, fallback: string) =>
  list.find((item) => item.value === value)?.label ?? fallback;

/** Coerces raw search params / stored values into a safe brief. */
export function clampBrief(raw: Partial<Record<keyof CourseBrief, unknown>>): CourseBrief {
  const topic =
    typeof raw.topic === "string" && raw.topic.trim() ? raw.topic.trim() : DEFAULT_BRIEF.topic;
  const lessonsRaw = Number(raw.lessons);
  const lessons = LENGTHS.some((l) => l.value === lessonsRaw) ? lessonsRaw : DEFAULT_BRIEF.lessons;
  const pickValue = (list: { value: string }[], value: unknown, fallback: string) =>
    typeof value === "string" && list.some((item) => item.value === value) ? value : fallback;

  return {
    topic: topic.slice(0, 120),
    lessons,
    difficulty: pickValue(DIFFICULTIES, raw.difficulty, DEFAULT_BRIEF.difficulty),
    quizRigor: pickValue(QUIZ_RIGOR, raw.quizRigor, DEFAULT_BRIEF.quizRigor),
    experience: pickValue(EXPERIENCE, raw.experience, DEFAULT_BRIEF.experience),
    focus: pickValue(FOCUS, raw.focus, DEFAULT_BRIEF.focus),
    goal: typeof raw.goal === "string" ? raw.goal.trim().slice(0, 200) : "",
  };
}

export function briefChips(brief: CourseBrief): string[] {
  return [
    `${brief.lessons} lessons`,
    label(DIFFICULTIES, brief.difficulty, "Beginner"),
    `${label(QUIZ_RIGOR, brief.quizRigor, "Tricky")} quizzes`,
    label(FOCUS, brief.focus, "Balanced"),
  ];
}

/** Falls back to the middle rigor level if the answer is missing. */
export function quizRigorRules(brief: CourseBrief) {
  return QUIZ_RIGOR_PROMPT[brief.quizRigor] ?? QUIZ_RIGOR_PROMPT["tricky"]!;
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
    `Quiz difficulty level: ${label(QUIZ_RIGOR, brief.quizRigor, "Tricky")} (affects question difficulty only, never course length or reading level)`,
  ];
  if (brief.goal) lines.push(`Learner's goal: ${brief.goal}`);
  return lines.join("\n");
}
