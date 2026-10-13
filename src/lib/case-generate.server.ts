import { DAILY_CASES } from "@/content/cases";
import { AI_MODELS } from "./ai-models";
import {
  asReplyExample,
  casePlanForDay,
  readCaseReview,
  readGeneratedCase,
  type CasePlan,
} from "./case-generate";
import { LESSONS, unitById } from "./curriculum";
import { CASE_SOURCES, CASE_TEXT_WORDS, type DailyCase } from "./daily-case";

/**
 * Writing a daily case with the AI gateway, for learners who have read the whole written
 * library. A writer drafts it from the day's plan, the draft must pass every rule the written
 * cases pass (`readGeneratedCase`), and a reviewer checks each question has one clearly best
 * answer. Anything that fails is thrown away; the learner then gets an older written case.
 */

export const CASE_MODEL = AI_MODELS.cases;
const ROUNDS = 2;

export const CASE_WRITER_SYSTEM = `You write the daily case for Lamppost, a critical-thinking trainer.
A case is one short, realistic piece of everyday text (an advert, a post, an email, a notice, a chatbot answer...) and three multiple-choice questions about it. Each question practises one named lesson, using that lesson's idea on this text.
Rules:
- Every person, company, product, place and organisation is made up. Never use real brands, public figures or news events.
- Never touch party politics, elections, or contested social issues. Prefer everyday life: shops, clubs, councils, schools, work, travel, health products, apps, money decisions.
- The text is ${CASE_TEXT_WORDS.min}-${CASE_TEXT_WORDS.max} words and reads like the real thing, with the reasoning problems inside it, not labelled.
- Each question has exactly three options. Exactly one is clearly best; the other two are tempting but wrong, and each wrong one has a "whyNot" of at most 30 words naming the specific mistake.
- Keep the right option about as long as the wrong ones. Prompts are at most 25 words; "why" is one or two sentences, at most 40 words, explaining the answer using the text.
- The takeaway is one sentence of at most 18 words.
- Plain, calm English. No exclamation marks outside the case text itself. No emoji.
Reply with ONLY minified JSON in the shape of the example, and nothing else.`;

export const CASE_REVIEW_SYSTEM = `You are a strict reviewer of multiple-choice reasoning questions. You do not rewrite anything; you judge.
For each question, pass it only if: it can be answered from the case text; the keyed option is clearly the best; no other option is also defensible; it really practises the named lesson; and nothing in the case uses a real brand or person or takes a side on a contested public issue.
Reply with ONLY minified JSON: {"questions":[{"pass":true|false,"problem":"<short reason or empty>"}, ... one per question, in order]}`;

function lessonLine(lessonId: string) {
  const lesson = LESSONS.find((l) => l.id === lessonId)!;
  return `- ${lesson.id}: "${lesson.title}" (${unitById(lesson.unitId).title}). Idea: ${lesson.keyIdea}`;
}

export function casePrompt(plan: CasePlan): string {
  const example = asReplyExample(DAILY_CASES[0]!);
  return `Write today's case.
Kind of text: ${CASE_SOURCES[plan.source].toLowerCase()} (use "source": "${plan.source}").
Setting: ${plan.setting}.
The three questions, in this order, practise these lessons (use these lessonId values):
${plan.lessons.map(lessonLine).join("\n")}

Example of the exact JSON shape (a different case; don't reuse its topic, names or wording):
${JSON.stringify(example)}`;
}

export function reviewPrompt(c: DailyCase): string {
  return `Case text:
${c.text}

Questions:
${c.questions
  .map((q, i) => {
    const lesson = LESSONS.find((l) => l.id === q.lessonId);
    const options = q.step.options
      .map((o, n) => `   ${n === q.step.correct ? "[keyed]" : "       "} ${o.text}`)
      .join("\n");
    const prompt = q.step.kind === "confidence" ? q.step.question : q.step.prompt;
    return `${i + 1}. (${lesson?.title ?? q.lessonId}) ${prompt}\n${options}`;
  })
  .join("\n")}`;
}

export type WrittenCase = { ok: true; case: DailyCase } | { ok: false; reason: string };

/** Writes and checks the case for a day. Never stores anything; the caller does. */
export async function writeCaseForDay(day: string, apiKey: string): Promise<WrittenCase> {
  const { streamText } = await import("ai");
  const { createAiProvider } = await import("./ai-gateway.server");
  const { withGuardrails } = await import("./ai-guardrails.server");
  const { screenOutput } = await import("./moderation.server");
  const { extractJson } = await import("./exercise-ai.server");

  const gateway = createAiProvider(apiKey);
  const plan = casePlanForDay(day);

  for (let round = 0; round < ROUNDS; round++) {
    try {
      const draft = await streamText({
        model: gateway(CASE_MODEL),
        system: withGuardrails(CASE_WRITER_SYSTEM),
        prompt: casePrompt(plan),
        maxRetries: 1,
      }).text;
      if (!screenOutput(draft).allowed) continue;
      const read = readGeneratedCase(extractJson(draft), plan);
      if (!read.ok) {
        console.warn(`[cases] ${day}: draft refused (${read.problems.slice(0, 3).join("; ")})`);
        continue;
      }
      const review = await streamText({
        model: gateway(CASE_MODEL),
        system: withGuardrails(CASE_REVIEW_SYSTEM),
        prompt: reviewPrompt(read.case),
        maxRetries: 1,
      }).text;
      if (readCaseReview(extractJson(review)) === true) return { ok: true, case: read.case };
      console.warn(`[cases] ${day}: the reviewer failed the draft`);
    } catch (error) {
      console.error(`[cases] ${day}: writing failed`, error);
    }
  }
  return { ok: false, reason: "no-case" };
}
