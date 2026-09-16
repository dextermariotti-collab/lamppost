/**
 * Phase 2 reasoning exercises.
 *
 * A lesson is no longer "read a wall of text, then answer recall questions".
 * It is a short concept card followed by 4-6 of these drills, all generated per
 * lesson through the constrained, cached curriculum pipeline.
 */

export type ExerciseKind = "flaw" | "assumption" | "rank" | "sort" | "predict" | "steelman";

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
  | FlawExercise
  | AssumptionExercise
  | RankExercise
  | SortExercise
  | PredictExercise
  | SteelmanExercise;

/** The closing written-argument prompt, one per lesson. */
export type WrittenPrompt = { prompt: string; guidance?: string };

export const EXERCISE_LABEL: Record<ExerciseKind, string> = {
  flaw: "Spot the flaw",
  assumption: "Find the hidden assumption",
  rank: "Rank the evidence",
  sort: "Fact, opinion or value",
  predict: "Predict, then reveal",
  steelman: "Steelman it",
};

export const EXERCISE_QUESTION: Record<ExerciseKind, string> = {
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

/** Rubric returned by the written-argument grader. */
export const RUBRIC_CRITERIA = ["claim", "evidence", "reasoning", "counterargument"] as const;
export type RubricCriterion = (typeof RUBRIC_CRITERIA)[number];

export const CRITERION_LABEL: Record<RubricCriterion, string> = {
  claim: "Claim",
  evidence: "Evidence",
  reasoning: "Reasoning",
  counterargument: "Counterargument",
};

export type RubricScore = { score: number; feedback: string };

export type ArgumentGrade = {
  scores: Record<RubricCriterion, RubricScore>;
  tip: string;
  total: number;
};

/** Rubric total is 4-16; XP scales with it so quality pays, not word count. */
export const argumentXpFor = (total: number) => Math.max(20, Math.round(total * 6));

/** One-line description of a drill, used for the mascot's Socratic prompt. */
export function describeExercise(exercise: Exercise): string {
  switch (exercise.kind) {
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
      return exercise.statements
        .map((s, i) => `${s.text} → ${a[String(i)] ?? "?"}`)
        .join("; ");
    }
  }
}
