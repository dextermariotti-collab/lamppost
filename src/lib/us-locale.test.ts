import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Dates and numbers are shown the American way ("Oct 19", not "19 Oct"), to match the
 * American English the app is written in. A British locale passed to `toLocaleString`,
 * `toLocaleDateString` or `Intl` would bring the day-first order back.
 */
const ROOT = process.cwd();
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

describe("locale", () => {
  it("formats dates and numbers as en-US everywhere", () => {
    const found = walk(join(ROOT, "src"))
      .filter((file) => /\.(ts|tsx)$/.test(file) && !file.endsWith("us-locale.test.ts"))
      .flatMap((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .flatMap((line, i) =>
            /["'`]en-(GB|AU|NZ|IE)["'`]/.test(line) ? [`${relative(ROOT, file)}:${i + 1}`] : [],
          ),
      );
    expect(found).toEqual([]);
  });
});
