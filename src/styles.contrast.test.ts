import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { unitAccent } from "./lib/unit-accent";
import { contrast, over, parseColor, readTokens, type Rgb } from "@/test/color";

/**
 * WCAG 2.x AA on the design tokens: 4.5:1 for text, 3:1 for icons, outlines and
 * other graphics. Every screen shares one light and one dark set of tokens (`.dark`
 * sits on <html>).
 */
const css = readFileSync("src/styles.css", "utf8");
const root = readTokens(css, ":root");
const dark = readTokens(css, ".dark");

type Theme = { name: string; tokens: Record<string, string> };
const themes: Theme[] = [
  { name: "light", tokens: root },
  { name: "dark", tokens: { ...root, ...dark } },
];

const colorOf = (tokens: Record<string, string>, name: string, over_?: Rgb): Rgb => {
  const value = tokens[name];
  if (!value) throw new Error(`--${name} is not defined`);
  const parsed = parseColor(value);
  return over_ && parsed.a < 1 ? over(parsed, over_) : parsed;
};

const ratio = (tokens: Record<string, string>, fg: string, bg: string) => {
  const background = colorOf(tokens, bg);
  return contrast(colorOf(tokens, fg, background), background);
};

const TEXT = 4.5;
const GRAPHIC = 3;

describe.each(themes)("$name theme", ({ name, tokens }) => {
  it("keeps body and muted text readable on every surface", () => {
    for (const bg of ["background", "card", "muted"]) {
      expect(ratio(tokens, "foreground", bg), `foreground on ${bg}`).toBeGreaterThanOrEqual(TEXT);
      expect(
        ratio(tokens, "muted-foreground", bg),
        `muted-foreground on ${bg}`,
      ).toBeGreaterThanOrEqual(TEXT);
    }
  });

  it("keeps accent text readable on the page and on cards", () => {
    for (const fg of ["primary-text", "flame", "success", "destructive", "gem"]) {
      for (const bg of ["background", "card"]) {
        expect(ratio(tokens, fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(TEXT);
      }
    }
    expect(ratio(tokens, "accent-foreground", "accent")).toBeGreaterThanOrEqual(TEXT);
  });

  it("puts readable text on filled primary, success and destructive buttons", () => {
    for (const fill of ["primary", "success", "destructive"]) {
      expect(
        ratio(tokens, `${fill}-foreground`, fill),
        `${fill}-foreground on ${fill}`,
      ).toBeGreaterThanOrEqual(TEXT);
    }
  });

  it("draws keyboard focus in its own color, visible on every surface and beside a filled button", () => {
    expect(parseColor(tokens["ring"]!)).not.toEqual(parseColor(tokens["primary"]!));
    for (const bg of ["background", "card", "muted"]) {
      expect(ratio(tokens, "ring", bg), `ring on ${bg}`).toBeGreaterThanOrEqual(GRAPHIC);
    }
  });

  it("keeps the XP icon visible as a graphic", () => {
    expect(ratio(tokens, "xp", "background")).toBeGreaterThanOrEqual(GRAPHIC);
  });

  it(`keeps every thinking-map state legible (${name})`, () => {
    if (!tokens["graph-edge"]) return;
    expect(ratio(tokens, "graph-locked-text", "graph-locked")).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(tokens, "foreground", "card")).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(tokens, "graph-locked-border", "background")).toBeGreaterThanOrEqual(GRAPHIC);
    // Edges are drawn at 80% (lit) and 60% (into a locked skill) opacity.
    const background = colorOf(tokens, "background");
    for (const alpha of [0.8, 0.6]) {
      const edge = { ...colorOf(tokens, "graph-edge"), a: alpha };
      expect(contrast(edge, background), `edge at ${alpha}`).toBeGreaterThanOrEqual(GRAPHIC);
    }
  });
});

describe("unit lines", () => {
  const units = ["claims", "evidence", "fallacies", "biases", "arguments", "probability", "media"];

  it.each(themes)("show as lines and carry their lettering in the $name theme", ({ tokens }) => {
    for (const [i, unit] of units.entries()) {
      const accent = unitAccent(unit);
      expect(accent.line).toBe(i + 1);
      expect(accent.color).toBe(`var(--line-${i + 1})`);
      const line = `line-${i + 1}`;
      // A line is a graphic: 3:1 against the page and against a card.
      expect(ratio(tokens, line, "background"), `${unit} line on page`).toBeGreaterThanOrEqual(
        GRAPHIC,
      );
      expect(ratio(tokens, line, "card"), `${unit} line on card`).toBeGreaterThanOrEqual(GRAPHIC);
      // The number on a bullet and any label on a filled line is text.
      expect(ratio(tokens, `on-${line}`, line), `${unit} lettering`).toBeGreaterThanOrEqual(TEXT);
    }
  });

  it("keeps the sign edge and the lamp visible at night", () => {
    const night = themes[1]!.tokens;
    expect(ratio(night, "primary", "background")).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(night, "primary-foreground", "primary")).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(themes[0]!.tokens, "edge", "background")).toBeGreaterThanOrEqual(GRAPHIC);
  });
});
