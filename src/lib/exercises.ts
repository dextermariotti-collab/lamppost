/**
 * Phase 2 reasoning exercises.
 *
 * A lesson is no longer "read a wall of text, then answer recall questions".
 * It is a short concept card followed by 4-6 of these drills, all generated per
 * lesson through the constrained, cached curriculum pipeline.
 */

export type ExerciseKind =
  "claim" | "flaw" | "assumption" | "rank" | "sort" | "predict" | "steelman";

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

export type Exercise =
  | ClaimExercise
  | FlawExercise
  | AssumptionExercise
  | RankExercise
  | SortExercise
  | PredictExercise
  | SteelmanExercise;

/** The closing written-argument prompt, one per lesson. */
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
};

export const EXERCISE_QUESTION: Record<ExerciseKind, string> = {
  claim: "Which sentence is the central claim?",
  flaw: "What's wrong with this reasoning?",
  assumption: "Which assumption does this argument need?",
  sort: "Sort each statement.",
  rank: "Order the evidence, strongest first.",
  predict: "Call it before you see the answer.",
  steelman: "Which is the strongest version of this view?",
};

/** XP paid per exercise, scaled by how much of it the learner got right. */
export const EXERCISE_XP = 25;

export const exerciseXpFor = (score: number) =>
  Math.max(5, Math.round(EXERCISE_XP * Math.min(Math.max(score, 0), 1)));

/* ------------------------- written closing tasks ------------------------- */

/**
 * Three written tasks, each with its own placeholder and its own rubric. The
 * lesson's drill plan picks one, so a one-sentence restatement is never graded
 * on counterarguments it was never asked for.
 */
export type WrittenTaskType = "restate" | "case" | "critique";

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
  }
}

/** Human-readable version of what the learner picked, for the Socratic prompt. */
export function describeAnswer(exercise: Exercise, answer: unknown): string {
  switch (exercise.kind) {
    case "claim":
    case "flaw":
    case "assumption":
    case "steelman":
      return typeof answer === "number" ? (exercise.options[answer] ?? "") : "";
    case "predict": {
      const a = answer as { choice?: number; confidence?: number } | undefined;
      return a && typeof a.choice === "number"
        ? `${exercise.options[a.choice] ?? ""} (${a.confidence ?? 50}% confident)`
        : "";
    }
    case "rank":
      return Array.isArray(answer) ? (answer as string[]).join(" > ") : "";
    case "sort": {
      const a = (answer ?? {}) as Record<string, string>;
      return exercise.statements.map((s, i) => `${s.text} → ${a[String(i)] ?? "?"}`).join("; ");
    }
  }
}
