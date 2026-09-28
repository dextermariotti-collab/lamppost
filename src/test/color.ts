/**
 * Just enough colour maths to check WCAG contrast on the design tokens in
 * src/styles.css: oklch()/hex parsing, sRGB conversion, alpha compositing and
 * the WCAG 2.x contrast ratio.
 */

export type Rgb = { r: number; g: number; b: number; a: number };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const toSrgb = (linear: number) =>
  linear <= 0.0031308 ? 12.92 * linear : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;

export function oklchToRgb(L: number, C: number, hDeg: number, a = 1): Rgb {
  const h = (hDeg * Math.PI) / 180;
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  return {
    r: clamp01(toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    g: clamp01(toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    b: clamp01(toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
    a,
  };
}

/** Parses `oklch(L C h [/ alpha])` (L as a number or %) and #rgb/#rrggbb. */
export function parseColor(value: string): Rgb {
  const v = value.trim();
  const ok =
    /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/.exec(v);
  if (ok) {
    const L = Number(ok[1]) / (ok[2] ? 100 : 1);
    const alpha = ok[5] === undefined ? 1 : Number(ok[5]) / (ok[6] ? 100 : 1);
    return oklchToRgb(L, Number(ok[3]), Number(ok[4]), alpha);
  }
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (hex) {
    const raw = hex[1]!.length === 3 ? [...hex[1]!].map((c) => c + c).join("") : hex[1]!;
    const n = parseInt(raw, 16);
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 };
  }
  throw new Error(`Unsupported colour: ${value}`);
}

/** Lays `top` over an opaque `bottom`. */
export function over(top: Rgb, bottom: Rgb): Rgb {
  return {
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  };
}

const channel = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const luminance = (c: Rgb) => 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);

export function contrast(foreground: Rgb, background: Rgb): number {
  const fg = foreground.a < 1 ? over(foreground, background) : foreground;
  const [hi, lo] = [luminance(fg), luminance(background)].sort((a, b) => b - a) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Reads the custom properties declared in the first `selector { ... }` block of a stylesheet. */
export function readTokens(css: string, selector: string): Record<string, string> {
  const start = css.search(
    new RegExp(`(^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`),
  );
  if (start < 0) throw new Error(`No ${selector} block`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("\n}", open);
  const tokens: Record<string, string> = {};
  for (const match of css.slice(open + 1, close).matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[match[1]!] = match[2]!.trim();
  }
  return tokens;
}
