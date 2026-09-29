import { describe, expect, it } from "vitest";
import { canShowAnswer, scoreFor } from "./scoring";

const s = (wrongAttempts: number, hintUsed = false, revealed = false) =>
  scoreFor({ wrongAttempts, hintUsed, revealed });

describe("how a step is scored", () => {
  it("gives full marks for getting it first time", () => {
    expect(s(0)).toBe(1);
  });

  it("gives less for each miss", () => {
    expect(s(1)).toBe(0.5);
    expect(s(2)).toBe(0.25);
    expect(s(5)).toBe(0.25);
  });

  it("halves whatever was earned when a hint was used", () => {
    expect(s(0, true)).toBe(0.5);
    expect(s(1, true)).toBe(0.25);
    expect(s(2, true)).toBe(0.125);
  });

  it("gives nothing when the answer was shown", () => {
    expect(s(2, false, true)).toBe(0);
    expect(s(0, false, true)).toBe(0);
  });

  it("only counts as 'correct' for combos at full marks (score === 1)", () => {
    expect(s(0) === 1).toBe(true);
    expect(s(1) === 1).toBe(false);
    expect(s(0, true) === 1).toBe(false);
  });

  it("offers to show the answer after two misses, not before", () => {
    expect(canShowAnswer(0)).toBe(false);
    expect(canShowAnswer(1)).toBe(false);
    expect(canShowAnswer(2)).toBe(true);
  });
});
