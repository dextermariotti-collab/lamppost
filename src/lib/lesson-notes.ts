import { z } from "zod";
import { wordCount } from "./steps/types";

/**
 * A lesson's notes: the idea in full, read after the steps. The steps teach by trying first and
 * explaining each answer in a sentence or two; the notes are where those pieces are joined up,
 * with the words for them, a worked example, the cases where the idea gets subtle, a question to
 * carry, and something to try outside the app.
 */

const text = (max: number) => z.string().trim().min(1).max(max);

export const lessonNotesSchema = z.object({
  lessonId: z.string().min(1),
  /** Why the lesson matters, shown under its title before the first step. Never the answer. */
  hook: text(240),
  /** The idea, in two or three short paragraphs. */
  idea: z.array(text(520)).min(2).max(3),
  /** The words worth knowing, each with a plain meaning. */
  terms: z
    .array(z.object({ term: text(40), meaning: text(200) }))
    .min(1)
    .max(3),
  /** A short case and the moves a careful reader makes on it, in order. */
  example: z.object({
    case: text(460),
    moves: z.array(text(260)).min(3).max(4),
  }),
  /** Where the idea gets subtle: the overcorrection, the exception, the harder version. */
  subtleties: z
    .array(z.object({ title: text(60), body: text(360) }))
    .min(2)
    .max(2),
  /** One question that can be asked of anything, to carry out of the lesson. */
  ask: text(120),
  /** Something to try in ordinary life this week. */
  tryIt: text(300),
});

export type LessonNotes = z.infer<typeof lessonNotesSchema>;

/** Word limits, so a page of notes reads in about two minutes. */
export const NOTE_WORDS = {
  hook: 35,
  paragraph: 80,
  idea: 180,
  meaning: 28,
  case: 80,
  move: 40,
  subtlety: 60,
  ask: 16,
  tryIt: 50,
} as const;

/** Rules the schema can't express. An empty list means the notes are well formed. */
export function notesProblems(notes: LessonNotes): string[] {
  const problems: string[] = [];
  const over = (what: string, value: string, limit: number) => {
    const words = wordCount(value);
    if (words > limit) problems.push(`${what} is ${words} words; the limit is ${limit}`);
  };
  over("hook", notes.hook, NOTE_WORDS.hook);
  notes.idea.forEach((p, i) => over(`idea paragraph ${i + 1}`, p, NOTE_WORDS.paragraph));
  over("idea", notes.idea.join(" "), NOTE_WORDS.idea);
  notes.terms.forEach((t) => over(`meaning of ${t.term}`, t.meaning, NOTE_WORDS.meaning));
  over("example case", notes.example.case, NOTE_WORDS.case);
  notes.example.moves.forEach((m, i) => over(`move ${i + 1}`, m, NOTE_WORDS.move));
  notes.subtleties.forEach((s) => over(`subtlety “${s.title}”`, s.body, NOTE_WORDS.subtlety));
  over("ask", notes.ask, NOTE_WORDS.ask);
  over("try it", notes.tryIt, NOTE_WORDS.tryIt);
  if (!notes.ask.trim().endsWith("?")) problems.push("ask is a question, so it ends with ?");
  return problems;
}

/** The notes as plain text, for the tutor that the learner explains the idea back to. */
export function notesText(notes: LessonNotes): string {
  return [
    ...notes.idea,
    ...notes.terms.map((t) => `${t.term}: ${t.meaning}`),
    ...notes.subtleties.map((s) => `${s.title}: ${s.body}`),
    `A question to ask: ${notes.ask}`,
  ].join("\n\n");
}
