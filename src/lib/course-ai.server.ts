import {
  briefPrompt,
  quizCountFor,
  quizRigorRules,
  type CourseBrief,
  type CourseOutline,
  type LessonStub,
} from "./course-brief";
import { CONTENT_POLICY_RULES } from "./moderation.server";
import { THINKING_LENS } from "./thinking";
import { slugify, type FlawDrill, type Lesson, type Prediction, type Quiz } from "./courses";

export const OUTLINE_SYSTEM = `You are a curriculum designer for a critical-thinking app.
${THINKING_LENS}
Each lesson title names a reasoning skill applied to the subject (e.g. "Testing a causal claim"),
not a chapter of facts.
Reply with ONLY minified JSON (no markdown fences, no commentary) in exactly this shape:
{"topic":string,"tagline":string,"emoji":string,"lessons":[{"title":string,"subtitle":string,"emoji":string}]}
Rules: return exactly the requested number of lessons, ordered so each one builds on the last.
Lesson titles are specific to the subject (never "Lesson 1" or "Foundations of X"), max 6 words.
subtitle is a concrete promise of what the learner will be able to do, max 7 words.
emoji is a single emoji. tagline max 60 characters. Use the exact key names above.

${CONTENT_POLICY_RULES}`;

export const CONTENT_SYSTEM = `You write in-depth, warm, plain-language lesson content for a critical-thinking app.
${THINKING_LENS}
Reply with ONLY minified JSON (no markdown fences, no commentary) in exactly this shape:
{"lessons":[{"index":number,"intro":string,"parts":[{"title":string,"body":string}],"prediction":{"question":string,"options":[string,string],"correct":number,"explanation":string},"flaw":{"claim":string,"options":[string,string,string],"correct":number,"fallacy":string,"explanation":string},"keyPoints":[string],"quizzes":[{"question":string,"options":[string,string,string],"correct":number,"explanation":string}]}]}
Rules for every lesson:
- "index" must repeat the index you were given.
- "intro" is 2 sentences framing why this lesson matters.
- "parts" has exactly 3 entries. Each "body" is 120-170 words of real teaching: explain the concept,
  use concrete specifics, numbers and examples from the subject itself. Never filler, never generic
  study advice. Part 1 explains the idea, part 2 shows it applied with a worked example,
  part 3 covers common mistakes plus how to fix them. Part titles are max 5 words.
- "prediction" is a "predict before reveal" beat that closes part 1 and sets up the worked
  example in part 2. Its "question" (max 18 words) asks the learner to predict the outcome of the
  single most load-bearing idea or distinction from part 1. "options" has 2 or 3 short options
  (max 12 words each) where the wrong ones are real misconceptions a learner would hold, not
  obviously silly. "correct" is the 0-based index. "explanation" is ONE sentence saying why it is
  correct and pointing forward to the example that follows.
- "flaw" is the lesson's "spot the flaw" drill and is REQUIRED. "claim" is a 2-3 sentence argument
  about this subject that sounds convincing but contains exactly one reasoning error the lesson
  taught (bad causal leap, cherry-picked or unrepresentative sample, moved goalposts, appeal to
  authority or popularity, false dilemma, survivorship bias, misread base rate, circular reasoning,
  equivocation, and similar). Write it as something a real person would actually say or post — quote
  concrete numbers or sources where it helps. "options" has exactly 3 candidate diagnoses, each max
  16 words, all naming a plausible reasoning error; only one is the error actually present, the other
  two are errors this argument does NOT commit. "correct" is the 0-based index. "fallacy" names the
  error in 1-4 words. "explanation" is 1-2 sentences saying what the argument would need in order to
  hold up, and why the closest wrong diagnosis does not fit.
- "keyPoints" has exactly 4 short takeaways, max 14 words each.
- Each quiz question tests understanding of this lesson's content, has exactly 3 plausible options,
  "correct" is the 0-based index of the right option, and "explanation" is one teaching sentence.
Use the exact key names above.

${CONTENT_POLICY_RULES}`;

export function outlinePrompt(brief: CourseBrief) {
  return `Design a course for this learner.\n${briefPrompt(brief)}\n\nReturn the outline JSON now.`;
}

export function contentPrompt(brief: CourseBrief, courseTitle: string, stubs: LessonStub[]) {
  const list = stubs.map((s) => `index ${s.index}: "${s.title}" — ${s.subtitle}`).join("\n");
  return `Course: ${courseTitle}\n${briefPrompt(brief)}\n
Write full content for these lessons of that course, in this order:\n${list}\n
Each lesson needs ${quizCountFor(brief)} quiz question(s) in "quizzes".
${quizRigorRules(brief)}
Every lesson must include its required "flaw" drill: a convincing but broken argument from this
subject plus three candidate diagnoses.
Return the JSON now.`;
}

/** Models sometimes answer in snake_case or with alternate key names. */
function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

const str = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function normalizeQuiz(raw: unknown, lessonTitle: string): Quiz | null {
  const q = asObject(raw);
  const options = asArray(pick(q, ["options", "answers", "choices"]))
    .map((o) => str(o))
    .filter(Boolean)
    .slice(0, 4);
  if (options.length < 2) return null;
  const correctRaw = pick(q, ["correct", "correct_index", "correctIndex", "answer_index"]);
  const correct = Math.min(
    Math.max(typeof correctRaw === "number" ? correctRaw : 0, 0),
    options.length - 1,
  );

  // Models overwhelmingly put the right answer first or second, so shuffle.
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }

  return {
    question: str(pick(q, ["question", "prompt"]), `What matters most in ${lessonTitle}?`),
    options: order.map((i) => options[i]!),
    correct: order.indexOf(correct),
    explanation: str(pick(q, ["explanation", "why", "rationale"]), "That's the key idea here."),
  };
}

/** Optional beat — returns null so lessons still render when the model skips it. */
function normalizePrediction(raw: unknown): Prediction | null {
  const p = asObject(raw);
  const question = str(pick(p, ["question", "prompt"]));
  const options = asArray(pick(p, ["options", "answers", "choices"]))
    .map((o) => str(o))
    .filter(Boolean)
    .slice(0, 3);
  if (!question || options.length < 2) return null;
  const correctRaw = pick(p, ["correct", "correct_index", "correctIndex", "answer_index"]);
  const correct = Math.min(
    Math.max(typeof correctRaw === "number" ? correctRaw : 0, 0),
    options.length - 1,
  );

  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }

  return {
    question,
    options: order.map((i) => options[i]!),
    correct: order.indexOf(correct),
    explanation: str(
      pick(p, ["explanation", "why", "rationale"]),
      "Hold on to that — the next page shows it in action.",
    ),
  };
}

/** "Spot the flaw" drill — skipped rather than faked when the model omits it. */
function normalizeFlaw(raw: unknown): FlawDrill | null {
  const f = asObject(raw);
  const claim = str(pick(f, ["claim", "argument", "statement", "text", "passage"]));
  const options = asArray(pick(f, ["options", "answers", "choices", "diagnoses"]))
    .map((o) => str(o))
    .filter(Boolean)
    .slice(0, 4);
  if (!claim || options.length < 2) return null;

  const correctRaw = pick(f, ["correct", "correct_index", "correctIndex", "answer_index"]);
  const correct = Math.min(
    Math.max(typeof correctRaw === "number" ? correctRaw : 0, 0),
    options.length - 1,
  );

  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }

  const fallacy = str(pick(f, ["fallacy", "name", "error", "label"]));
  return {
    claim,
    options: order.map((i) => options[i]!),
    correct: order.indexOf(correct),
    ...(fallacy ? { fallacy } : {}),
    explanation: str(
      pick(f, ["explanation", "why", "rationale"]),
      "The argument needs evidence it never actually provides.",
    ),
  };
}

export function parseOutline(text: string, brief: CourseBrief): CourseOutline | null {
  const root = extractJson(text);
  if (!root) return null;
  const lessons = asArray(pick(root, ["lessons", "modules", "chapters", "outline"]));
  if (lessons.length < 3) return null;

  const stubs: LessonStub[] = lessons.slice(0, brief.lessons).map((raw, i) => {
    const l = asObject(raw);
    return {
      index: i + 1,
      title: str(pick(l, ["title", "lesson_title", "name"]), `${brief.topic} lesson ${i + 1}`),
      subtitle: str(pick(l, ["subtitle", "sub_title", "summary", "goal"]), "A step forward"),
      emoji: str(pick(l, ["emoji", "icon"]), "✨"),
    };
  });

  return {
    slug: slugify(brief.topic),
    topic: str(pick(root, ["topic", "course_title", "courseTitle", "title"]), brief.topic),
    tagline: str(
      pick(root, ["tagline", "description", "summary"]),
      `Your personal path through ${brief.topic}.`,
    ),
    emoji: str(pick(root, ["emoji", "icon"]), "✨"),
    stubs,
  };
}

/** Merges AI lesson content onto the outline stubs, falling back per lesson. */
export function parseLessonContent(text: string, stubs: LessonStub[], quizCount: number): Lesson[] {
  const root = extractJson(text);
  const items = root ? asArray(pick(root, ["lessons", "content", "items"])) : [];

  const lessons = stubs.map((stub, position): Lesson | null => {
    const match =
      items.find((item) => Number(asObject(item)["index"]) === stub.index) ?? items[position];
    const l = asObject(match);

    const parts = asArray(pick(l, ["parts", "pages", "sections"]))
      .map((raw, i) => {
        const p = asObject(raw);
        const body = str(pick(p, ["body", "text", "content"]));
        if (!body) return null;
        return { title: str(pick(p, ["title", "heading"]), `Part ${i + 1}`), body };
      })
      .filter((p): p is { title: string; body: string } => p !== null)
      .slice(0, 4);

    const keyPoints = asArray(pick(l, ["keyPoints", "key_points", "takeaways", "points"]))
      .map((p) => str(p))
      .filter(Boolean)
      .slice(0, 5);

    const quizzes = asArray(pick(l, ["quizzes", "quiz", "questions"]))
      .map((raw) => normalizeQuiz(raw, stub.title))
      .filter((q): q is Quiz => q !== null)
      .slice(0, Math.max(quizCount, 1));

    const prediction = normalizePrediction(pick(l, ["prediction", "predict", "predictionPrompt"]));
    const flaw = normalizeFlaw(pick(l, ["flaw", "spotTheFlaw", "spot_the_flaw", "flawDrill"]));

    const single = quizzes.length === 0 ? normalizeQuiz(pick(l, ["quiz"]), stub.title) : null;
    const resolvedQuizzes = quizzes.length > 0 ? quizzes : single ? [single] : [];

    if (parts.length === 0 || resolvedQuizzes.length === 0) return null;

    return {
      title: stub.title,
      subtitle: stub.subtitle,
      emoji: stub.emoji || "✨",
      intro: str(pick(l, ["intro", "introduction", "hook"]), stub.subtitle),
      ...(keyPoints.length ? { keyPoints } : {}),
      ...(prediction ? { prediction } : {}),
      ...(flaw ? { flaw } : {}),
      parts,
      quiz: resolvedQuizzes[0]!,
      quizzes: resolvedQuizzes,
    };
  });

  return lessons.filter((lesson): lesson is Lesson => lesson !== null);
}
