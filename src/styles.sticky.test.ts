import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The pinned action band (`sticky-action`) is drawn as the wrapper's own background and padding.
 * On the button itself it would fade with a disabled button, wipe out the button's own shadow or
 * edge, and its fill would spill over whatever sits next to it.
 */
const css = readFileSync(join(process.cwd(), "src", "styles.css"), "utf8");
const rule = css.match(/\n\.sticky-action \{([^}]*)\}/)?.[1] ?? "";
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

describe("sticky-action", () => {
  it("is a padded band with a background, not a shadow painted outside its box", () => {
    expect(rule).toMatch(/background:/);
    expect(rule).toMatch(/padding:/);
    expect(rule).not.toMatch(/box-shadow/);
  });

  it("never sits on a button, only on the wrapper around one", () => {
    const onButton = walk(join(process.cwd(), "src"))
      .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
      .flatMap((file) =>
        [
          ...readFileSync(file, "utf8").matchAll(
            /<Button\b[^>]*className="[^"]*\bsticky-action\b/g,
          ),
        ].map(() => file),
      );
    expect(onButton).toEqual([]);
  });
});
