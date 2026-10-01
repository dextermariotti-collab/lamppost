import { describe, expect, it } from "vitest";
import { LESSONS, UNITS } from "@/lib/curriculum";
import { notesText, type LessonNotes } from "@/lib/lesson-notes";
import { wordCount } from "@/lib/steps/types";
import { contentRuleBreaks } from "../content-rules";
import { loadLessonScript } from "../lessons";
import { loadUnitNotes, notedUnits, validateNotes } from "./index";

/**
 * The notes are where a lesson's pieces are joined up, so every lesson needs them, they have to
 * fit on a page that reads in about two minutes, and they follow the same content rules as the
 * steps: made-up people and products, no party line.
 */

const all = new Map<string, LessonNotes>();
const raw = new Map<string, Record<string, unknown>>();
for (const unit of UNITS) {
  const mod = await import(`./${unit.id}.ts`).catch(() => null);
  raw.set(unit.id, (mod?.default ?? {}) as Record<string, unknown>);
  for (const [id, notes] of Object.entries(await loadUnitNotes(unit.id))) all.set(id, notes);
}

const textOf = (n: LessonNotes) => [
  n.hook,
  ...n.idea,
  ...n.terms.flatMap((t) => [t.term, t.meaning]),
  n.example.case,
  ...n.example.moves,
  ...n.subtleties.flatMap((s) => [s.title, s.body]),
  n.ask,
  n.tryIt,
];

describe("lesson notes", () => {
  it("has a file for every unit", () => {
    expect([...notedUnits()].sort()).toEqual(UNITS.map((u) => u.id).sort());
  });

  it("every unit's notes validate, with each lesson filed under its own id and unit", () => {
    for (const unit of UNITS) {
      for (const [id, notes] of Object.entries(raw.get(unit.id)!)) {
        const checked = validateNotes(notes);
        expect(checked.ok ? [] : checked.problems, id).toEqual([]);
        expect((notes as LessonNotes).lessonId, id).toBe(id);
        expect(LESSONS.find((l) => l.id === id)?.unitId, id).toBe(unit.id);
      }
    }
  });

  it("covers every one of the 35 lessons", () => {
    expect(LESSONS.filter((l) => !all.has(l.id)).map((l) => l.id)).toEqual([]);
  });

  it.each([...all.entries()])("%s: follows the content rules", (_id, notes) => {
    expect(contentRuleBreaks(textOf(notes).join("\n"))).toEqual([]);
  });

  it.each([...all.entries()])("%s: is a page, not a chapter", (_id, notes) => {
    const words = textOf(notes).reduce((sum, t) => sum + wordCount(t), 0);
    expect(words).toBeGreaterThanOrEqual(220);
    expect(words).toBeLessThanOrEqual(520);
    expect(new Set(notes.terms.map((t) => t.term.toLowerCase())).size).toBe(notes.terms.length);
  });

  it.each([...all.entries()])(
    "%s: its worked example is new, not a step the learner just did",
    async (id, notes) => {
      const meta = LESSONS.find((l) => l.id === id)!;
      const loaded = await loadLessonScript(meta.unitId, id);
      expect(loaded.ok).toBe(true);
      if (!loaded.ok) return;
      const stepText = JSON.stringify(loaded.script.steps).toLowerCase();
      // No sentence of the case is lifted from the steps.
      for (const sentence of notes.example.case.split(/(?<=[.!?])\s+/)) {
        if (wordCount(sentence) >= 6)
          expect(stepText, sentence).not.toContain(sentence.toLowerCase());
      }
    },
  );

  it("leaves room for the steps when the tutor is told what the lesson taught", () => {
    for (const [id, notes] of all) expect(notesText(notes).length, id).toBeLessThan(3500);
  });

  it("rejects notes that break the format", () => {
    const any = [...all.values()][0]!;
    expect(validateNotes({ ...any, ask: "Not a question." }).ok).toBe(false);
    expect(validateNotes({ ...any, hook: Array(40).fill("word").join(" ") }).ok).toBe(false);
    expect(validateNotes({ ...any, idea: [any.idea[0]] }).ok).toBe(false);
    expect(validateNotes({ ...any, subtleties: [] }).ok).toBe(false);
  });
});
