import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { unitAccent } from "./lib/unit-accent";
import { contrast, over, parseColor, readTokens, type Rgb } from "@/test/color";

/**
 * WCAG 2.x AA on the design tokens: 4.5:1 for text, 3:1 for icons, outlines and
 * other graphics. The cascade is reproduced as the browser applies it: `.dark`
 * sits on <html>, `.graph-home` on the Home screen's own element, so the
 * Home screen's light tokens win over `.dark` unless `.dark .graph-home` says
 * otherwise.
 */
const css = readFileSync("src/styles.css", "utf8");
const root = readTokens(css, ":root");
const dark = readTokens(css, ".dark");
const home = readTokens(css, ".graph-home");
const darkHome = readTokens(css, ".dark .graph-home");

type Theme = { name: string; tokens: Record<string, string> };
const themes: Theme[] = [
  { name: "light", tokens: root },
  { name: "dark", tokens: { ...root, ...dark } },
  { name: "light Home", tokens: { ...root, ...home } },
  { name: "dark Home", tokens: { ...root, ...dark, ...home, ...darkHome } },
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

describe("unit accents", () => {
  const accentL = { light: root["unit-accent-l"], dark: dark["unit-accent-l"] };

  it.each(["light", "dark"] as const)("read as text and as filled buttons in %s mode", (mode) => {
    const tokens = mode === "light" ? root : { ...root, ...dark };
    const lightness = accentL[mode];
    expect(lightness, "--unit-accent-l").toBeDefined();
    for (const unit of [
      "claims",
      "evidence",
      "fallacies",
      "biases",
      "arguments",
      "probability",
      "media",
    ]) {
      const source = unitAccent(unit).color.replace("var(--unit-accent-l)", lightness!);
      const accent = parseColor(source);
      const background = colorOf(tokens, "background");
      expect(contrast(accent, background), `${unit} text on page`).toBeGreaterThanOrEqual(TEXT);
      expect(contrast(background, accent), `${unit} button label`).toBeGreaterThanOrEqual(TEXT);
    }
  });
});
