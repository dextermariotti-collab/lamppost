// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { LESSONS } from "./curriculum";
import { calibration } from "./mastery";
import { calibrationLine, calibrationSummary } from "./progress-view";

const lesson = LESSONS[19]!.id;
const save = (answers: { answer: unknown; score: number }[]) =>
  window.localStorage.setItem(
    "lamppost-exercises-v1",
    JSON.stringify(
      Object.fromEntries(answers.map((a, i) => [`${lesson}#${100 + i}`, { ...a, at: 1 }])),
    ),
  );
const line = () => {
  const summary = calibrationSummary(calibration().bands);
  return summary ? calibrationLine(summary) : null;
};

beforeEach(() => window.localStorage.clear());

describe("calibration", () => {
  it("reports the 60% a learner locked in, not the 50% middle of its band, and no verdict from one", () => {
    save([{ answer: { choice: 1, confidence: 60 }, score: 1 }]);
    expect(calibration().bands).toEqual([
      { label: "41–60%", stated: 50, said: 60, actual: 100, count: 1 },
    ]);
    expect(line()).toContain("you said 60% sure");
    expect(line()).not.toMatch(/50%|underconfident|overconfident/);
  });

  it("averages every percentage given, across bands", () => {
    save([
      { answer: { choice: 0, confidence: 45 }, score: 1 },
      { answer: { choice: 0, confidence: 60 }, score: 0 },
      { answer: { choice: 0, confidence: 85 }, score: 1 },
      { answer: { choice: 0, confidence: 95 }, score: 1 },
      { answer: { choice: 0, confidence: 70 }, score: 0 },
    ]);
    const summary = calibrationSummary(calibration().bands)!;
    expect(summary).toMatchObject({ count: 5, stated: 71, actual: 60, verdict: "over" });
  });

  it("loads a save from earlier versions: predict drills, steps without a confidence, odd values", () => {
    save([
      { answer: { choice: 2, confidence: 80 }, score: 1 }, // a predict drill
      { answer: 1, score: 1 }, // a choice drill: no confidence
      { answer: { placement: { c: "pc" } }, score: 1 }, // a builder step
      { answer: null, score: 0 },
      { answer: { confidence: "60" }, score: 1 }, // not a number: left out
    ]);
    expect(calibration()).toEqual({
      bands: [{ label: "61–80%", stated: 70, said: 80, actual: 100, count: 1 }],
      answered: 1,
    });
  });
});
