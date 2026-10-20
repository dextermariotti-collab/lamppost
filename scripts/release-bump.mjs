// Sets the version of the iOS and Android apps for a store release, in both native projects at
// once, and raises the build number both stores check.
//
//   npm run release:bump -- 1.0.1            # set version 1.0.1 and raise both build numbers
//   npm run release:bump -- 1.0.1 --dry-run  # print what would change, write nothing
//
// It changes four settings and nothing else:
//   android/app/build.gradle                  versionName, versionCode
//   ios/App/App.xcodeproj/project.pbxproj     MARKETING_VERSION, CURRENT_PROJECT_VERSION
//                                             (in every build configuration that sets them)
// The App Store and Google Play both refuse a build number they have already seen, so the new
// build number is one more than the larger of the current ones, and is the same on both. To
// upload another build of the same version, pass the current version again. It never creates a
// git tag: commit the change, then tag that commit.
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const GRADLE = "android/app/build.gradle";
export const PBXPROJ = "ios/App/App.xcodeproj/project.pbxproj";
export const INFO_PLIST = "ios/App/App/Info.plist";

/** Google Play's ceiling for versionCode. */
const MAX_VERSION_CODE = 2_100_000_000;

/** One to three numbers separated by dots, as Apple requires for CFBundleShortVersionString. */
const VERSION = /^(0|[1-9]\d*)(\.(0|[1-9]\d*)){0,2}$/;

const USAGE = `Usage: npm run release:bump -- <version> [--dry-run]

  <version>   the version people see in the stores: 1.2 or 1.2.3
  --dry-run   print what would change and write nothing
  --root DIR  change the projects under DIR instead of this repository (for tests)

Sets versionName and MARKETING_VERSION to <version>, and raises versionCode and
CURRENT_PROJECT_VERSION to one more than the larger of the two, so they stay equal.`;

export class ReleaseError extends Error {}

/** Compares two versions number by number (1.0 and 1.0.0 are equal). */
export function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

/**
 * Every line that sets `key`, parsed with `shape` (groups: 1 = everything before the value,
 * 2 = the value, 3 = everything after it). A line that sets the key in a form we don't
 * recognize is an error, not something to skip.
 */
function settings(text, file, key, shape) {
  const found = [];
  const starts = new RegExp(`^[ \\t]*${key}\\b`);
  text.split("\n").forEach((line, index) => {
    if (!starts.test(line)) return;
    const match = line.replace(/\r$/, "").match(shape);
    if (!match) {
      throw new ReleaseError(
        `${file}, line ${index + 1}: can't read ${key} from "${line.trim()}".`,
      );
    }
    found.push({ index, before: match[1], value: match[2], after: match[3] ?? "" });
  });
  return found;
}

function setLine(lines, setting, value) {
  const cr = lines[setting.index].endsWith("\r") ? "\r" : "";
  lines[setting.index] = `${setting.before}${value}${setting.after}${cr}`;
}

/** Reads the Android version, and knows how to write a new one into the same text. */
export function readGradle(text, file = GRADLE) {
  const code = settings(
    text,
    file,
    "versionCode",
    /^([ \t]*versionCode(?:[ \t]*=[ \t]*|[ \t]+))(\d+)([ \t]*)$/,
  );
  const name = settings(
    text,
    file,
    "versionName",
    /^([ \t]*versionName(?:[ \t]*=[ \t]*|[ \t]+)["'])([^"']*)(["'][ \t]*)$/,
  );
  for (const [key, found] of [
    ["versionCode", code],
    ["versionName", name],
  ]) {
    if (found.length !== 1) {
      throw new ReleaseError(
        `${file}: expected one ${key} line (in defaultConfig), found ${found.length}. Change it by hand, or teach this script the new layout.`,
      );
    }
  }
  const [codeLine] = code;
  const [nameLine] = name;
  if (!VERSION.test(nameLine.value)) {
    throw new ReleaseError(
      `${file}: versionName "${nameLine.value}" isn't a plain version like 1.2 or 1.2.3.`,
    );
  }
  return {
    version: nameLine.value,
    builds: [Number(codeLine.value)],
    write(version, build) {
      const lines = text.split("\n");
      setLine(lines, codeLine, String(build));
      setLine(lines, nameLine, version);
      return lines.join("\n");
    },
    changes(version, build) {
      return [
        `versionName "${nameLine.value}" → "${version}"`,
        `versionCode ${codeLine.value} → ${build}`,
      ];
    },
  };
}

/** Reads the iOS version from every build configuration, and knows how to write a new one. */
export function readPbxproj(text, file = PBXPROJ) {
  const marketing = settings(
    text,
    file,
    "MARKETING_VERSION",
    /^([ \t]*MARKETING_VERSION = "?)([^";]*)("?;[ \t]*)$/,
  );
  const build = settings(
    text,
    file,
    "CURRENT_PROJECT_VERSION",
    /^([ \t]*CURRENT_PROJECT_VERSION = "?)([^";]*)("?;[ \t]*)$/,
  );
  if (marketing.length === 0 || build.length === 0) {
    throw new ReleaseError(
      `${file}: expected MARKETING_VERSION and CURRENT_PROJECT_VERSION in the App target's build settings, found ${marketing.length} and ${build.length}.`,
    );
  }
  for (const setting of marketing) {
    if (!VERSION.test(setting.value)) {
      throw new ReleaseError(
        `${file}, line ${setting.index + 1}: MARKETING_VERSION "${setting.value}" isn't a plain version like 1.2 or 1.2.3.`,
      );
    }
  }
  for (const setting of build) {
    if (!/^\d+$/.test(setting.value)) {
      throw new ReleaseError(
        `${file}, line ${setting.index + 1}: CURRENT_PROJECT_VERSION "${setting.value}" isn't a whole number.`,
      );
    }
  }
  const versions = [...new Set(marketing.map((s) => s.value))];
  const builds = build.map((s) => Number(s.value));
  const counted = (values, n) =>
    `${values.join(", ")}${n > 1 ? ` (${n} build configurations)` : ""}`;
  return {
    version: versions.reduce((a, b) => (compareVersions(a, b) >= 0 ? a : b)),
    builds,
    write(version, next) {
      const lines = text.split("\n");
      for (const setting of marketing) setLine(lines, setting, version);
      for (const setting of build) setLine(lines, setting, String(next));
      return lines.join("\n");
    },
    changes(version, next) {
      return [
        `MARKETING_VERSION ${counted(versions, marketing.length)} → ${version}`,
        `CURRENT_PROJECT_VERSION ${counted([...new Set(builds)], build.length)} → ${next}`,
      ];
    },
  };
}

/** The Info.plist must take its version from the build settings, or changing them does nothing. */
export function checkInfoPlist(text, file = INFO_PLIST) {
  for (const [key, setting] of [
    ["CFBundleShortVersionString", "MARKETING_VERSION"],
    ["CFBundleVersion", "CURRENT_PROJECT_VERSION"],
  ]) {
    const pattern = new RegExp(`<key>${key}</key>\\s*<string>\\$\\(${setting}\\)</string>`);
    if (!pattern.test(text)) {
      throw new ReleaseError(
        `${file}: ${key} should be $(${setting}), so the version comes from the Xcode project.`,
      );
    }
  }
}

function readFile(root, file) {
  const path = join(root, file);
  if (!existsSync(path)) throw new ReleaseError(`${file} not found in ${root}.`);
  return readFileSync(path, "utf8");
}

/**
 * Works out the release without writing anything: the new contents of both files and a
 * description of every change.
 */
export function planRelease(root, version) {
  if (!VERSION.test(version)) {
    throw new ReleaseError(`"${version}" isn't a version. Use one like 1.2 or 1.2.3 (no "v").`);
  }
  const gradleText = readFile(root, GRADLE);
  const pbxText = readFile(root, PBXPROJ);
  checkInfoPlist(readFile(root, INFO_PLIST));
  const android = readGradle(gradleText);
  const ios = readPbxproj(pbxText);

  const current =
    compareVersions(android.version, ios.version) >= 0 ? android.version : ios.version;
  if (compareVersions(version, current) < 0) {
    throw new ReleaseError(
      `${version} is lower than the current version, ${current}. The stores only accept the same or a higher one.`,
    );
  }
  const build = Math.max(...android.builds, ...ios.builds) + 1;
  if (build > MAX_VERSION_CODE) {
    throw new ReleaseError(`Build ${build} is above Google Play's limit of ${MAX_VERSION_CODE}.`);
  }
  return {
    version,
    build,
    files: [
      {
        file: GRADLE,
        text: android.write(version, build),
        changes: android.changes(version, build),
      },
      { file: PBXPROJ, text: ios.write(version, build), changes: ios.changes(version, build) },
    ],
  };
}

export function parseArgs(argv, env = {}) {
  const options = {
    version: null,
    dryRun: env.npm_config_dry_run === "true",
    help: false,
    root: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--root") {
      const value = argv[++i];
      if (!value) throw new ReleaseError("--root needs a folder.");
      options.root = value;
    } else if (arg.startsWith("-")) throw new ReleaseError(`Unknown option ${arg}.`);
    else if (options.version)
      throw new ReleaseError(`Pass one version, not "${options.version}" and "${arg}".`);
    else options.version = arg;
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2), process.env);
  if (options.help) {
    console.log(USAGE);
    return;
  }
  if (!options.version) throw new ReleaseError(`Which version? For example 1.0.1.\n\n${USAGE}`);
  const root = resolve(options.root ?? fileURLToPath(new URL("..", import.meta.url)));
  const plan = planRelease(root, options.version);

  for (const { file, changes } of plan.files) {
    console.log(file);
    for (const change of changes) console.log(`  ${change}`);
  }
  if (options.dryRun) {
    console.log("\nDry run: nothing was written.");
    return;
  }
  for (const { file, text } of plan.files) writeFileSync(join(root, file), text);
  console.log(
    `\nVersion ${plan.version}, build ${plan.build}. Commit these two files, then tag that commit: git tag v${plan.version}`,
  );
}

const runDirectly =
  process.argv[1] !== undefined &&
  existsSync(process.argv[1]) &&
  pathToFileURL(realpathSync(process.argv[1])).href ===
    pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href;

if (runDirectly) {
  try {
    main();
  } catch (error) {
    if (!(error instanceof ReleaseError)) throw error;
    console.error(`release:bump: ${error.message}`);
    process.exit(1);
  }
}
