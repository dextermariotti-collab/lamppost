import type { Exercise } from "./exercises";

/**
 * Structural rules every drill must satisfy, checked deterministically before any
 * AI reviewer is asked. The reviewer is good at judgment ("is this really the best
 * answer?") and poor at arithmetic ("are there three different options?"), and a
 * drill that fails a rule here is not worth a review call.
 *
 * The rules are deliberately conservative: each one describes something that is
 * broken whatever the topic, never a matter of taste, so a good drill is not
 * thrown away. `exerciseProblems` returns what is wrong, empty when the drill is fine.
 */

const norm = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const distinct = (texts: string[]) => new Set(texts.map(norm)).size === texts.length;
const punctuationOnly = (token: string) => /^[\p{P}\p{S}\s]+$/u.test(token);

/** Phrases that carry the reasoning inside an option instead of leaving it to the explanation. */
const JUSTIFYING =
  /\b(because|since|which shows|which proves|this shows|this proves|as a result)\b/i;

/** Longest a single option or item may be, in characters. */
const MAX_OPTION_CHARS = 240;

function choiceProblems(options: string[], correct: number): string[] {
  const problems: string[] = [];
  if (options.length < 3) problems.push("needs at least three options");
  if (options.length > 4) problems.push("has more than four options");
  if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) {
    problems.push("the keyed option is not one of the options");
    return problems;
  }
  if (options.some((option) => !option.trim())) problems.push("has an empty option");
  if (options.some((option) => option.length > MAX_OPTION_CHARS)) {
    problems.push("has an option that is too long to read at a glance");
  }
  if (!distinct(options)) problems.push("two options are the same");

  const others = options.filter((_, i) => i !== correct);
  const keyed = options[correct]!;

  // The answer can be read off the wording rather than worked out.
  if (JUSTIFYING.test(keyed) && others.every((option) => !JUSTIFYING.test(option))) {
    problems.push("only the keyed option carries its own justification");
  }
  const keyedWords = words(keyed);
  const otherAverage = others.reduce((sum, option) => sum + words(option), 0) / others.length;
  if (
    keyedWords >= otherAverage * 1.75 &&
    keyedWords - otherAverage >= 5 &&
    others.every((option) => keyedWords > words(option))
  ) {
    problems.push("the keyed option is much longer than the others");
  }
  return problems;
}

const needsText = (label: string, text: string, min = 1) =>
  text.trim().length >= min ? [] : [`${label} is missing`];

function itemProblems(items: { text: string }[], label: string, min: number, max: number) {
  const problems: string[] = [];
  if (items.length < min || items.length > max) {
    problems.push(`needs ${min}-${max} ${label}, has ${items.length}`);
  }
  if (items.some((item) => !item.text.trim()))
    problems.push(`has an empty ${label.replace(/s$/, "")}`);
  if (items.some((item) => item.text.length > MAX_OPTION_CHARS)) {
    problems.push(`has a ${label.replace(/s$/, "")} that is too long`);
  }
  if (!distinct(items.map((item) => item.text))) {
    problems.push(`two ${label} are the same`);
  }
  return problems;
}

export function exerciseProblems(exercise: Exercise): string[] {
  switch (exercise.kind) {
    case "claim":
      return [
        ...needsText("the passage", exercise.passage, 20),
        ...choiceProblems(exercise.options, exercise.correct),
      ];
    case "flaw":
      return [
        ...needsText("the argument", exercise.claim, 20),
        ...choiceProblems(exercise.options, exercise.correct),
      ];
    case "assumption":
      return [
        ...needsText("the argument", exercise.argument, 20),
        ...choiceProblems(exercise.options, exercise.correct),
      ];
    case "steelman":
      return [
        ...needsText("the view", exercise.view, 15),
        ...choiceProblems(exercise.options, exercise.correct),
      ];
    case "predict":
      return [
        ...needsText("the scenario", exercise.scenario, 20),
        ...needsText("the question", exercise.question),
        ...choiceProblems(exercise.options, exercise.correct),
      ];
    case "judge":
      return [
        ...needsText("the question", exercise.question),
        ...needsText("the passage", exercise.passage, 20),
        ...choiceProblems(exercise.options, exercise.correct),
      ];
    case "rewrite": {
      const problems = [
        ...needsText("the question", exercise.question),
        ...needsText("the original", exercise.original, 8),
        ...choiceProblems(exercise.options, exercise.correct),
      ];
      // An option that repeats the original can't be "the fix".
      if (exercise.options.some((option) => norm(option) === norm(exercise.original))) {
        problems.push("an option is the original unchanged");
      }
      return problems;
    }
    case "rank": {
      return [
        ...needsText("the claim", exercise.claim, 8),
        ...itemProblems(exercise.items, "items", 3, 4),
      ];
    }
    case "order": {
      return [
        ...needsText("the question", exercise.question),
        ...itemProblems(exercise.items, "cards", 3, 4),
      ];
    }
    case "sort": {
      const problems = itemProblems(exercise.statements, "statements", 3, 5);
      if (new Set(exercise.statements.map((s) => s.bucket)).size < 2) {
        problems.push("every statement is in the same bucket");
      }
      return problems;
    }
    case "highlight": {
      const { tokens, targets } = exercise;
      const problems = needsText("the instruction", exercise.question);
      if (tokens.length < 8 || tokens.length > 60) {
        problems.push(`needs 8-60 tokens, has ${tokens.length}`);
      }
      if (tokens.some((token) => !token.trim())) problems.push("has an empty token");
      if (targets.length === 0) problems.push("nothing is marked to be tapped");
      if (new Set(targets).size !== targets.length) problems.push("a target is listed twice");
      if (targets.some((t) => !Number.isInteger(t) || t < 0 || t >= tokens.length)) {
        problems.push("a target is not one of the tokens");
      }
      if (targets.length > Math.max(1, Math.floor(tokens.length / 3))) {
        problems.push("too many tokens are marked, so tapping everything would nearly pass");
      }
      if (targets.some((t) => tokens[t] !== undefined && punctuationOnly(tokens[t]!))) {
        problems.push("a target is only punctuation");
      }
      return problems;
    }
    case "numeric": {
      const problems = [
        ...needsText("the question", exercise.question),
        ...needsText("the scenario", exercise.scenario, 20),
        ...needsText("the worked solution", exercise.solution, 10),
      ];
      if (!Number.isFinite(exercise.answer)) problems.push("the answer is not a number");
      if (!Number.isFinite(exercise.tolerance) || exercise.tolerance <= 0) {
        problems.push("the tolerance must be above zero");
      } else if (exercise.tolerance > Math.max(Math.abs(exercise.answer) * 0.35, 0.5)) {
        problems.push("the tolerance is so wide that a poor estimate passes");
      }
      if (!/\d/.test(exercise.scenario))
        problems.push("the scenario gives no numbers to work from");
      if ((exercise.unit ?? "").length > 12) problems.push("the unit is too long");
      return problems;
    }
    case "slider": {
      const problems = [
        ...needsText("the claim", exercise.claim, 8),
        ...needsText("the new evidence", exercise.evidence, 8),
      ];
      if (norm(exercise.claim) === norm(exercise.evidence)) {
        problems.push("the evidence repeats the claim");
      }
      if (exercise.direction !== "up" && exercise.direction !== "down") {
        problems.push("the direction is neither up nor down");
      }
      if (!Number.isFinite(exercise.size) || exercise.size < 5 || exercise.size > 45) {
        problems.push("the size of the move is outside 5-45 points");
      }
      return problems;
    }
    case "chart": {
      const { series, yMin, yMax } = exercise;
      const problems = [
        ...needsText("the question", exercise.question),
        ...choiceProblems(exercise.options, exercise.correct),
      ];
      if (series.length < 3 || series.length > 8) {
        problems.push(`needs 3-8 data points, has ${series.length}`);
      }
      if (series.some((point) => !point.label.trim() || point.label.length > 14)) {
        problems.push("a data point has no label or a label too long to fit");
      }
      if (!distinct(series.map((point) => point.label)))
        problems.push("two data points share a label");
      if (series.some((point) => !Number.isFinite(point.value))) {
        problems.push("a data point is not a number");
      }
      if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || yMax <= yMin) {
        problems.push("the axis window is empty");
      } else if (!series.some((point) => point.value >= yMin && point.value <= yMax)) {
        problems.push("no data point falls inside the axis window");
      }
      if (new Set(series.map((point) => point.value)).size < 2) {
        problems.push("every data point has the same value, so there is nothing to read");
      }
      return problems;
    }
  }
}
