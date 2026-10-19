/**
 * Server-only prompt construction for the "explain it back" tutor.
 *
 * The tutor's job is deliberately narrow: make the learner produce an
 * explanation, react to what they actually wrote, and push them to connect the
 * idea to something earlier in the same course — that connection is the product's
 * moat, so it is what the reward is tied to.
 */

import { CURRICULUM_TITLE, LESSONS, type CurriculumLesson } from "./curriculum";
import { notesText } from "./lesson-notes";
import { MAX_PRACTICE_TURNS, type PracticeTurn } from "./practice";

export type PracticeContext = {
  topic: string;
  lessonTitle: string;
  lessonText: string;
  /** Titles of the lessons before this one in the course. */
  earlierLessons: string[];
};

/** The most lesson material the tutor is given. */
export const MAX_LESSON_TEXT = 6000;

/**
 * What the tutor knows about a lesson, built here from the lesson's own content and never taken
 * from the request: the takeaway, the notes and each step's explanation for an authored lesson,
 * or the curriculum's objective and key idea when there is no authored script.
 */
export async function lessonContext(meta: CurriculumLesson): Promise<PracticeContext> {
  const [{ loadLessonScript }, { loadLessonNotes }] = await Promise.all([
    import("@/content/lessons"),
    import("@/content/notes"),
  ]);
  const [script, notes] = await Promise.all([
    loadLessonScript(meta.unitId, meta.id),
    loadLessonNotes(meta.unitId, meta.id),
  ]);
  const material = script.ok
    ? [
        script.script.takeaway,
        ...(notes ? [notesText(notes)] : []),
        ...script.script.steps.map((step) => (step.kind === "note" ? step.prompt : step.why)),
      ]
    : [meta.objective, meta.keyIdea, ...(notes ? [notesText(notes)] : [])];
  const index = LESSONS.findIndex((lesson) => lesson.id === meta.id);
  return {
    topic: CURRICULUM_TITLE,
    lessonTitle: meta.title,
    lessonText: material.join("\n\n").slice(0, MAX_LESSON_TEXT),
    earlierLessons: LESSONS.slice(0, Math.max(0, index)).map((lesson) => lesson.title),
  };
}

/** The turns stored with a session, read defensively: the stored row is the only history used. */
export function storedTranscript(value: unknown): PracticeTurn[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((turn: unknown) => {
    const t = turn as Partial<PracticeTurn> | null;
    return t && (t.role === "tutor" || t.role === "learner") && typeof t.text === "string"
      ? [{ role: t.role, text: t.text.slice(0, 2000) }]
      : [];
  });
}

export const PRACTICE_SYSTEM = (ctx: PracticeContext) =>
  [
    "You are Lamppost's guide: a lamp that helps the learner see their own reasoning clearly, not a person or a character. You speak like a calm, plain-spoken coach.",
    `The learner has just finished the lesson "${ctx.lessonTitle}" in a course about ${ctx.topic}.`,
    "Your job is ACTIVE RECALL, not lecturing. The learner writes explanations in their own words; you respond to what they actually wrote.",
    "Rules:",
    "- Never give multiple-choice options. Ask open questions.",
    "- Quote or paraphrase their own words when you give feedback, so it is clearly about their answer.",
    "- Name one thing they got right and at most one thing that was missing or muddled. Be specific, never generic praise.",
    "- Be kind and plain-spoken. Two to four short sentences maximum per reply. No headings, no bullet lists, no markdown.",
    "- Your follow-up question must push them to CONNECT this idea to something else they know — ideally one of the earlier lessons listed below.",
    ctx.earlierLessons.length > 0
      ? `Earlier lessons in this course: ${ctx.earlierLessons.join("; ")}.`
      : "This is the learner's first lesson in the course, so connect to everyday experience instead.",
    `After at most ${MAX_PRACTICE_TURNS} learner replies you must close the conversation.`,
    "When you close: set done to true, give a verdict, and give one sentence worth remembering.",
    "Set connectionMade to true only if the learner genuinely linked this idea to another idea or lesson themselves.",
    "Lesson material you may rely on:",
    ctx.lessonText,
    "",
    "Respond with ONLY a JSON object, no markdown fences:",
    '{"reply": "what you say", "done": false, "verdict": "none", "remembered": "", "connectionMade": false}',
  ].join("\n");

export function openingPrompt(ctx: PracticeContext) {
  return [
    "Open the practice session.",
    "Write one short, friendly line and then ONE open question asking the learner to explain the core idea of this lesson in their own words.",
    "Put both in the reply field. Leave verdict and remembered blank and done false.",
    `Lesson: ${ctx.lessonTitle}. Topic: ${ctx.topic}.`,
  ].join("\n");
}

export function turnPrompt(ctx: PracticeContext, transcript: PracticeTurn[], learnerTurns: number) {
  const history = transcript
    .map((t) => `${t.role === "tutor" ? "YOU" : "LEARNER"}: ${t.text}`)
    .join("\n");
  const closing = learnerTurns >= MAX_PRACTICE_TURNS;
  return [
    "Conversation so far:",
    history,
    "",
    closing
      ? [
          "This is the final turn. Give your feedback on their last answer, then CLOSE:",
          "set done true, set verdict to solid, shaky or revisit, and set remembered to the single sentence they should carry away.",
          "Do not ask another question.",
        ].join(" ")
      : [
          "Respond to their last answer: brief specific feedback, then one follow-up question that makes them connect this idea to something else.",
          "Set done false and leave verdict and remembered blank.",
        ].join(" "),
    `Also judge connectionMade from the learner's own words in the message above (${ctx.lessonTitle}).`,
  ].join("\n");
}
