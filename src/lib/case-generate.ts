import { PARTISAN, REAL_NAMES } from "@/content/content-rules";
import { LESSONS, UNITS } from "./curriculum";
import {
  CASE_QUESTIONS,
  CASE_SOURCES,
  aiCaseId,
  caseProblems,
  dailyCaseSchema,
  type CaseSource,
  type DailyCase,
} from "./daily-case";
import { wordCount } from "./steps/types";

/**
 * Daily cases written by an AI, for learners who have read every case in the written library.
 * This module is the part that needs no model: what a day's case is about (`casePlanForDay`),
 * and turning the model's reply into a case only if it meets every rule the written cases meet
 * (`readGeneratedCase`). The prompts and the model call live in `case-generate.server.ts`.
 */

/** Everyday settings the cases rotate through, so a run of days doesn't repeat one topic. */
export const CASE_SETTINGS = [
  "a local council decision",
  "a small shop or café",
  "a school or college",
  "a sports club",
  "a neighbourhood group",
  "a holiday or travel deal",
  "a workplace announcement",
  "a fitness or wellbeing product",
  "a phone app or gadget",
  "a charity appeal",
  "a science story in the news",
  "renting or moving home",
  "a household bill or subscription",
  "a hobby or online community",
  "a food or recipe trend",
  "a transport change",
] as const;

export type CasePlan = {
  day: string;
  source: CaseSource;
  setting: string;
  /** Three lessons from three different units, in question order. */
  lessons: [string, string, string];
};

/** A small seeded generator, so a day always plans (and shuffles) the same way. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** What a day's AI case is about: three lessons from three different units, a source and a setting. */
export function casePlanForDay(day: string): CasePlan {
  const rand = seeded(`plan:${day}`);
  const units = shuffle(UNITS, rand).slice(0, CASE_QUESTIONS);
  const lessons = units.map((unit) => {
    const own = LESSONS.filter((l) => l.unitId === unit.id);
    return own[Math.floor(rand() * own.length)]!.id;
  }) as [string, string, string];
  const sources = Object.keys(CASE_SOURCES) as CaseSource[];
  return {
    day,
    source: sources[Math.floor(rand() * sources.length)]!,
    setting: CASE_SETTINGS[Math.floor(rand() * CASE_SETTINGS.length)]!,
    lessons,
  };
}

/** Problems with the made-up-names and no-party-line rules, for any text a case contains. */
export function contentRuleProblems(text: string): string[] {
  const problems: string[] = [];
  for (const name of REAL_NAMES)
    if (new RegExp(`\\b${name}\\b`, "i").test(text)) problems.push(`mentions ${name}`);
  for (const topic of [...PARTISAN, "election"])
    if (new RegExp(`\\b${topic}\\b`, "i").test(text)) problems.push(`mentions ${topic}`);
  return problems;
}

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).filter(Boolean).length;

export type ReadCase = { ok: true; case: DailyCase } | { ok: false; problems: string[] };

/**
 * The model's reply as a case, or the reasons it can't be one. Questions must test the planned
 * lessons in order; options are shuffled (models put the right answer first far too often); and
 * the result has to pass the format, the content rules and the fairness rules the written cases
 * are tested against.
 */
export function readGeneratedCase(raw: unknown, plan: CasePlan): ReadCase {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawQuestions = Array.isArray(obj["questions"]) ? obj["questions"] : [];
  const problems: string[] = [];
  if (rawQuestions.length !== CASE_QUESTIONS) problems.push("needs exactly three questions");

  const rand = seeded(`shuffle:${plan.day}`);
  const questions = plan.lessons.map((lessonId, i) => {
    const q = (rawQuestions[i] ?? {}) as Record<string, unknown>;
    if (str(q["lessonId"]) && str(q["lessonId"]) !== lessonId)
      problems.push(`question ${i + 1} tests the wrong lesson`);
    const options = (Array.isArray(q["options"]) ? q["options"] : []).map((o) => {
      const opt = (o && typeof o === "object" ? o : {}) as Record<string, unknown>;
      return { text: str(opt["text"]), whyNot: str(opt["whyNot"]) };
    });
    const correct = typeof q["correct"] === "number" ? q["correct"] : -1;
    if (options.length !== 3 || !options[correct]) problems.push(`question ${i + 1} is not keyed`);
    const order = shuffle(
      options.map((_, n) => n),
      rand,
    );
    return {
      lessonId,
      step: {
        id: `q${i + 1}`,
        kind: "choice" as const,
        prompt: str(q["prompt"]),
        options: order.map((n) =>
          n === correct
            ? { text: options[n]!.text }
            : { text: options[n]!.text, whyNot: options[n]!.whyNot },
        ),
        correct: order.indexOf(correct),
        why: str(q["why"]),
      },
    };
  });

  const source = str(obj["source"]);
  const candidate = {
    id: aiCaseId(plan.day),
    source: source in CASE_SOURCES ? source : plan.source,
    title: str(obj["title"]),
    text: str(obj["text"]),
    questions,
    takeaway: str(obj["takeaway"]),
  };
  if (problems.length > 0) return { ok: false, problems };

  const parsed = dailyCaseSchema.safeParse(candidate);
  if (!parsed.success)
    return {
      ok: false,
      problems: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  const c = parsed.data;
  problems.push(...caseProblems(c), ...contentRuleProblems(JSON.stringify(c)));
  for (const q of c.questions) {
    const where = `question ${q.step.id}`;
    if (sentences(q.step.why) > 3 || wordCount(q.step.why) > 50)
      problems.push(`${where}: why is too long`);
    for (const o of q.step.options)
      if (o.whyNot && wordCount(o.whyNot) > 50) problems.push(`${where}: a reason is too long`);
    const right = q.step.options[q.step.correct]!.text.length;
    const wrong = q.step.options.filter((_, n) => n !== q.step.correct).map((o) => o.text.length);
    if (right > Math.max(...wrong) * 1.5 + 6)
      problems.push(`${where}: the right answer stands out by length`);
  }
  return problems.length > 0 ? { ok: false, problems } : { ok: true, case: c };
}

/** The reviewer's verdict on a case: true only if every question passed. Null when unreadable. */
export function readCaseReview(raw: unknown): boolean | null {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const verdicts = Array.isArray(obj["questions"]) ? obj["questions"] : null;
  if (!verdicts || verdicts.length !== CASE_QUESTIONS) return null;
  return verdicts.every((v) => (v as { pass?: unknown } | null)?.pass === true);
}

/** A written case in the shape the model is asked to reply in, to show it what good looks like. */
export function asReplyExample(c: DailyCase) {
  return {
    source: c.source,
    title: c.title,
    text: c.text,
    questions: c.questions.map((q) => ({
      lessonId: q.lessonId,
      prompt: q.step.kind === "confidence" ? q.step.question : q.step.prompt,
      options: q.step.options.map((o) =>
        o.whyNot ? { text: o.text, whyNot: o.whyNot } : { text: o.text },
      ),
      correct: q.step.correct,
      why: q.step.why,
    })),
    takeaway: c.takeaway,
  };
}
