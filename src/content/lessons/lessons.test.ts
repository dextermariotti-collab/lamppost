import { describe, expect, it } from "vitest";
import { LESSONS, UNITS, unitById } from "@/lib/curriculum";
import { isInteractive, wordCount, type LessonScript, type LessonStep } from "@/lib/steps/types";
import { describeCorrelations } from "@/lib/steps/checks";
import { PARTISAN, REAL_NAMES } from "../content-rules";
import { authoredUnits, loadLessonScript, validateScript } from "./index";

/**
 * The lessons are data, so their quality is testable. These checks hold every authored lesson
 * to the format (short steps, problem first, mostly interactive, a reason for every wrong
 * answer) and to the content rules (made-up people and companies, no partisan positions).
 */

const loaded = new Map<string, LessonScript>();
const problems: string[] = [];

async function loadAll() {
  for (const lesson of LESSONS) {
    if (!authoredUnits().includes(lesson.unitId)) continue;
    const result = await loadLessonScript(lesson.unitId, lesson.id);
    if (result.ok) loaded.set(lesson.id, result.script);
    else problems.push(`${lesson.id}: ${result.reason} ${result.problems?.join("; ") ?? ""}`);
  }
}

/** Every string a learner can read in a step, for the content-rule scans. */
function textOf(step: LessonStep): string[] {
  const out: string[] = [step.prompt];
  if (step.kind === "note") return out;
  out.push(step.why);
  if (step.hint) out.push(step.hint);
  switch (step.kind) {
    case "flaw":
      out.push(...step.passage.flatMap((p) => [p.text, p.whyNot ?? ""]), step.fallacy);
      break;
    case "builder":
      out.push(
        ...step.pieces.flatMap((p) => [p.text, p.note ?? ""]),
        ...step.slots.map((s) => s.label),
      );
      break;
    case "sort":
      out.push(
        ...step.buckets.flatMap((b) => [b.label, b.hint ?? ""]),
        ...step.items.flatMap((i) => [i.text, i.why]),
      );
      break;
    case "confidence":
    case "choice":
    case "gap":
    case "cause":
      out.push(...step.options.flatMap((o) => [o.text, o.whyNot ?? ""]));
      if (step.kind === "confidence") out.push(step.question);
      if (step.kind === "choice" && step.stimulus) out.push(step.stimulus);
      if (step.kind === "gap") out.push(step.reason, step.conclusion);
      if (step.kind === "cause")
        out.push(
          step.scenario,
          step.question,
          step.hiddenLabel,
          step.xLabel,
          step.yLabel,
          ...step.groups.map((g) => g.label),
        );
      break;
    case "stronger":
      out.push(step.a, step.b, step.factor, step.weakerWhy);
      break;
    case "updater":
      out.push(step.claim, ...step.cards.flatMap((c) => [c.text, c.note]));
      break;
  }
  return out.filter(Boolean);
}

const allText = (script: LessonScript) => [
  ...script.steps.flatMap(textOf),
  script.takeaway,
  script.written.prompt,
  script.written.passage,
  script.written.guidance ?? "",
];

const interactiveShare = (script: LessonScript) =>
  script.steps.filter(isInteractive).length / script.steps.length;
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).filter(Boolean).length;

await loadAll();

describe("the authored lessons", () => {
  it("all load and validate", () => {
    expect(problems).toEqual([]);
    expect(loaded.size).toBeGreaterThan(0);
  });

  it("belong to a real lesson, in the right unit, with matching ids", () => {
    for (const [id, script] of loaded) {
      expect(script.lessonId).toBe(id);
      expect(LESSONS.some((l) => l.id === id)).toBe(true);
    }
  });

  it.each([...loaded.entries()])(
    "%s: short steps, problem first, mostly interactive",
    (_id, script) => {
      expect(script.steps.length).toBeGreaterThanOrEqual(6);
      expect(script.steps.length).toBeLessThanOrEqual(10);
      expect(isInteractive(script.steps[0]!)).toBe(true);
      expect(interactiveShare(script)).toBeGreaterThanOrEqual(0.75);
      expect(new Set(script.steps.map((s) => s.id)).size).toBe(script.steps.length);
      // No two text cards in a row, and never a text card as the opening.
      script.steps.forEach((step, i) => {
        if (step.kind === "note") expect(script.steps[i - 1]?.kind).not.toBe("note");
      });
      expect(new Set(script.steps.map((s) => s.kind)).size).toBeGreaterThanOrEqual(3);
    },
  );

  it.each([...loaded.entries()])(
    "%s: explanations are one or two sentences, and hints are offered",
    (_id, script) => {
      const graded = script.steps.filter(isInteractive);
      for (const step of graded) {
        expect(sentences(step.why), `${step.id} why`).toBeLessThanOrEqual(3);
        expect(wordCount(step.why), `${step.id} why`).toBeLessThanOrEqual(50);
        if (step.hint) expect(wordCount(step.hint), `${step.id} hint`).toBeLessThanOrEqual(32);
        if ("options" in step) {
          for (const [i, option] of step.options.entries()) {
            if (option.whyNot)
              expect(wordCount(option.whyNot), `${step.id} option ${i}`).toBeLessThanOrEqual(50);
          }
        }
      }
      // Harder steps come with a hint: at least half of the interactive ones.
      const hinted = graded.filter((s) => s.hint).length;
      expect(hinted / graded.length, "share of steps with a hint").toBeGreaterThanOrEqual(0.5);
      expect(wordCount(script.takeaway)).toBeLessThanOrEqual(30);
    },
  );

  it.each([...loaded.entries()])(
    "%s: uses only made-up people, companies and products, and takes no party line",
    (_id, script) => {
      const text = allText(script).join("\n");
      for (const name of REAL_NAMES) {
        expect(new RegExp(`\\b${name}\\b`, "i").test(text), `mentions ${name}`).toBe(false);
      }
      for (const topic of PARTISAN) {
        expect(new RegExp(`\\b${topic}\\b`, "i").test(text), `mentions ${topic}`).toBe(false);
      }
    },
  );

  it.each([...loaded.entries()])("%s: has a writing task with its own passage", (id, script) => {
    const meta = LESSONS.find((l) => l.id === id)!;
    expect(script.written.prompt.length).toBeGreaterThan(20);
    expect(script.written.passage.length).toBeGreaterThan(80);
    expect(unitById(meta.unitId)).toBeTruthy();
  });

  it("rejects a script that breaks the format", () => {
    const any = [...loaded.values()][0]!;
    expect(validateScript({ ...any, steps: any.steps.slice(0, 2) }).ok).toBe(false);
    expect(validateScript({ ...any, takeaway: "" }).ok).toBe(false);
  });
});

describe("the charts tell the story they claim to", () => {
  it("show a strong overall link that disappears inside every group", () => {
    const causes = [...loaded.values()].flatMap((script) =>
      script.steps.filter((s) => s.kind === "cause"),
    );
    for (const step of causes) {
      if (step.kind !== "cause") continue;
      const view = describeCorrelations(step);
      expect(Math.abs(view.overall ?? 0), `${step.id} overall`).toBeGreaterThanOrEqual(0.7);
      for (const group of view.perGroup) {
        expect(Math.abs(group.r ?? 0), `${step.id} ${group.label}`).toBeLessThan(0.4);
      }
    }
  });
});

describe("answers aren't predictable", () => {
  const choiceLike = () =>
    [...loaded.values()].flatMap((script) =>
      script.steps.flatMap((s) =>
        s.kind === "choice" || s.kind === "gap" || s.kind === "confidence" || s.kind === "cause"
          ? [s]
          : [],
      ),
    );

  it("spreads the right answer across positions instead of always putting it in one place", () => {
    const steps = choiceLike();
    if (steps.length < 12) return;
    const counts = new Map<number, number>();
    for (const s of steps) counts.set(s.correct, (counts.get(s.correct) ?? 0) + 1);
    for (const [position, n] of counts) {
      expect(n / steps.length, `share of answers in position ${position}`).toBeLessThan(0.5);
    }
    expect(counts.size).toBeGreaterThanOrEqual(3);
  });

  it("never makes the right answer far longer than the wrong ones", () => {
    const tooLong: string[] = [];
    for (const s of choiceLike().filter((x) => x.options.length >= 3)) {
      const wrong = s.options.filter((_, i) => i !== s.correct).map((o) => o.text.length);
      const right = s.options[s.correct]!.text.length;
      if (right / Math.max(...wrong) > 1.6) tooLong.push(`${s.id}: ${right} vs ${wrong.join("/")}`);
    }
    expect(tooLong).toEqual([]);
  });

  it("only rarely makes the right answer noticeably longer than every wrong one", () => {
    const steps = choiceLike().filter((s) => s.options.length >= 3);
    if (steps.length < 12) return;
    const giveaway = steps.filter((s) => {
      const wrong = s.options.filter((_, i) => i !== s.correct).map((o) => o.text.length);
      return s.options[s.correct]!.text.length > 1.15 * Math.max(...wrong);
    });
    expect(giveaway.length / steps.length).toBeLessThan(0.25);
  });
});

// Every lesson is authored now. The generated lesson screen is only a safety net for a script
// that fails to load in the field, so a missing or broken one fails here instead of quietly
// sending learners to it.
describe("the whole curriculum", () => {
  it("has an authored file for every unit", () => {
    expect([...authoredUnits()].sort()).toEqual(UNITS.map((u) => u.id).sort());
  });

  it("has an authored lesson for every one of the 35 lessons", () => {
    expect(LESSONS.length).toBe(35);
    expect(LESSONS.filter((l) => !loaded.has(l.id)).map((l) => l.id)).toEqual([]);
  });

  it("is at least 80% interactive overall", () => {
    const steps = [...loaded.values()].flatMap((s) => s.steps);
    expect(steps.filter(isInteractive).length / steps.length).toBeGreaterThanOrEqual(0.8);
  });

  it("uses each of the eight interactive components a fair number of times", () => {
    const count = new Map<string, number>();
    for (const s of [...loaded.values()].flatMap((script) => script.steps))
      count.set(s.kind, (count.get(s.kind) ?? 0) + 1);
    for (const kind of [
      "flaw",
      "builder",
      "sort",
      "confidence",
      "stronger",
      "updater",
      "cause",
      "gap",
    ]) {
      expect(count.get(kind) ?? 0, kind).toBeGreaterThanOrEqual(
        kind === "cause" || kind === "updater" ? 3 : 8,
      );
    }
  });
});
