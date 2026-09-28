import { CONTENT_POLICY_RULES } from "./moderation.server";
import { UNITS, linksForLesson, type CurriculumLesson } from "./curriculum";
import {
  EXERCISE_LABEL,
  EXERCISE_QUESTION,
  WRITTEN_TASKS,
  type AssumptionExercise,
  type ChartExercise,
  type ClaimExercise,
  type Exercise,
  type ExerciseKind,
  type FlawExercise,
  type HighlightExercise,
  type JudgeExercise,
  type NumericExercise,
  type OrderExercise,
  type PredictExercise,
  type RankExercise,
  type RewriteExercise,
  type SliderExercise,
  type SortBucket,
  type SortExercise,
  type SteelmanExercise,
  type WrittenPrompt,
  type WrittenTaskType,
} from "./exercises";
import type { Lesson } from "./courses";
import { exercisesMatchPlan } from "./drill-plan";

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
  judge: `{"kind":"judge","question":string,"passage":string,"options":[string,string,string],"correct":number,"explanation":string}
  question = THIS lesson's own instruction, max 12 words, ending in a question mark. Examples of the
  form: "Who owes evidence here?", "Which alternative explanation fits best?", "Legitimate appeal to
  expertise, or a fallacy?", "Which study design would settle this?", "Which objection is strongest?",
  "Which part of this answer is unsupported?", "Good decision or good luck?", "Which sample is better?".
  passage = the material being judged, 2-4 sentences. options = three candidate answers, same length
  and style; exactly one is right for the reason the lesson teaches.`,
  highlight: `{"kind":"highlight","question":string,"tokens":[string],"targets":[number],"explanation":string}
  question = the tapping instruction, max 12 words (e.g. "Tap every word that makes this untestable").
  tokens = the passage split into tappable pieces IN READING ORDER; each token is one word or a short
  phrase, and joining the tokens with single spaces must read exactly as the original passage.
  Use 20-45 tokens. Punctuation stays attached to its word.
  targets = 0-based indexes of the tokens that must be tapped: 2-5 of them, never more than a quarter
  of the tokens, and each one genuinely guilty of what the question asks for.`,
  rewrite: `{"kind":"rewrite","question":string,"original":string,"options":[string,string,string],"correct":number,"explanation":string}
  question = what the rewrite must achieve, max 12 words (e.g. "Which rewrite could actually be shown
  false?", "Which version is scoped to the evidence?").
  original = the faulty claim, headline or objection, one or two sentences.
  options = three rewrites of similar length; the keyed one fixes exactly the fault named, one stays
  faulty in a subtler way, one overcorrects into a different claim.`,
  order: `{"kind":"order","question":string,"passage":string,"items":[{"text":string,"why":string}]}
  question = the ordering instruction, max 12 words (e.g. "Order these into a working argument",
  "Which check would you do first?").
  passage = one or two sentences of context, or an empty string if none is needed.
  items = 3 or 4 cards LISTED IN THE CORRECT ORDER, each max 18 words, with why = one sentence on
  why it sits there. Never include two cards whose order is arguable.`,
  numeric: `{"kind":"numeric","question":string,"scenario":string,"answer":number,"tolerance":number,"unit":string,"solution":string}
  scenario = 2-4 sentences giving every number needed, all clearly hypothetical or genuinely
  well-established. question = what to work out, max 16 words. answer = the single correct number,
  computable from the scenario alone. tolerance = allowed absolute difference (never zero).
  unit = "%", "£", "people" or "" as appropriate. solution = the working in max 45 words.`,
  slider: `{"kind":"slider","claim":string,"evidence":string,"direction":"up","size":number,"explanation":string}
  claim = a specific claim the learner rates their confidence in, one sentence.
  evidence = one new piece of evidence revealed afterwards, 1-2 sentences.
  direction = "up" if the evidence should raise confidence, "down" if it should lower it.
  size = roughly how many percentage points a good reasoner moves (5-40): small for weak or
  expected evidence, large for strong, hard-to-fake evidence.
  explanation = why that direction, and why that much.`,
  chart: `{"kind":"chart","question":string,"title":string,"series":[{"label":string,"value":number}],"yMin":number,"yMax":number,"options":[string,string,string],"correct":number,"explanation":string}
  series = 4-6 real-looking data points, label max 8 characters. yMin/yMax = the axis window the
  chart is drawn with, chosen so the drawing exaggerates or hides what the numbers actually do
  (that is the trick). question asks what the chart is doing, max 14 words. options = three candidate
  answers, one of which names the trick precisely.`,
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
  testable: `"written" is a REWRITE IT TESTABLE task: passage = a vague, unfalsifiable claim (a headline,
advert line or announcement) written out in full, 1-3 sentences. prompt asks the learner to rewrite
it in one or two sentences so it could actually be shown false — specific about who, how much and
under what conditions — without changing what was originally claimed.`,
  steelmanWrite: `"written" is a STEELMAN task: passage = a position stated weakly or unsympathetically,
2-4 sentences, on a question with honest disagreement on both sides. prompt asks the learner to state
that position at its strongest in 2-4 sentences, using the best reasons available for it, without
changing what the position actually is.`,
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
- Every drill must test THIS lesson's key idea and its named trap, not critical thinking in general.
- NEVER present an invented study, statistic, institution or named source as real fact. Use a
  genuinely well-established finding, or mark the whole scenario as hypothetical.
- NO GIVEAWAY WORDING. Options must be the same style and within a few words of the same length, and
  must never contain their own justification: no "because…", "since…", "which shows…", "as habit was
  assumed, not created". State the outcome or diagnosis only; the reasoning belongs in "explanation".
  Never make the keyed option the longest, the most hedged or the most detailed one.
- NEVER REUSE THE CONCEPT CARD'S WORDING in the keyed option. If the card says "elastic terms like
  'up to'", the correct option must not contain that phrase — otherwise the answer is a matching
  exercise, not reasoning.
- DISTRACTORS MUST BE REAL MISTAKES a thoughtful person would actually make here: a weaker but
  tempting diagnosis, the popular-but-wrong answer, a true statement that isn't what was asked.
  Never write an obviously silly option.
- For find-the-claim drills, the keyed sentence must NOT sit last in the passage more than about a
  third of the time; put it first or in the middle, or leave it implied.
- Vary the setting between drills. No single setting (workplace, wellness, remote work, school…) may
  carry more than one drill in a lesson.`;

export function exerciseSystemPrompt(kinds: ExerciseKind[], written: WrittenTaskType) {
  const unique = [...new Set(kinds)];
  return `You design training drills for Lamppost, a critical-thinking trainer.
A lesson is a workout, not a reading. The learner does the reasoning; you never explain at length.
Reply with ONLY minified JSON (no markdown fences, no commentary) in exactly this shape:
{"concept":{"title":string,"body":string,"example":string},"exercises":[Exercise],"written":{"passage":string,"prompt":string,"guidance":string},"summary":[string,string,string]}

"concept.body" is AT MOST 80 words teaching the skill in plain language. "concept.example" is ONE
concrete everyday example (max 40 words). "concept.title" is max 5 words.

"exercises" has EXACTLY ${unique.length} entries, in this order, one per line below, and NO other kinds.
Each entry is a DIFFERENT drill type that makes the learner do a different kind of thinking; never write
two drills that amount to the same task in different words:
${unique.map((kind, i) => `${i + 1} ${EXERCISE_LABEL[kind]} — ${KIND_SPEC[kind]}`).join("\n")}

${HARD_RULES}

${WRITTEN_SPEC[written]}
Guidance is one sentence naming what a strong answer does. The passage is ALWAYS included in the JSON
so the learner never has to leave the app.
"summary" is 3 takeaways, max 14 words each.
Use the exact key names above.

${CONTENT_POLICY_RULES}`;
}

/** What difficulty band 1-3 actually means for the material. */
export const DIFFICULTY_NOTE: Record<number, string> = {
  1: `Difficulty 1: short passage (2 sentences), the fault is plain once looked for, distractors are
clearly weaker.`,
  2: `Difficulty 2: normal length (3 sentences), the fault takes a moment to name, one distractor is
genuinely tempting.`,
  3: `Difficulty 3: longer passage (4-5 sentences), the fault is subtle and partly buried, and two
distractors are defensible until examined closely. Never make it harder by being vaguer — only by
being subtler.`,
};

export function exerciseLessonPrompt(
  lesson: CurriculumLesson,
  opts: { domains?: string[]; difficulty?: number } = {},
) {
  const unit = UNITS.find((u) => u.id === lesson.unitId);
  const links = linksForLesson(lesson.id)
    .map((link) => `- ${link.concept}: ${link.detail}`)
    .join("\n");
  const task = WRITTEN_TASKS[lesson.written];
  const domains = opts.domains ?? [];

  return `Course: Lamppost — Critical thinking (a fixed 7-unit curriculum).
Unit: ${unit?.title ?? lesson.unitId} — ${unit?.blurb ?? ""}
Lesson title: "${lesson.title}"
Learning objective (every exercise must train exactly this, nothing wider):
${lesson.objective}

KEY IDEA the lesson teaches:
${lesson.keyIdea}

THE TRAP every drill must actually test:
${lesson.trap}

Drill plan for this lesson (use exactly these kinds, in this order):
${lesson.drills.map((kind, i) => `${i + 1}. ${kind} — ${EXERCISE_LABEL[kind]}`).join("\n")}
Closing written task: ${task.label} (${task.length}).
${
  domains.length
    ? `Settings to use, one per drill in this order (do not reuse a setting):\n${domains
        .map((d, i) => `${i + 1}. ${d}`)
        .join("\n")}`
    : ""
}
${DIFFICULTY_NOTE[opts.difficulty ?? 2] ?? ""}

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

export function variantPrompt(
  lesson: CurriculumLesson,
  kind: ExerciseKind,
  avoid: string[],
  opts: { difficulty?: number; domain?: string } = {},
) {
  const unit = UNITS.find((u) => u.id === lesson.unitId);
  return `Unit: ${unit?.title ?? lesson.unitId}
Skill being reviewed: ${lesson.objective}
Key idea: ${lesson.keyIdea}
The trap to test: ${lesson.trap}
Drill type: ${kind} — ${EXERCISE_LABEL[kind]} (${EXERCISE_QUESTION[kind]})
${opts.domain ? `Setting for this drill: ${opts.domain}` : ""}
${DIFFICULTY_NOTE[opts.difficulty ?? 2] ?? ""}

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

  if (kind === "judge" || kind === "call" || kind === "decide") {
    const passage = str(pick(e, ["passage", "scenario", "argument", "text", "claim"]));
    const question = str(pick(e, ["question", "instruction", "prompt"]));
    const set = choiceSet(e, 4);
    if (!passage || !question || !set) return null;
    const drill: JudgeExercise = {
      kind: "judge",
      question,
      passage,
      options: set.options,
      correct: set.correct,
      explanation: explanation || "That's the call the reasoning actually supports.",
    };
    return drill;
  }

  if (kind === "highlight" || kind === "highlight_words" || kind === "tap") {
    const tokens = asArray(pick(e, ["tokens", "words", "spans"]))
      .map((t) => (typeof t === "string" ? t.trim() : str(pick(asObject(t), ["text", "token"]))))
      .filter(Boolean);
    const targets = [
      ...new Set(
        asArray(pick(e, ["targets", "answer", "indexes", "indices"]))
          .map((t) => (typeof t === "number" ? t : Number(t)))
          .filter((t) => Number.isInteger(t) && t >= 0 && t < tokens.length),
      ),
    ].sort((a, b) => a - b);
    const question = str(pick(e, ["question", "instruction", "prompt"]));
    if (tokens.length < 8 || targets.length === 0 || !question) return null;
    const drill: HighlightExercise = {
      kind: "highlight",
      question,
      tokens,
      targets,
      explanation: explanation || "Those are the words doing the damage.",
    };
    return drill;
  }

  if (kind === "rewrite" || kind === "make_it_testable" || kind === "best_rewrite") {
    const original = str(pick(e, ["original", "claim", "passage", "headline", "text"]));
    const question = str(pick(e, ["question", "instruction", "prompt"]));
    const set = choiceSet(e, 4);
    if (!original || !question || !set) return null;
    const drill: RewriteExercise = {
      kind: "rewrite",
      question,
      original,
      options: set.options,
      correct: set.correct,
      explanation: explanation || "That version says what would count as failure.",
    };
    return drill;
  }

  if (kind === "order" || kind === "build_the_argument" || kind === "sequence") {
    const items = asArray(pick(e, ["items", "cards", "steps", "options"]))
      .map((raw2) => {
        const item = asObject(raw2);
        const text = typeof raw2 === "string" ? raw2.trim() : str(pick(item, ["text", "label"]));
        if (!text) return null;
        return { text, why: str(pick(item, ["why", "explanation", "reason"]), "") };
      })
      .filter((i): i is { text: string; why: string } => i !== null)
      .slice(0, 4);
    const question = str(pick(e, ["question", "instruction", "prompt"]));
    if (items.length < 3 || !question) return null;
    const passage = str(pick(e, ["passage", "context", "scenario"]));
    const drill: OrderExercise = {
      kind: "order",
      question,
      ...(passage ? { passage } : {}),
      items,
    };
    return drill;
  }

  if (kind === "numeric" || kind === "estimate" || kind === "calculate") {
    const answerRaw = pick(e, ["answer", "value", "correct", "result"]);
    const answer = typeof answerRaw === "number" ? answerRaw : Number(answerRaw);
    const tolRaw = pick(e, ["tolerance", "margin"]);
    const tolerance = typeof tolRaw === "number" ? tolRaw : Number(tolRaw);
    const scenario = str(pick(e, ["scenario", "passage", "setup", "context"]));
    const question = str(pick(e, ["question", "prompt"]));
    const solution = str(pick(e, ["solution", "working", "explanation", "why"]));
    if (!Number.isFinite(answer) || !scenario || !question || !solution) return null;
    const unit = str(pick(e, ["unit", "units"]));
    const drill: NumericExercise = {
      kind: "numeric",
      question,
      scenario,
      answer,
      tolerance: Number.isFinite(tolerance) && tolerance > 0 ? tolerance : Math.abs(answer) * 0.1,
      ...(unit ? { unit } : {}),
      solution,
    };
    return drill;
  }

  if (kind === "slider" || kind === "update" || kind === "update_slider") {
    const claim = str(pick(e, ["claim", "statement", "passage"]));
    const evidence = str(pick(e, ["evidence", "newEvidence", "new_evidence", "update"]));
    const dirRaw = str(pick(e, ["direction", "move"])).toLowerCase();
    const sizeRaw = pick(e, ["size", "amount", "points"]);
    const size = typeof sizeRaw === "number" ? sizeRaw : Number(sizeRaw);
    if (!claim || !evidence || (dirRaw !== "up" && dirRaw !== "down")) return null;
    const drill: SliderExercise = {
      kind: "slider",
      claim,
      evidence,
      direction: dirRaw,
      size: Number.isFinite(size) ? Math.min(Math.max(size, 5), 45) : 15,
      explanation: explanation || "Move in proportion to how hard that evidence is to fake.",
    };
    return drill;
  }

  if (kind === "chart" || kind === "chart_read" || kind === "graph") {
    const series = asArray(pick(e, ["series", "data", "points", "bars"]))
      .map((raw2) => {
        const point = asObject(raw2);
        const label = str(pick(point, ["label", "name", "x"]));
        const valueRaw = pick(point, ["value", "y", "amount"]);
        const value = typeof valueRaw === "number" ? valueRaw : Number(valueRaw);
        if (!label || !Number.isFinite(value)) return null;
        return { label, value };
      })
      .filter((p): p is { label: string; value: number } => p !== null)
      .slice(0, 6);
    const set = choiceSet(e, 4);
    const question = str(pick(e, ["question", "prompt", "instruction"]));
    if (series.length < 3 || !set || !question) return null;
    const values = series.map((p) => p.value);
    const yMinRaw = pick(e, ["yMin", "y_min", "axisMin"]);
    const yMaxRaw = pick(e, ["yMax", "y_max", "axisMax"]);
    const yMin = typeof yMinRaw === "number" ? yMinRaw : Math.min(...values);
    const yMax = typeof yMaxRaw === "number" ? yMaxRaw : Math.max(...values);
    const drill: ChartExercise = {
      kind: "chart",
      question,
      title: str(pick(e, ["title", "heading", "caption"]), "The chart"),
      series,
      yMin,
      yMax: yMax > yMin ? yMax : yMin + 1,
      options: set.options,
      correct: set.correct,
      explanation: explanation || "The axis is doing the work, not the data.",
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
  // The whole plan (4–5 different drills) or nothing: a lesson with a drill missing is not cached.
  if (!body || !exercisesMatchPlan(exercises, meta.drills)) return null;

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
