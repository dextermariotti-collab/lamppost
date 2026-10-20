import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * `npm run release:bump` (scripts/release-bump.mjs), run against copies of the real native
 * project files in a temporary folder. Every run passes --root, so the real files are never
 * written; the last test checks that.
 */
const ROOT = process.cwd();
const SCRIPT = join(ROOT, "scripts", "release-bump.mjs");
const GRADLE = "android/app/build.gradle";
const PBXPROJ = "ios/App/App.xcodeproj/project.pbxproj";
const INFO_PLIST = "ios/App/App/Info.plist";
const FILES = [GRADLE, PBXPROJ, INFO_PLIST];
const real = Object.fromEntries(
  FILES.map((file) => [file, readFileSync(join(ROOT, file), "utf8")]),
);

let dir = "";
const read = (file: string) => readFileSync(join(dir, file), "utf8");
const write = (file: string, text: string) => writeFileSync(join(dir, file), text);
const edit = (file: string, from: RegExp | string, to: string) => {
  const before = read(file);
  const after = before.replace(from, to);
  expect(after, `${file} edit didn't apply`).not.toBe(before);
  write(file, after);
};

function bump(...args: string[]) {
  const env: Record<string, string | undefined> = { ...process.env };
  delete env["npm_config_dry_run"];
  const run = spawnSync(process.execPath, [SCRIPT, ...args, "--root", dir], {
    encoding: "utf8",
    env,
  });
  return { status: run.status, out: run.stdout, err: run.stderr };
}

const values = (text: string, key: string) =>
  [...text.matchAll(new RegExp(`^\\s*${key}[ =]+"?([^";\\s]+)`, "gm"))].map((m) => m[1]);

/** The lines that differ between two versions of a file (both must have the same line count). */
function changedLines(before: string, after: string) {
  const a = before.split("\n");
  const b = after.split("\n");
  expect(b).toHaveLength(a.length);
  return a.flatMap((line, i) => (line === b[i] ? [] : [`${line.trim()} → ${b[i]?.trim()}`]));
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "lamppost-release-bump-"));
  for (const file of FILES) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    copyFileSync(join(ROOT, file), join(dir, file));
  }
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("release:bump", () => {
  it("reads the real projects as they are committed", () => {
    expect(values(real[GRADLE]!, "versionCode")).toHaveLength(1);
    expect(values(real[GRADLE]!, "versionName")).toHaveLength(1);
    expect(values(real[PBXPROJ]!, "MARKETING_VERSION").length).toBeGreaterThan(0);
    expect(values(real[PBXPROJ]!, "CURRENT_PROJECT_VERSION").length).toBeGreaterThan(0);
    const { status, err } = bump("99.0.0", "--dry-run");
    expect(err).toBe("");
    expect(status).toBe(0);
  });

  it("sets the version in both projects, raises both build numbers by one, and changes nothing else", () => {
    edit(GRADLE, /versionCode \d+/, "versionCode 4");
    edit(PBXPROJ, /CURRENT_PROJECT_VERSION = \d+;/g, "CURRENT_PROJECT_VERSION = 4;");
    const gradle = read(GRADLE);
    const pbx = read(PBXPROJ);
    const plist = read(INFO_PLIST);

    const { status, out, err } = bump("1.0.1");
    expect(err).toBe("");
    expect(status).toBe(0);

    expect(values(read(GRADLE), "versionName")).toEqual(["1.0.1"]);
    expect(values(read(GRADLE), "versionCode")).toEqual(["5"]);
    const configs = values(pbx, "MARKETING_VERSION").length;
    expect(values(read(PBXPROJ), "MARKETING_VERSION")).toEqual(Array(configs).fill("1.0.1"));
    expect(values(read(PBXPROJ), "CURRENT_PROJECT_VERSION")).toEqual(Array(configs).fill("5"));

    expect(changedLines(gradle, read(GRADLE))).toEqual([
      "versionCode 4 → versionCode 5",
      'versionName "1.0" → versionName "1.0.1"',
    ]);
    const pbxChanges = changedLines(pbx, read(PBXPROJ));
    expect(pbxChanges).toHaveLength(configs * 2);
    for (const line of pbxChanges) {
      expect(line).toMatch(
        /^(MARKETING_VERSION = 1\.0; → MARKETING_VERSION = 1\.0\.1;|CURRENT_PROJECT_VERSION = 4; → CURRENT_PROJECT_VERSION = 5;)$/,
      );
    }
    expect(read(INFO_PLIST)).toBe(plist);

    expect(out).toContain('versionName "1.0" → "1.0.1"');
    expect(out).toContain("versionCode 4 → 5");
    expect(out).toContain("MARKETING_VERSION 1.0");
    expect(out).toContain("CURRENT_PROJECT_VERSION 4");
    expect(out).toMatch(/commit .*then tag/i);
  });

  it("uses the larger build number as the base, so the two end up equal", () => {
    edit(GRADLE, /versionCode \d+/, "versionCode 7");
    edit(PBXPROJ, /CURRENT_PROJECT_VERSION = \d+;/, "CURRENT_PROJECT_VERSION = 12;");
    expect(bump("1.1").status).toBe(0);
    expect(values(read(GRADLE), "versionCode")).toEqual(["13"]);
    expect(new Set(values(read(PBXPROJ), "CURRENT_PROJECT_VERSION"))).toEqual(new Set(["13"]));

    edit(GRADLE, /versionCode \d+/, "versionCode 40");
    expect(bump("1.1").status).toBe(0);
    expect(values(read(GRADLE), "versionCode")).toEqual(["41"]);
    expect(new Set(values(read(PBXPROJ), "CURRENT_PROJECT_VERSION"))).toEqual(new Set(["41"]));
  });

  it("takes the same version again for another build of it", () => {
    expect(bump("1.0").status).toBe(0);
    expect(bump("1.0").status).toBe(0);
    expect(values(read(GRADLE), "versionName")).toEqual(["1.0"]);
    expect(values(read(GRADLE), "versionCode")).toEqual(["3"]);
  });

  it("only prints with --dry-run", () => {
    const { status, out } = bump("2.0.0", "--dry-run");
    expect(status).toBe(0);
    expect(out).toContain('versionName "1.0" → "2.0.0"');
    expect(out).toMatch(/nothing was written/i);
    for (const file of FILES) expect(read(file)).toBe(real[file]);
  });

  it("treats npm's own --dry-run (when the -- was left out) as a dry run", () => {
    const run = spawnSync(process.execPath, [SCRIPT, "2.0.0", "--root", dir], {
      encoding: "utf8",
      env: { ...process.env, npm_config_dry_run: "true" },
    });
    expect(run.status).toBe(0);
    expect(run.stdout).toMatch(/nothing was written/i);
    for (const file of FILES) expect(read(file)).toBe(real[file]);
  });

  it("keeps Windows line endings", () => {
    write(GRADLE, real[GRADLE]!.replace(/\n/g, "\r\n"));
    expect(bump("1.0.1").status).toBe(0);
    const after = read(GRADLE);
    expect(after).toContain('versionName "1.0.1"\r\n');
    expect(after.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it.each([
    ["a missing version", [], /which version/i],
    ["a leading v", ["v1.0.1"], /isn't a version/],
    ["a pre-release tag", ["1.0.1-beta"], /isn't a version/],
    ["four parts", ["1.0.0.1"], /isn't a version/],
    ["two versions", ["1.0.1", "1.0.2"], /one version/i],
    ["an unknown option", ["1.0.1", "--force"], /unknown option --force/i],
  ])("refuses %s", (_name, args, message) => {
    const { status, err } = bump(...args);
    expect(status).toBe(1);
    expect(err).toMatch(message);
    for (const file of FILES) expect(read(file)).toBe(real[file]);
  });

  it("refuses a version lower than the current one", () => {
    edit(GRADLE, 'versionName "1.0"', 'versionName "1.2.0"');
    const { status, err } = bump("1.1.9");
    expect(status).toBe(1);
    expect(err).toMatch(/lower than the current version, 1\.2\.0/);
    expect(bump("1.2").status).toBe(0);
  });

  it.each([
    [
      "a second versionCode (a product flavor)",
      GRADLE,
      /(versionName "1\.0"\n)/,
      "$1        versionCode 9\n",
      /expected one versionCode line .*found 2/,
    ],
    [
      "no versionName",
      GRADLE,
      /^[ \t]*versionName.*\n/m,
      "",
      /expected one versionName line .*found 0/,
    ],
    [
      "a versionCode the script can't read",
      GRADLE,
      /versionCode \d+/,
      "versionCode rootProject.ext.code",
      /line \d+: can't read versionCode/,
    ],
    [
      "a versionName that isn't a version",
      GRADLE,
      'versionName "1.0"',
      'versionName "1.0-beta"',
      /versionName "1\.0-beta" isn't a plain version/,
    ],
    [
      "no MARKETING_VERSION",
      PBXPROJ,
      /^[ \t]*MARKETING_VERSION = .*\n/gm,
      "",
      /expected MARKETING_VERSION and CURRENT_PROJECT_VERSION .*found 0 and/,
    ],
    [
      "a MARKETING_VERSION that isn't a version",
      PBXPROJ,
      /MARKETING_VERSION = [^;]+;/,
      'MARKETING_VERSION = "$(inherited)";',
      /MARKETING_VERSION "\$\(inherited\)" isn't a plain version/,
    ],
    [
      "a CURRENT_PROJECT_VERSION that isn't a whole number",
      PBXPROJ,
      /CURRENT_PROJECT_VERSION = \d+;/,
      "CURRENT_PROJECT_VERSION = 1.2;",
      /CURRENT_PROJECT_VERSION "1\.2" isn't a whole number/,
    ],
    [
      "an Info.plist with the version typed in",
      INFO_PLIST,
      "<string>$(MARKETING_VERSION)</string>",
      "<string>1.0</string>",
      /Info\.plist: CFBundleShortVersionString should be \$\(MARKETING_VERSION\)/,
    ],
  ])("fails clearly, and writes neither file, on %s", (_name, file, from, to, message) => {
    edit(file, from, to);
    const edited = Object.fromEntries(FILES.map((f) => [f, read(f)]));
    const { status, err } = bump("1.0.1");
    expect(status).toBe(1);
    expect(err).toMatch(message);
    expect(err).toContain(file);
    for (const f of FILES) expect(read(f)).toBe(edited[f]);
  });

  it("fails clearly when a project file is missing", () => {
    rmSync(join(dir, PBXPROJ));
    const { status, err } = bump("1.0.1");
    expect(status).toBe(1);
    expect(err).toMatch(/project\.pbxproj not found/);
    expect(read(GRADLE)).toBe(real[GRADLE]);
  });

  it("prints help", () => {
    const { status, out } = bump("--help");
    expect(status).toBe(0);
    expect(out).toMatch(/npm run release:bump -- <version> \[--dry-run\]/);
  });

  it("never touched the real files", () => {
    for (const file of FILES) expect(readFileSync(join(ROOT, file), "utf8")).toBe(real[file]);
  });
});
