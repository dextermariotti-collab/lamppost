/**
 * Reasoning drills.
 *
 * A lesson is a workout: a short concept card followed by 4-6 drills chosen by
 * the curriculum spine for that lesson, then one written task. Every drill kind
 * here is generated per lesson through the constrained, validated, cached
 * pipeline and served from a pre-vetted pool.
 */

export const EXERCISE_KINDS = [
  // original set
  "claim",
  "flaw",
  "assumption",
  "rank",
  "sort",
  "predict",
  "steelman",
  // phase 6 set
  "judge",
  "highlight",
  "rewrite",
  "order",
  "numeric",
  "slider",
  "chart",
] as const;

export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

/** Pick the sentence that carries the passage's central claim. */
export type ClaimExercise = {
  kind: "claim";
  passage: string;
  options: string[];
  correct: number;
  explanation: string;
};

/** Read an argument, name the reasoning error it actually commits. */
export type FlawExercise = {
  kind: "flaw";
  claim: string;
  options: string[];
  correct: number;
  fallacy?: string;
  explanation: string;
};

/** Tap the statement that must be true for the argument to work. */
export type AssumptionExercise = {
  kind: "assumption";
  argument: string;
  options: string[];
  correct: number;
  explanation: string;
};

/** Order evidence cards strongest to weakest. `items` are stored in order. */
export type RankExercise = {
  kind: "rank";
  claim: string;
  items: { text: string; why: string }[];
};

export type SortBucket = "fact" | "opinion" | "value";

/** Drop statements into fact / opinion / value buckets. */
export type SortExercise = {
  kind: "sort";
  statements: { text: string; bucket: SortBucket; why: string }[];
};

/** Commit to a prediction and a confidence level before the answer appears. */
export type PredictExercise = {
  kind: "predict";
  scenario: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

/** Pick the strongest version of a weakly-stated view. */
export type SteelmanExercise = {
  kind: "steelman";
  view: string;
  options: string[];
  correct: number;
  explanation: string;
};

/**
 * The flexible reasoning judgement. Its own question is written per lesson, so
 * one shape covers "name the fallacy", "legitimate or fallacy?", "which study
 * design settles this?", "what else could explain it?", "who owes evidence?",
 * "which sample is better?", "which objection is strongest?", "what is
 * unsupported in this AI answer?" and friends.
 */
export type JudgeExercise = {
  kind: "judge";
  /** The instruction shown in place of a generic drill question. */
  question: string;
  passage: string;
  options: string[];
  correct: number;
  explanation: string;
};

/** Tap the words or phrases in a passage that do the damage. */
export type HighlightExercise = {
  kind: "highlight";
  question: string;
  /** The passage split into tappable spans, in reading order. */
  tokens: string[];
  /** Indexes into `tokens` that should be selected. */
  targets: number[];
  explanation: string;
};

/** Pick the rewrite that fixes the original — testable, defensible, faithful. */
export type RewriteExercise = {
  kind: "rewrite";
  question: string;
  original: string;
  options: string[];
  correct: number;
  explanation: string;
};

/** Order cards into the right sequence (argument structure, checking steps). */
export type OrderExercise = {
  kind: "order";
  question: string;
  /** Optional context above the cards. */
  passage?: string;
  /** Stored in the correct order. */
  items: { text: string; why: string }[];
};

/** Numeric estimate judged against a tolerance, with a worked solution. */
export type NumericExercise = {
  kind: "numeric";
  question: string;
  scenario: string;
  answer: number;
  /** Absolute tolerance in the same unit as `answer`. */
  tolerance: number;
  unit?: string;
  solution: string;
};

/** Set confidence, read new evidence, then move it the right way. */
export type SliderExercise = {
  kind: "slider";
  claim: string;
  evidence: string;
  /** Which way a good reasoner moves, and roughly how far (percentage points). */
  direction: "up" | "down";
  size: number;
  explanation: string;
};

/** A small chart rendered from data, with one deliberate trick in it. */
export type ChartExercise = {
  kind: "chart";
  question: string;
  title: string;
  series: { label: string; value: number }[];
  /** Axis window the chart is drawn with — often the trick itself. */
  yMin: number;
  yMax: number;
  options: string[];
  correct: number;
  explanation: string;
};

export type Exercise =
  | ClaimExercise
  | FlawExercise
  | AssumptionExercise
  | RankExercise
  | SortExercise
  | PredictExercise
  | SteelmanExercise
  | JudgeExercise
  | HighlightExercise
  | RewriteExercise
  | OrderExercise
  | NumericExercise
  | SliderExercise
  | ChartExercise;

/** Drills with a single keyed option index. */
export type ChoiceLikeExercise =
  | ClaimExercise
  | FlawExercise
  | AssumptionExercise
  | PredictExercise
  | SteelmanExercise
  | JudgeExercise
  | RewriteExercise
  | ChartExercise;

/**
 * The closing written task. The passage always lives in the app — the learner is
 * never sent off to find an article of their own.
 */
export type WrittenPrompt = {
  type: WrittenTaskType;
  prompt: string;
  /** The passage or scenario the task is about, shown above the box. */
  passage: string;
  guidance?: string;
};

export const EXERCISE_LABEL: Record<ExerciseKind, string> = {
  claim: "Find the claim",
  flaw: "Spot the flaw",
  assumption: "Find the hidden assumption",
  rank: "Rank the evidence",
  sort: "Fact, opinion or value",
  predict: "Predict, then reveal",
  steelman: "Steelman it",
  judge: "Make the call",
  highlight: "Tap the words",
  rewrite: "Fix the wording",
  order: "Put it in order",
  numeric: "Work out the number",
  slider: "Update your confidence",
  chart: "Read the chart",
};

export const EXERCISE_QUESTION: Record<ExerciseKind, string> = {
  claim: "Which sentence is the central claim?",
  flaw: "What's wrong with this reasoning?",
  assumption: "Which assumption does this argument need?",
  sort: "Sort each statement.",
  rank: "Order the evidence, strongest first.",
  predict: "Call it before you see the answer.",
  steelman: "Which is the strongest version of this view?",
  judge: "Make the call.",
  highlight: "Tap every word that does the damage.",
  rewrite: "Which rewrite fixes it?",
  order: "Put the cards in order.",
  numeric: "Work out the number.",
  slider: "How confident are you now?",
  chart: "What is this chart doing to you?",
};

/** The instruction actually shown — lesson-specific where the drill carries one. */
export function questionFor(exercise: Exercise): string {
  return "question" in exercise && exercise.question
    ? exercise.question
    : EXERCISE_QUESTION[exercise.kind];
}

/** XP paid per exercise, scaled by how much of it the learner got right. */
export const EXERCISE_XP = 25;

export const exerciseXpFor = (score: number) =>
  Math.max(5, Math.round(EXERCISE_XP * Math.min(Math.max(score, 0), 1)));

/* ------------------------- written closing tasks ------------------------- */

/**
 * Written tasks each carry their own placeholder and their own rubric, so a
 * one-sentence restatement is never graded on counterarguments it was never
 * asked for.
 */
export type WrittenTaskType = "restate" | "case" | "critique" | "testable" | "steelmanWrite";

export const RUBRIC_CRITERIA = [
  "precision",
  "excludes",
  "faithful",
  "claim",
  "evidence",
  "reasoning",
  "counterargument",
  "flaw",
  "matters",
  "fix",
  "specific",
  "measurable",
  "charitable",
  "strongest",
  "accurate",
] as const;
export type RubricCriterion = (typeof RUBRIC_CRITERIA)[number];

export const CRITERION_LABEL: Record<RubricCriterion, string> = {
  precision: "Precision",
  excludes: "Excludes premises",
  faithful: "Faithful to the original",
  claim: "Claim",
  evidence: "Evidence",
  reasoning: "Reasoning",
  counterargument: "Counterargument",
  flaw: "Names the flaw",
  matters: "Why it matters",
  fix: "Suggested fix",
  specific: "Specific",
  measurable: "Measurable",
  charitable: "Charitable",
  strongest: "Strongest reasons",
  accurate: "Accurate",
};

export const CRITERION_MEANING: Record<RubricCriterion, string> = {
  precision: "states the claim in one precise, unambiguous sentence",
  excludes: "leaves out premises, evidence and background detail",
  faithful: "does not change or overstate what the original actually claimed",
  claim: "states a clear, arguable claim",
  evidence: "supports it with relevant evidence or examples",
  reasoning: "connects the evidence to the claim explicitly",
  counterargument: "handles the strongest objection honestly",
  flaw: "names the specific reasoning flaw in the passage",
  matters: "explains what the flaw does to the conclusion",
  fix: "suggests a concrete repair or the evidence that would be needed",
  specific: "names who or what, in what conditions, with no weasel words left",
  measurable: "says what result would count as true and what would count as false",
  charitable: "states the other side's view as its own supporters would recognise it",
  strongest: "uses the best reasons available for that view, not the weakest ones",
  accurate: "does not smuggle in a straw version or change the position",
};

export type WrittenTask = {
  type: WrittenTaskType;
  label: string;
  /** Length instruction shown to the learner and to the grader. */
  length: string;
  placeholder: string;
  criteria: readonly RubricCriterion[];
};

export const WRITTEN_TASKS: Record<WrittenTaskType, WrittenTask> = {
  restate: {
    type: "restate",
    label: "Restate the claim",
    length: "one sentence",
    placeholder: "One sentence. Just the claim — no evidence, no background.",
    criteria: ["precision", "excludes", "faithful"],
  },
  case: {
    type: "case",
    label: "Make the case",
    length: "three to five sentences",
    placeholder:
      "Three to five sentences. Make a claim, back it, then handle the strongest objection.",
    criteria: ["claim", "evidence", "reasoning", "counterargument"],
  },
  critique: {
    type: "critique",
    label: "Critique it",
    length: "two to four sentences",
    placeholder: "Two to four sentences. Name the flaw, say why it matters, suggest a fix.",
    criteria: ["flaw", "matters", "fix"],
  },
  testable: {
    type: "testable",
    label: "Rewrite it testable",
    length: "one or two sentences",
    placeholder:
      "Rewrite the claim so it could actually be shown false. Numbers and scope welcome.",
    criteria: ["specific", "measurable", "faithful"],
  },
  steelmanWrite: {
    type: "steelmanWrite",
    label: "Steelman it",
    length: "two to four sentences",
    placeholder: "Two to four sentences. State the other side at its strongest, honestly.",
    criteria: ["charitable", "strongest", "accurate"],
  },
};

export type RubricScore = { score: number; feedback: string };

export type ArgumentGrade = {
  scores: Partial<Record<RubricCriterion, RubricScore>>;
  tip: string;
  total: number;
  /** 4 points per criterion in this task's rubric. */
  max: number;
};

/** XP scales with the score out of this rubric's actual maximum. */
export const argumentXpFor = (total: number, max: number) =>
  Math.max(15, Math.round((total / Math.max(max, 1)) * 90));

/** One-line description of a drill, used for the mascot's Socratic prompt. */
export function describeExercise(exercise: Exercise): string {
  switch (exercise.kind) {
    case "claim":
      return `Central claim of: "${exercise.passage}" (options: ${exercise.options.join(" | ")})`;
    case "flaw":
      return `Spot the flaw in: "${exercise.claim}" (options: ${exercise.options.join(" | ")})`;
    case "assumption":
      return `Hidden assumption in: "${exercise.argument}" (options: ${exercise.options.join(" | ")})`;
    case "rank":
      return `Rank evidence for: "${exercise.claim}" (${exercise.items.map((i) => i.text).join(" | ")})`;
    case "sort":
      return `Sort fact/opinion/value: ${exercise.statements.map((s) => s.text).join(" | ")}`;
    case "predict":
      return `Predict the outcome of: "${exercise.scenario}" — ${exercise.question}`;
    case "steelman":
      return `Steelman this view: "${exercise.view}" (options: ${exercise.options.join(" | ")})`;
    case "judge":
      return `${exercise.question} — "${exercise.passage}" (options: ${exercise.options.join(" | ")})`;
    case "highlight":
      return `${exercise.question} — "${exercise.tokens.join(" ")}"`;
    case "rewrite":
      return `${exercise.question} — original: "${exercise.original}" (options: ${exercise.options.join(" | ")})`;
    case "order":
      return `${exercise.question} — cards: ${exercise.items.map((i) => i.text).join(" | ")}`;
    case "numeric":
      return `${exercise.scenario} — ${exercise.question}`;
    case "slider":
      return `Confidence in "${exercise.claim}" after learning: ${exercise.evidence}`;
    case "chart":
      return `${exercise.question} — chart "${exercise.title}" (options: ${exercise.options.join(" | ")})`;
  }
}

/** Human-readable version of what the learner picked, for the Socratic prompt. */
export function describeAnswer(exercise: Exercise, answer: unknown): string {
  switch (exercise.kind) {
    case "claim":
    case "flaw":
    case "assumption":
    case "steelman":
    case "judge":
    case "rewrite":
    case "chart":
      return typeof answer === "number" ? (exercise.options[answer] ?? "") : "";
    case "predict": {
      const a = answer as { choice?: number; confidence?: number } | undefined;
      return a && typeof a.choice === "number"
        ? `${exercise.options[a.choice] ?? ""} (${a.confidence ?? 50}% confident)`
        : "";
    }
    case "rank":
      return Array.isArray(answer) ? (answer as string[]).join(" > ") : "";
    case "order":
      return Array.isArray(answer) ? (answer as string[]).join(" then ") : "";
    case "sort": {
      const a = (answer ?? {}) as Record<string, string>;
      return exercise.statements.map((s, i) => `${s.text} → ${a[String(i)] ?? "?"}`).join("; ");
    }
    case "highlight": {
      const picked = Array.isArray(answer) ? (answer as number[]) : [];
      return picked.map((i) => exercise.tokens[i] ?? "").join(", ");
    }
    case "numeric":
      return typeof answer === "number" ? String(answer) : "";
    case "slider": {
      const a = answer as { before?: number; after?: number } | undefined;
      return a ? `${a.before ?? 50}% → ${a.after ?? 50}%` : "";
    }
  }
}

/** The keyed option's own text, so feedback never says "option 1". */
export function correctText(exercise: Exercise): string | null {
  return "options" in exercise && typeof exercise.correct === "number"
    ? (exercise.options[exercise.correct] ?? null)
    : null;
}
