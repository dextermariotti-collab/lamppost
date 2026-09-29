import { describe, expect, it } from "vitest";
import { formatWithUnit, parseNumericAnswer } from "./numeric-answer";

describe("parseNumericAnswer", () => {
  it.each([
    ["100", 100],
    ["  42  ", 42],
    ["1,000", 1000],
    ["1,234,567", 1234567],
    ["£1,200", 1200],
    ["10%", 10],
    ["100 people", 100],
    ["about 15", 15],
    ["-5", -5],
    ["3.75", 3.75],
    [".5", 0.5],
    ["0", 0],
    ["1,000.50", 1000.5],
  ])("reads %j as %d", (text, value) => {
    expect(parseNumericAnswer(text)).toBe(value);
  });

  it.each([
    "",
    "   ",
    "-",
    ".",
    "a hundred",
    "between 90 and 110",
    "2 or 3",
    "1e3",
    "1-2",
    "1,5",
    "12 34",
  ])("does not guess at %j", (text) => {
    expect(parseNumericAnswer(text)).toBeNull();
  });
});

describe("formatWithUnit", () => {
  it("puts the unit where people write it", () => {
    expect(formatWithUnit(100, "people")).toBe("100 people");
    expect(formatWithUnit(12.5, "%")).toBe("12.5%");
    expect(formatWithUnit(1200, "£")).toBe("£1,200");
    expect(formatWithUnit(7, "")).toBe("7");
    expect(formatWithUnit(7)).toBe("7");
  });

  it("rounds long decimals and groups thousands", () => {
    expect(formatWithUnit(1 / 3, "%")).toBe("0.33%");
    expect(formatWithUnit(1000000, "people")).toBe("1,000,000 people");
  });
});
