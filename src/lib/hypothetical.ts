import type { Lesson } from "./courses";
import type { Exercise } from "./exercises";

/**
 * A drill built on an invented scenario has to say so — once. Models were
 * writing "Hypothetical scenario: … In this hypothetical, … the hypothetical
 * group … (this hypothetical shows …)" so the word appeared three or four times
 * in one drill. The rule is now: the word appears exactly once, as the prefix of
 * the scenario, and nowhere else in the drill.
 *
 * The prompts ask for that, and this module enforces it deterministically on
 * whatever comes back (and on lessons that were cached before the rule existed).
 */

export const HYPOTHETICAL_PREFIX = "Hypothetical scenario: ";

const WORD = /hypothetical/gi;

/** The field that holds each drill's scenario, i.e. where the single mention goes. */
const SCENARIO_FIELD: Partial<Record<string, string>> = {
  predict: "scenario",
  numeric: "scenario",
  flaw: "claim",
  claim: "passage",
  assumption: "argument",
  steelman: "view",
  judge: "passage",
  rewrite: "original",
  order: "passage",
  slider: "claim",
  chart: "title",
  rank: "claim",
};

/** Keys whose strings are structural, or index-linked, and must never be edited. */
const UNTOUCHED = new Set(["kind", "tokens", "series", "unit", "direction"]);

const capitalize = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
const article = (word: string, wasUpper: boolean) => {
  const a = /^[aeiou]/i.test(word) ? "an" : "a";
  return wasUpper ? capitalize(a) : a;
};

/** Removes every form of "hypothetical" from a sentence without breaking it. */
export function stripHypothetical(text: string): string {
  if (!WORD.test(text)) return text;
  WORD.lastIndex = 0;
  const startedUpper = /^[A-Z]/.test(text.trim());
  let out = text;

  // "Hypothetical scenario: …" prefix.
  out = out.replace(
    /^\s*hypothetical\s+(?:scenario|case|situation|example|setup)\s*[:—–-]\s*/i,
    "",
  );

  // "In this hypothetical, …" at the start of a sentence: drop the clause.
  out = out.replace(
    /(^|[.!?]\s+)(?:in|under|within|for|given)\s+(?:this|the|that|our)\s+hypothetical(?:\s+(?:scenario|case|situation|setup|example))?\s*,\s*(\S)/gi,
    (_m, lead: string, next: string) => `${lead}${capitalize(next)}`,
  );
  // Mid-sentence ", in this hypothetical," / trailing " in this hypothetical".
  out = out.replace(
    /,\s*(?:in|under|within)\s+(?:this|the|that)\s+hypothetical(?:\s+(?:scenario|case|situation|setup|example))?\s*,\s*/gi,
    " ",
  );
  out = out.replace(
    /\s+(?:in|under|within|for)\s+(?:this|the|that)\s+hypothetical(?:\s+(?:scenario|case|situation|setup|example))?(?=\s*[.!?,;:]|\s*$)/gi,
    "",
  );

  // "the hypothetical scenario" -> "the scenario"; "a hypothetical example" -> "an example".
  out = out.replace(
    /\b(this|the|that|our)\s+hypothetical\s+(?=\w)/gi,
    (_m, det: string) => `${det} `,
  );
  out = out.replace(
    /\b(a|an)\s+hypothetical\s+(\w+)/gi,
    (_m, art: string, next: string) => `${article(next, art[0] === art[0]!.toUpperCase())} ${next}`,
  );
  // Any adjective left over, and the adverb.
  out = out.replace(/\bhypothetically\b,?\s*/gi, "");
  out = out.replace(/\bhypothetical\s+(?=\w)/gi, "");
  // A bare noun use ("implied by this hypothetical.") becomes the plain word.
  out = out.replace(/\bhypothetical\b/gi, "scenario");

  out = out
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/,\s*,/g, ",")
    .trim();
  return startedUpper ? capitalize(out) : out;
}

/** How many times "hypothetical" appears in a drill's text, counting every field. */
export function countHypothetical(value: unknown): number {
  if (typeof value === "string") return (value.match(WORD) ?? []).length;
  if (Array.isArray(value)) return value.reduce<number>((n, v) => n + countHypothetical(v), 0);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (n, v) => n + countHypothetical(v),
      0,
    );
  }
  return 0;
}

function mapStrings(value: unknown, fn: (s: string) => string, key?: string): unknown {
  if (key && UNTOUCHED.has(key)) return value;
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, mapStrings(v, fn, k)]),
    );
  }
  return value;
}

/**
 * Makes a drill say "hypothetical" once, on its scenario, or not at all if it
 * never said it. Answer keys, option order and highlight tokens are untouched.
 */
export function sayHypotheticalOnce(exercise: Exercise): Exercise {
  if (countHypothetical(exercise) === 0) return exercise;
  if (countHypothetical(exercise) === 1 && startsWithPrefix(exercise)) return exercise;

  const cleaned = mapStrings(exercise, stripHypothetical) as Record<string, unknown>;
  const field = SCENARIO_FIELD[exercise.kind];
  const current = field ? cleaned[field] : undefined;
  if (field && typeof current === "string" && current.trim()) {
    cleaned[field] = `${HYPOTHETICAL_PREFIX}${current}`;
  }
  return cleaned as unknown as Exercise;
}

function startsWithPrefix(exercise: Exercise): boolean {
  const field = SCENARIO_FIELD[exercise.kind];
  const value = field ? (exercise as unknown as Record<string, unknown>)[field] : undefined;
  return typeof value === "string" && value.startsWith(HYPOTHETICAL_PREFIX);
}

/** Applies the rule to every drill of a lesson (used on lessons cached before it existed). */
export function cleanLessonHypotheticals<T extends Lesson>(lesson: T): T {
  if (!lesson.exercises || lesson.exercises.length === 0) return lesson;
  const exercises = lesson.exercises.map(sayHypotheticalOnce);
  return exercises.every((e, i) => e === lesson.exercises![i]) ? lesson : { ...lesson, exercises };
}
