import { CONTENT_POLICY_RULES } from "./moderation.server";
import { UNITS, linksForLesson, type CurriculumLesson } from "./curriculum";
import type {
  AssumptionExercise,
  Exercise,
  FlawExercise,
  PredictExercise,
  RankExercise,
  SortBucket,
  SortExercise,
  SteelmanExercise,
  WrittenPrompt,
} from "./exercises";
import type { Lesson } from "./courses";

/**
 * Phase 2 lesson generation: one short concept card, 4-6 mixed reasoning
 * exercises matched to the lesson's objective, one written-argument prompt and
 * a short summary. No text walls, no recall multiple choice.
 */
export const EXERCISE_SYSTEM = `You design training drills for Lamppost, a critical-thinking trainer.
A lesson is a workout, not a reading. The learner does the reasoning; you never explain at length.
Reply with ONLY minified JSON (no markdown fences, no commentary) in exactly this shape:
{"concept":{"title":string,"body":string,"example":string},"exercises":[Exercise],"written":{"prompt":string,"guidance":string},"summary":[string,string,string]}

"concept.body" is AT MOST 80 words teaching the skill in plain language. "concept.example" is ONE
concrete everyday example (max 40 words). "concept.title" is max 5 words.

"exercises" has 5 entries. Every entry is one of these six shapes, each entry a different "kind"
where possible, all serving this lesson's objective, all using everyday material (news claims,
workplace decisions, health advice, adverts, social posts, product reviews, politics):

1 {"kind":"flaw","claim":string,"options":[string,string,string],"correct":number,"fallacy":string,"explanation":string}
  claim = a 2-3 sentence argument that sounds convincing but commits exactly one reasoning error.
  options = three candidate diagnoses (max 16 words each); only one names the error actually present.
2 {"kind":"assumption","argument":string,"options":[string,string,string],"correct":number,"explanation":string}
  argument = 2 sentences. options = candidate unstated assumptions (max 18 words); exactly one MUST
  be true for the argument to work, the others are plausible but not load-bearing.
3 {"kind":"rank","claim":string,"items":[{"text":string,"why":string}]}
  3 or 4 pieces of evidence for the claim, listed STRONGEST FIRST. text max 22 words.
  why = one sentence explaining why it sits at that strength.
4 {"kind":"sort","statements":[{"text":string,"bucket":"fact","why":string}]}
  4 statements, bucket is one of "fact" (checkable), "opinion" (a preference or judgement) or
  "value" (a claim about what matters or what ought to be). Mix the buckets. why = one sentence.
5 {"kind":"predict","scenario":string,"question":string,"options":[string,string,string],"correct":number,"explanation":string}
  scenario = a study result, decision or chart described in 2-3 sentences, stopping BEFORE the outcome.
  question asks the learner to predict the outcome. explanation reveals what actually happened.
6 {"kind":"steelman","view":string,"options":[string,string,string],"correct":number,"explanation":string}
  view = a weakly stated version of a real position (2 sentences). options = three rewrites; the
  correct one is the strongest honest version, the others overstate, strawman or dodge.

"correct" is always a 0-based index.
"written" is the closing task: prompt asks the learner to make the case for or against something
concrete from this lesson in 3-5 sentences. guidance is one sentence naming what a strong answer does.
"summary" is 3 takeaways, max 14 words each.
Use the exact key names above.

${CONTENT_POLICY_RULES}`;

export function exerciseLessonPrompt(lesson: CurriculumLesson) {
  const unit = UNITS.find((u) => u.id === lesson.unitId);
  const links = linksForLesson(lesson.id)
    .map((link) => `- ${link.concept}: ${link.detail}`)
    .join("\n");

  return `Course: Lamppost — Critical thinking (a fixed 7-unit curriculum).
Unit: ${unit?.title ?? lesson.unitId} — ${unit?.blurb ?? ""}
Lesson title: "${lesson.title}"
Learning objective (every exercise must train exactly this, nothing wider):
${lesson.objective}

Stay strictly on this objective: never drift into another unit's skill, never teach study technique
instead of the skill, never ask a question that can be answered by recalling the concept card.
${links ? `This lesson genuinely connects to other units:\n${links}\nOne exercise may lean on that connection.` : ""}
Return the JSON now.`;
}

/* ------------------------------- parsing ------------------------------- */

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

/** Models put the right answer first far too often, so shuffle every choice set. */
function shuffled(options: string[], correct: number) {
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return { options: order.map((i) => options[i]!), correct: order.indexOf(correct) };
}

function choiceSet(raw: Record<string, unknown>, max = 4) {
  const options = asArray(pick(raw, ["options", "answers", "choices", "diagnoses", "candidates"]))
    .map((o) => (typeof o === "string" ? o.trim() : str(pick(asObject(o), ["text", "option"]))))
    .filter(Boolean)
    .slice(0, max);
  if (options.length < 2) return null;
  const correctRaw = pick(raw, ["correct", "correct_index", "correctIndex", "answer_index"]);
  const correct = Math.min(
    Math.max(typeof correctRaw === "number" ? correctRaw : 0, 0),
    options.length - 1,
  );
  return shuffled(options, correct);
}

const BUCKETS: SortBucket[] = ["fact", "opinion", "value"];

function normalizeExercise(raw: unknown): Exercise | null {
  const e = asObject(raw);
  const kind = str(pick(e, ["kind", "type"])).toLowerCase();
  const explanation = str(pick(e, ["explanation", "why", "rationale", "reveal"]));

  if (kind === "flaw") {
    const claim = str(pick(e, ["claim", "argument", "statement", "passage"]));
    const set = choiceSet(e, 3);
    if (!claim || !set) return null;
    const fallacy = str(pick(e, ["fallacy", "name", "error", "label"]));
    const drill: FlawExercise = {
      kind: "flaw",
      claim,
      options: set.options,
      correct: set.correct,
      ...(fallacy ? { fallacy } : {}),
      explanation: explanation || "The argument needs support it never actually provides.",
    };
    return drill;
  }

  if (kind === "assumption" || kind === "hidden_assumption" || kind === "hiddenassumption") {
    const argument = str(pick(e, ["argument", "claim", "passage", "text"]));
    const set = choiceSet(e, 4);
    if (!argument || !set) return null;
    const drill: AssumptionExercise = {
      kind: "assumption",
      argument,
      options: set.options,
      correct: set.correct,
      explanation: explanation || "Without that link, the conclusion doesn't follow.",
    };
    return drill;
  }

  if (kind === "rank" || kind === "rank_evidence" || kind === "rankevidence") {
    const items = asArray(pick(e, ["items", "evidence", "cards", "options"]))
      .map((raw2) => {
        const item = asObject(raw2);
        const text = typeof raw2 === "string" ? raw2.trim() : str(pick(item, ["text", "evidence", "label"]));
        if (!text) return null;
        return { text, why: str(pick(item, ["why", "explanation", "reason"]), "") };
      })
      .filter((i): i is { text: string; why: string } => i !== null)
      .slice(0, 4);
    if (items.length < 3) return null;
    const drill: RankExercise = { kind: "rank", claim: str(pick(e, ["claim", "question"]), "Which evidence is strongest?"), items };
    return drill;
  }

  if (kind === "sort" || kind === "fact_opinion_value" || kind === "bucket") {
    const statements = asArray(pick(e, ["statements", "items", "cards"]))
      .map((raw2) => {
        const s = asObject(raw2);
        const text = str(pick(s, ["text", "statement", "claim"]));
        const bucketRaw = str(pick(s, ["bucket", "category", "answer", "type"])).toLowerCase();
        const bucket = BUCKETS.find((b) => bucketRaw.includes(b));
        if (!text || !bucket) return null;
        return { text, bucket, why: str(pick(s, ["why", "explanation", "reason"]), "") };
      })
      .filter((s): s is { text: string; bucket: SortBucket; why: string } => s !== null)
      .slice(0, 5);
    if (statements.length < 3) return null;
    const drill: SortExercise = { kind: "sort", statements };
    return drill;
  }

  if (kind === "predict" || kind === "predict_then_reveal" || kind === "prediction") {
    const scenario = str(pick(e, ["scenario", "setup", "context", "passage"]));
    const set = choiceSet(e, 3);
    if (!scenario || !set) return null;
    const drill: PredictExercise = {
      kind: "predict",
      scenario,
      question: str(pick(e, ["question", "prompt"]), "What happened?"),
      options: set.options,
      correct: set.correct,
      explanation: explanation || "That's what the evidence actually showed.",
    };
    return drill;
  }

  if (kind === "steelman") {
    const view = str(pick(e, ["view", "weak", "position", "claim", "argument"]));
    const set = choiceSet(e, 3);
    if (!view || !set) return null;
    const drill: SteelmanExercise = {
      kind: "steelman",
      view,
      options: set.options,
      correct: set.correct,
      explanation: explanation || "The strongest version keeps the point honest and specific.",
    };
    return drill;
  }

  return null;
}

/**
 * Turns one model reply into a lesson. Returns null when there isn't enough
 * usable material — the caller surfaces an error rather than faking content.
 */
export function parseExerciseLesson(
  text: string,
  meta: { title: string; objective: string; emoji: string },
): Lesson | null {
  const root = extractJson(text);
  if (!root) return null;

  const conceptRaw = asObject(pick(root, ["concept", "conceptCard", "concept_card"]));
  const body = str(pick(conceptRaw, ["body", "text", "explanation"]));
  const example = str(pick(conceptRaw, ["example", "illustration"]));

  const exercises = asArray(pick(root, ["exercises", "drills", "items"]))
    .map(normalizeExercise)
    .filter((e): e is Exercise => e !== null)
    .slice(0, 6);
  if (!body || exercises.length < 3) return null;

  const writtenRaw = asObject(pick(root, ["written", "writtenArgument", "written_argument", "essay"]));
  const writtenPrompt = str(pick(writtenRaw, ["prompt", "question", "task"]));
  const guidance = str(pick(writtenRaw, ["guidance", "hint", "criteria"]));
  const written: WrittenPrompt | null = writtenPrompt
    ? { prompt: writtenPrompt, ...(guidance ? { guidance } : {}) }
    : null;

  const summary = asArray(pick(root, ["summary", "takeaways", "keyPoints", "key_points"]))
    .map((s) => str(s))
    .filter(Boolean)
    .slice(0, 4);

  const flaw = exercises.find((e): e is FlawExercise => e.kind === "flaw");

  return {
    title: meta.title,
    subtitle: meta.objective,
    emoji: meta.emoji,
    concept: {
      title: str(pick(conceptRaw, ["title", "heading"]), meta.title),
      body,
      ...(example ? { example } : {}),
    },
    exercises,
    ...(written ? { written } : {}),
    ...(summary.length ? { keyPoints: summary } : {}),
    // Keep the legacy shapes populated so older screens keep working.
    intro: body,
    parts: [{ title: str(pick(conceptRaw, ["title", "heading"]), meta.title), body }],
    ...(flaw ? { flaw: { claim: flaw.claim, options: flaw.options, correct: flaw.correct, ...(flaw.fallacy ? { fallacy: flaw.fallacy } : {}), explanation: flaw.explanation } } : {}),
  };
}
