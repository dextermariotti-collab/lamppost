import { beforeAll, describe, expect, it } from "vitest";
import { LESSONS, UNITS } from "@/lib/curriculum";
import { DAILY_CASES } from "./cases";
import { loadLessonScript } from "./lessons";
import { loadUnitNotes } from "./notes";
import { UNIT_CHECKS } from "./unit-checks";

/**
 * The unit checks measure whether a skill carries over to something the learner hasn't seen, so
 * no question may reuse text from a lesson, its notes or a daily case. Two texts are "the same"
 * when they share a run of RUN words in a row (lowercased, punctuation dropped). Shorter runs trip
 * on stock phrases: at 6, the question stem "trying to get you to accept" matches a note; at 7,
 * explanations share "has nothing to do with whether the". At 8 nothing ordinary has matched,
 * while any reused sentence or scenario still does.
 *
 * What's compared is the question itself: its text, its prompt and its options. The explanations
 * shown afterward (why, whyNot) may echo a lesson's wording; that's teaching, not a leak.
 */
const RUN = 8;

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/['’‘]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
const runs = (text: string) => {
  const w = words(text);
  return Array.from({ length: Math.max(0, w.length - RUN + 1) }, (_, i) =>
    w.slice(i, i + RUN).join(" "),
  );
};
/** Every string inside a value, kept apart so a run never spans two of them. */
const strings = (value: unknown): string[] =>
  typeof value === "string"
    ? [value]
    : Array.isArray(value)
      ? value.flatMap(strings)
      : value && typeof value === "object"
        ? Object.values(value).flatMap(strings)
        : [];

/** Each run of RUN words a learner reads outside the checks, and the first place it appears. */
const seen = new Map<string, string>();
const unread: string[] = [];
const read = (where: string, value: unknown) => {
  for (const text of strings(value))
    for (const run of runs(text)) if (!seen.has(run)) seen.set(run, where);
};

beforeAll(async () => {
  for (const lesson of LESSONS) {
    const loaded = await loadLessonScript(lesson.unitId, lesson.id);
    if (loaded.ok) read(`lesson ${lesson.id}`, loaded.script);
    else unread.push(`lesson ${lesson.id} (${loaded.reason})`);
  }
  for (const unit of UNITS) {
    const notes = await loadUnitNotes(unit.id);
    for (const lesson of LESSONS.filter((l) => l.unitId === unit.id)) {
      if (notes[lesson.id]) read(`notes ${lesson.id}`, notes[lesson.id]);
      else unread.push(`notes ${lesson.id}`);
    }
  }
  for (const c of DAILY_CASES) read(`case ${c.id}`, c);
});

/** The first run a text shares with each place it also appears. */
const shared = (text: string) => {
  const places = new Map<string, string>();
  for (const run of runs(text)) {
    const where = seen.get(run);
    if (where && !places.has(where)) places.set(where, run);
  }
  return [...places].map(([where, run]) => `"${run}" is also in ${where}`);
};

const questions = Object.values(UNIT_CHECKS).flatMap((check) => [...check.before, ...check.after]);

describe("the unit checks are fresh", () => {
  it("are compared with every lesson and every lesson's notes", () => {
    // A lesson or notes that don't load can't be compared; their own tests say why.
    expect(unread).toEqual([]);
    expect(seen.size).toBeGreaterThan(0);
  });

  it(`share no run of ${RUN} words with a lesson, its notes or a daily case`, () => {
    const found = questions.flatMap((item) => {
      const fields: [string, string][] = [
        ["stimulus", item.stimulus ?? ""],
        ["prompt", item.prompt],
        ...item.options.map((o, i): [string, string] => [`option ${i + 1}`, o.text]),
      ];
      return fields.flatMap(([field, text]) =>
        shared(text).map((hit) => `${item.id} ${field}: ${hit}`),
      );
    });
    expect(found).toEqual([]);
  });

  it("catch a lesson's sentence reused with other capitals and punctuation", async () => {
    const loaded = await loadLessonScript(LESSONS[0]!.unitId, LESSONS[0]!.id);
    const sentence = strings(loaded.ok ? loaded.script : null).find((s) => words(s).length >= RUN);
    expect(sentence).toBeDefined();
    const reused = `Seen online -- ${sentence!.toUpperCase().replace(/[,.]/g, ";")}!`;
    expect(shared(reused)).toContainEqual(expect.stringContaining(`lesson ${LESSONS[0]!.id}`));
  });
});
