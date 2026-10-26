/**
 * Drill kinds and the closing written task.
 *
 * Each lesson's drill plan (`curriculum.ts`) is a list of these kinds. Lessons are authored steps
 * now; the kinds name the review queue's items (`lessonId#kind`) and the skill each one tests, and
 * the written tasks carry the grader's rubric.
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
  charitable: "states the other side's view as its own supporters would recognize it",
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
