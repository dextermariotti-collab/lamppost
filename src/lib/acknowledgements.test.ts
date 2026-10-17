import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FONTS, PACKAGES, PERMISSIVE, groupByLicence } from "./acknowledgements";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string> };

describe("the acknowledgements", () => {
  it("list every package the app ships with (run `npm run licenses` after adding one)", () => {
    const listed = new Set(PACKAGES.map((p) => p.name));
    const missing = Object.keys(pkg.dependencies).filter((name) => !listed.has(name));
    expect(missing).toEqual([]);
    const extra = PACKAGES.map((p) => p.name).filter((name) => !(name in pkg.dependencies));
    expect(extra).toEqual([]);
  });

  it("give each one a version and a license", () => {
    for (const p of PACKAGES) {
      expect(p.version, p.name).toMatch(/^\d/);
      expect(p.license, p.name).not.toMatch(/^(UNKNOWN|UNLICENSED|)$/);
    }
  });

  it("are all under permissive licenses, so nothing needs a lawyer's eye by surprise", () => {
    const unusual = PACKAGES.filter((p) => !PERMISSIVE.has(p.license)).map(
      (p) => `${p.name}: ${p.license}`,
    );
    expect(unusual).toEqual([]);
  });

  it("group cleanly by license", () => {
    const groups = groupByLicence();
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(PACKAGES.length);
    expect(groups[0]!.items.length).toBeGreaterThanOrEqual(groups.at(-1)!.items.length);
  });

  it("name every typeface the app loads", () => {
    // The fonts are bundled from @fontsource packages; each one's CSS names its family.
    const styles = read("src/styles.css");
    const imports = [...styles.matchAll(/@import "(@fontsource\/[^"]+)"/g)].map((m) => m[1]!);
    const families = [
      ...new Set(
        imports.map((path) => /font-family: '([^']+)'/.exec(read(`node_modules/${path}`))![1]!),
      ),
    ];
    expect(families).toEqual(["Overpass", "Overpass Mono"]);
    const listed = new Set<string>(FONTS.map((f) => f.name));
    expect(families.filter((f) => !listed.has(f))).toEqual([]);
  });
});
