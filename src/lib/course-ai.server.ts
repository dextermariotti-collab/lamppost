import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { buildCourse, slugify, type Course, type Lesson } from "./courses";

export const SYSTEM = `You design short, delightful mobile mini-courses.
Reply with ONLY minified JSON (no markdown fences, no commentary) in exactly this shape:
{"topic":string,"tagline":string,"emoji":string,"lessons":[{"title":string,"subtitle":string,"emoji":string,"intro":string,"keyPoints":[string,string,string],"quiz":{"question":string,"options":[string,string,string],"correct":number,"explanation":string}}]}
Rules: exactly 5 lessons ordered beginner to advanced. title max 5 words. subtitle max 6 words.
emoji is a single emoji. intro is 2-3 warm, concrete sentences. keyPoints are 3 short strings (max 12 words each).
quiz has exactly 3 options; "correct" is the 0-based index of the right option; explanation is one sentence.
tagline max 60 characters. Use the exact key names above.`;

/** Models sometimes answer in snake_case or with alternate key names. */
function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

const str = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

function normalizeLesson(raw: unknown, i: number, topic: string): Lesson | null {
  if (typeof raw !== "object" || raw === null) return null;
  const l = raw as Record<string, unknown>;
  const quizRaw = pick(l, ["quiz", "question_block"]);
  const q = (typeof quizRaw === "object" && quizRaw !== null ? quizRaw : {}) as Record<
    string,
    unknown
  >;
  const options = (Array.isArray(pick(q, ["options", "answers", "choices"]))
    ? (pick(q, ["options", "answers", "choices"]) as unknown[])
    : []
  )
    .map((o) => str(o))
    .filter(Boolean)
    .slice(0, 3);
  const title = str(pick(l, ["title", "lesson_title", "name"]), `${topic} lesson ${i + 1}`);
  const correctRaw = pick(q, ["correct", "correct_index", "correctIndex", "answer_index"]);
  const points = Array.isArray(pick(l, ["keyPoints", "key_points", "takeaways", "points"]))
    ? (pick(l, ["keyPoints", "key_points", "takeaways", "points"]) as unknown[])
        .map((p) => str(p))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  if (options.length < 2) return null;

  return {
    title,
    subtitle: str(pick(l, ["subtitle", "sub_title", "summary"]), "A quick step forward"),
    emoji: str(pick(l, ["emoji", "icon"]), "✨"),
    ...(str(pick(l, ["intro", "introduction", "content", "body"]))
      ? { intro: str(pick(l, ["intro", "introduction", "content", "body"])) }
      : {}),
    ...(points.length ? { keyPoints: points } : {}),
    quiz: {
      question: str(pick(q, ["question", "prompt"]), `What matters most in ${title}?`),
      options,
      correct: Math.min(Math.max(typeof correctRaw === "number" ? correctRaw : 0, 0), options.length - 1),
      explanation: str(pick(q, ["explanation", "why", "rationale"]), "That's the key idea here."),
    },
  };
}

export function parseCourse(text: string, topic: string): Course | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const root = parsed as Record<string, unknown>;
  const lessonsRaw = pick(root, ["lessons", "modules", "chapters"]);
  if (!Array.isArray(lessonsRaw)) return null;

  const lessons = lessonsRaw
    .slice(0, 5)
    .map((l, i) => normalizeLesson(l, i, topic))
    .filter((l): l is Lesson => l !== null);

  if (lessons.length < 3) return null;

  return {
    slug: slugify(topic),
    topic: str(pick(root, ["topic", "course_title", "courseTitle", "title"]), topic),
    tagline: str(pick(root, ["tagline", "subtitle", "description"]), `Your personal path through ${topic}.`),
    emoji: str(pick(root, ["emoji", "icon"]), "✨"),
    lessons,
  };
}

