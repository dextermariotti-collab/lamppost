import { CONTENT_POLICY_RULES } from "./moderation.server";
import { UNITS, linksForLesson, type CurriculumLesson } from "./curriculum";
import {
  EXERCISE_LABEL,
  EXERCISE_QUESTION,
  WRITTEN_TASKS,
  type AssumptionExercise,
  type ClaimExercise,
  type Exercise,
  type ExerciseKind,
  type FlawExercise,
  type PredictExercise,
  type RankExercise,
  type SortBucket,
  type SortExercise,
  type SteelmanExercise,
  type WrittenPrompt,
  type WrittenTaskType,
} from "./exercises";
import type { Lesson } from "./courses";

/**
 * Lesson generation: one short concept card, the exact drills this lesson's
 * curriculum plan calls for, one closing written task with its passage supplied
 * in-app, and a short summary. No text walls, no recall multiple choice.
 */

/** Per-kind shape spec. Only the planned kinds are sent to the model. */
const KIND_SPEC: Record<ExerciseKind, string> = {
  claim: `{"kind":"claim","passage":string,"options":[string,string,string],"correct":number,"explanation":string}
  passage = 3-4 sentences mixing background, evidence and emotion around ONE central claim.
  options = three candidate restatements of the central claim (max 18 words). Exactly one is the
  conclusion the passage wants accepted; the others are premises or background from the passage.`,
  flaw: `{"kind":"flaw","claim":string,"options":[string,string,string],"correct":number,"fallacy":string,"explanation":string}
  claim = a 2-3 sentence argument that sounds convincing but commits exactly ONE reasoning error.
  options = three candidate diagnoses (max 16 words each). The keyed one must be the single most
  serious, most specific flaw actually present; the other two must be clearly weaker or simply
  untrue of this argument. If two options could both be defended as the main flaw, rewrite one.`,
  assumption: `{"kind":"assumption","argument":string,"options":[string,string,string],"correct":number,"explanation":string}
  argument = 2 sentences. options = candidate unstated assumptions (max 18 words); exactly one MUST
  be true for the argument to work, the others are plausible but not load-bearing.`,
  rank: `{"kind":"rank","claim":string,"items":[{"text":string,"why":string}]}
  claim = ONE stated claim. items = 3 or 4 pieces of REAL EVIDENCE offered for that claim
  (studies, measurements, records, testimony, anecdotes) listed STRONGEST FIRST. Never premises,
  restatements of the claim, opinions or conclusions — every item must be something a person could
  check. text max 22 words. why = one sentence on why it sits at that strength.`,
  sort: `{"kind":"sort","statements":[{"text":string,"bucket":"fact","why":string}]}
  4 statements, bucket is one of "fact" (checkable), "opinion" (a preference or judgement) or
  "value" (a claim about what matters or what ought to be). Mix the buckets. why = one sentence.`,
  predict: `{"kind":"predict","scenario":string,"question":string,"options":[string,string,string],"correct":number,"explanation":string}
  scenario = a decision, situation or study described in 2-3 sentences, stopping BEFORE the outcome.
  NEVER invent a study, statistic, institution or named source and present it as real. Either
  (a) describe a genuinely well-established, widely-reported finding you are confident about, or
  (b) begin the scenario with the exact words "Hypothetical scenario: " and keep every number inside
  it clearly part of that hypothetical. Do not name researchers, universities, journals or years
  unless the finding is genuinely famous.
  question asks the learner to predict the outcome. explanation reveals what happened; if the
  scenario was hypothetical, the explanation says what would follow and why, not what "was found".`,
  steelman: `{"kind":"steelman","view":string,"options":[string,string,string],"correct":number,"explanation":string}
  view = a weakly stated version of a real position (2 sentences). options = three rewrites; the
  correct one is the strongest honest version, the others overstate, strawman or dodge.`,
};

const WRITTEN_SPEC: Record<WrittenTaskType, string> = {
  restate: `"written" is a RESTATE task: passage = a 3-5 sentence opinion piece or advert written out in
full inside the JSON. prompt asks the learner to restate its central claim in ONE sentence,
excluding evidence and background. Never tell the learner to go and find an article.`,
  case: `"written" is a MAKE THE CASE task: passage = the 2-4 sentence situation, motion or question being
argued, written out in full. prompt asks the learner to argue for or against it in 3-5 sentences
with a claim, support and the strongest objection answered.`,
  critique: `"written" is a CRITIQUE task: passage = a 3-5 sentence flawed argument written out in full.
prompt asks the learner, in 2-4 sentences, to name the flaw, say why it matters for the conclusion
and suggest a fix.`,
};

/**
 * Rules that hold for every drill, in lesson generation and in the fresh review
 * variants alike. Two of them exist because of real content failures: models
 * invented studies as fact, and tucked the reasoning into one option so the
 * answer could be read off the wording instead of worked out.
 */
export const HARD_RULES = `Hard rules for every drill:
- The content must match the drill's own instruction: evidence drills contain evidence, claim drills
  contain a claim buried in a passage, and so on.
- Exactly ONE option is clearly the best answer and "correct" (0-based index) points at it.
- "explanation" must agree with the keyed option and never argue for a different one.
- Every drill must test THIS lesson's objective and use everyday material (news, workplace decisions,
  health advice, adverts, social posts, product reviews, politics).
- NEVER present an invented study, statistic, institution or named source as real fact. Use a
  genuinely well-established finding, or mark the whole scenario as hypothetical.
- NO GIVEAWAY WORDING. Options must be the same style and within a few words of the same length, and
  must never contain their own justification: no "because…", "since…", "which shows…", "as habit was
  assumed, not created". State the outcome or diagnosis only; the reasoning belongs in "explanation".
  Never make the keyed option the longest, the most hedged or the most detailed one.`;

export function exerciseSystemPrompt(kinds: ExerciseKind[], written: WrittenTaskType) {
  const unique = [...new Set(kinds)];
  return `You design training drills for Lamppost, a critical-thinking trainer.
A lesson is a workout, not a reading. The learner does the reasoning; you never explain at length.
Reply with ONLY minified JSON (no markdown fences, no commentary) in exactly this shape:
{"concept":{"title":string,"body":string,"example":string},"exercises":[Exercise],"written":{"passage":string,"prompt":string,"guidance":string},"summary":[string,string,string]}

"concept.body" is AT MOST 80 words teaching the skill in plain language. "concept.example" is ONE
concrete everyday example (max 40 words). "concept.title" is max 5 words.

"exercises" has EXACTLY ${unique.length} entries, in this order, one per line below, and NO other kinds:
${unique.map((kind, i) => `${i + 1} ${EXERCISE_LABEL[kind]} — ${KIND_SPEC[kind]}`).join("\n")}

${HARD_RULES}

${WRITTEN_SPEC[written]}
Guidance is one sentence naming what a strong answer does. The passage is ALWAYS included in the JSON
so the learner never has to leave the app.
"summary" is 3 takeaways, max 14 words each.
Use the exact key names above.

${CONTENT_POLICY_RULES}`;
}

export function exerciseLessonPrompt(lesson: CurriculumLesson) {
  const unit = UNITS.find((u) => u.id === lesson.unitId);
  const links = linksForLesson(lesson.id)
    .map((link) => `- ${link.concept}: ${link.detail}`)
    .join("\n");
  const task = WRITTEN_TASKS[lesson.written];

  return `Course: Lamppost — Critical thinking (a fixed 7-unit curriculum).
Unit: ${unit?.title ?? lesson.unitId} — ${unit?.blurb ?? ""}
Lesson title: "${lesson.title}"
Learning objective (every exercise must train exactly this, nothing wider):
${lesson.objective}

Drill plan for this lesson (use exactly these kinds, in this order):
${lesson.drills.map((kind, i) => `${i + 1}. ${kind} — ${EXERCISE_LABEL[kind]}`).join("\n")}
Closing written task: ${task.label} (${task.length}).

Stay strictly on this objective: never drift into another unit's skill, never teach study technique
instead of the skill, never ask a question that can be answered by recalling the concept card.
${links ? `This lesson genuinely connects to other units:\n${links}\nOne exercise may lean on that connection.` : ""}
Return the JSON now.`;
}

/* --------------------- fresh variants for reviews --------------------- */

/**
 * A review must not be a memory test of one scenario, so a due item is served as
 * a brand-new drill of the same kind on the same skill.
 */
export function variantSystemPrompt(kind: ExerciseKind) {
  return `You design a single training drill for Lamppost, a critical-thinking trainer.
Reply with ONLY minified JSON (no markdown fences, no commentary) in exactly this shape:
${KIND_SPEC[kind]}

${HARD_RULES}

${CONTENT_POLICY_RULES}`;
}

export function variantPrompt(lesson: CurriculumLesson, kind: ExerciseKind, avoid: string[]) {
  const unit = UNITS.find((u) => u.id === lesson.unitId);
  return `Unit: ${unit?.title ?? lesson.unitId}
Skill being reviewed: ${lesson.objective}
Drill type: ${kind} — ${EXERCISE_LABEL[kind]} (${EXERCISE_QUESTION[kind]})

Write ONE new drill of that type training exactly that skill, on fresh material.
${
  avoid.length
    ? `These scenarios have already been used — pick a clearly different subject area and situation:\n${avoid
        .map((a, i) => `${i + 1}. ${a}`)
        .join("\n")}`
    : ""
}
Return the JSON for that one drill now.`;
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

export function extractJson(text: string): Record<string, unknown> | null {
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

export function normalizeExercise(raw: unknown): Exercise | null {
  const e = asObject(raw);
  const kind = str(pick(e, ["kind", "type"])).toLowerCase();
  const explanation = str(pick(e, ["explanation", "why", "rationale", "reveal"]));

  if (kind === "claim" || kind === "find_the_claim" || kind === "findtheclaim") {
    const passage = str(pick(e, ["passage", "text", "argument", "claim"]));
    const set = choiceSet(e, 4);
    if (!passage || !set) return null;
    const drill: ClaimExercise = {
      kind: "claim",
      passage,
      options: set.options,
      correct: set.correct,
      explanation: explanation || "That is the conclusion the passage wants you to accept.",
    };
    return drill;
  }

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
        const text =
          typeof raw2 === "string" ? raw2.trim() : str(pick(item, ["text", "evidence", "label"]));
        if (!text) return null;
        return { text, why: str(pick(item, ["why", "explanation", "reason"]), "") };
      })
      .filter((i): i is { text: string; why: string } => i !== null)
      .slice(0, 4);
    const claim = str(pick(e, ["claim", "question"]));
    if (items.length < 3 || !claim) return null;
    const drill: RankExercise = { kind: "rank", claim, items };
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

/** Keeps only drills the plan asked for, one per planned slot, in plan order. */
export function drillsMatchingPlan(exercises: Exercise[], plan: ExerciseKind[]): Exercise[] {
  const pool = [...exercises];
  const chosen: Exercise[] = [];
  for (const kind of plan) {
    const at = pool.findIndex((e) => e.kind === kind);
    if (at === -1) continue;
    chosen.push(pool.splice(at, 1)[0]!);
  }
  return chosen;
}

/**
 * Turns one model reply into a lesson. Returns null when there isn't enough
 * usable material — the caller surfaces an error rather than faking content.
 */
export function parseExerciseLesson(
  text: string,
  meta: {
    title: string;
    objective: string;
    emoji: string;
    drills: ExerciseKind[];
    written: WrittenTaskType;
  },
): Lesson | null {
  const root = extractJson(text);
  if (!root) return null;

  const conceptRaw = asObject(pick(root, ["concept", "conceptCard", "concept_card"]));
  const body = str(pick(conceptRaw, ["body", "text", "explanation"]));
  const example = str(pick(conceptRaw, ["example", "illustration"]));

  const parsed = asArray(pick(root, ["exercises", "drills", "items"]))
    .map(normalizeExercise)
    .filter((e): e is Exercise => e !== null);
  const exercises = drillsMatchingPlan(parsed, meta.drills);
  if (!body || exercises.length < 3) return null;

  const writtenRaw = asObject(
    pick(root, ["written", "writtenArgument", "written_argument", "essay"]),
  );
  const writtenPrompt = str(pick(writtenRaw, ["prompt", "question", "task"]));
  const passage = str(pick(writtenRaw, ["passage", "text", "scenario", "argument", "excerpt"]));
  const guidance = str(pick(writtenRaw, ["guidance", "hint", "criteria"]));
  const written: WrittenPrompt | null =
    writtenPrompt && passage
      ? { type: meta.written, prompt: writtenPrompt, passage, ...(guidance ? { guidance } : {}) }
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
    ...(flaw
      ? {
          flaw: {
            claim: flaw.claim,
            options: flaw.options,
            correct: flaw.correct,
            ...(flaw.fallacy ? { fallacy: flaw.fallacy } : {}),
            explanation: flaw.explanation,
          },
        }
      : {}),
  };
}
