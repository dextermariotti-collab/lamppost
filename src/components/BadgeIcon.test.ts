import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TIER_STYLE } from "./BadgeIcon";

const css = readFileSync(join(process.cwd(), "src", "styles.css"), "utf8");
const block = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  return css.slice(start, css.indexOf("}", start));
};
const token = (selector: string, name: string) => {
  const match = block(selector).match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!match) throw new Error(`no --${name} in ${selector}`);
  return match[1]!;
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const luminance = (c: number[]) => {
  const [r, g, b] = c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
const over = (top: number[], bottom: number[], alpha: number) =>
  top.map((v, i) => v * alpha + bottom[i]! * (1 - alpha));

const THEMES = { light: ":root", dark: ".dark" } as const;

describe("badge tier colors", () => {
  for (const [tier, style] of Object.entries(TIER_STYLE)) {
    for (const [theme, selector] of Object.entries(THEMES)) {
      it(`keeps ${tier} readable (4.5:1) in the ${theme} theme`, () => {
        const metal = rgb(style[theme as keyof typeof THEMES]);
        for (const surface of ["card", "background"]) {
          const page = rgb(token(selector, surface));
          expect(contrast(metal, page), `${tier} on ${surface}`).toBeGreaterThanOrEqual(4.5);
          expect(
            contrast(metal, over(metal, page, 0.15)),
            `${tier} on its tint`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      });
    }

    it(`draws ${tier} with the colors it was checked with`, () => {
      expect(style.className).toContain(`text-[${style.light}]`);
      expect(style.className).toContain(`dark:text-[${style.dark}]`);
      expect(style.className).toContain(`bg-[${style.light}]/15`);
      expect(style.className).toContain(`dark:bg-[${style.dark}]/15`);
    });
  }
});
