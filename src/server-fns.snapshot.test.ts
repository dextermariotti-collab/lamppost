import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The phone apps call server functions by an id TanStack Start derives from the function's file
 * and name (a hash of `src/lib/x.functions.ts--name_createServerFn_handler`), and an installed
 * app keeps the ids it was built with. Renaming a server function, or moving or renaming its
 * file, gives it a new id, and every installed app's call to the old one fails until people
 * update. So this is the list of server functions that have shipped, as `file#name`:
 *
 * - A new server function is added to SHIPPED in the same change.
 * - To rename or move one, add the new one beside the old and keep the old working (it can call
 *   the same code) until no supported app version uses it. Only then remove it from SHIPPED, on
 *   purpose, and say so in the PR.
 */
const SHIPPED = [
  "src/lib/account-data.functions.ts#deleteMyAccount",
  "src/lib/account-data.functions.ts#exportMyData",
  "src/lib/achievements.functions.ts#listAchievements",
  "src/lib/argument.functions.ts#gradeArgument",
  "src/lib/cases.functions.ts#getGeneratedCase",
  "src/lib/consent.functions.ts#recordConsent",
  "src/lib/debate.functions.ts#challengeToDebate",
  "src/lib/debate.functions.ts#getDebate",
  "src/lib/debate.functions.ts#listDebates",
  "src/lib/debate.functions.ts#markDebateSeen",
  "src/lib/debate.functions.ts#submitDebateResponse",
  "src/lib/friends.functions.ts#getFriendProfile",
  "src/lib/friends.functions.ts#listFriends",
  "src/lib/friends.functions.ts#listNudges",
  "src/lib/friends.functions.ts#markNudgesRead",
  "src/lib/friends.functions.ts#proposeSharedStreak",
  "src/lib/friends.functions.ts#removeFriend",
  "src/lib/friends.functions.ts#resolveInvite",
  "src/lib/friends.functions.ts#respondToRequest",
  "src/lib/friends.functions.ts#respondToSharedStreak",
  "src/lib/friends.functions.ts#searchPeople",
  "src/lib/friends.functions.ts#sendFriendRequest",
  "src/lib/friends.functions.ts#sendNudge",
  "src/lib/league.functions.ts#getLeague",
  "src/lib/learning-state.functions.ts#syncLearningState",
  "src/lib/look-closer.functions.ts#lookCloser",
  "src/lib/practice.functions.ts#getPracticeAccess",
  "src/lib/practice.functions.ts#listPracticeSessions",
  "src/lib/practice.functions.ts#practiceTurn",
  "src/lib/profile.functions.ts#getMyProfile",
  "src/lib/profile.functions.ts#syncProgress",
  "src/lib/profile.functions.ts#updateMyProfile",
  "src/lib/reports.functions.ts#submitContentReport",
  "src/lib/safety.functions.ts#blockUser",
  "src/lib/safety.functions.ts#listBlockedPeople",
  "src/lib/safety.functions.ts#reportUser",
  "src/lib/safety.functions.ts#setProfileVisibility",
  "src/lib/safety.functions.ts#unblockUser",
];

const ROOT = process.cwd();
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const source = walk(join(ROOT, "src"))
  .filter((file) => /\.(ts|tsx)$/.test(file) && !/\.test\.tsx?$/.test(file))
  // src/test holds the stand-in createServerFn the handler tests run against.
  .filter((file) => !file.startsWith(join(ROOT, "src", "test") + sep))
  .map((file) => ({
    file: relative(ROOT, file).split(sep).join("/"),
    text: readFileSync(file, "utf8"),
  }));

const lineOf = (text: string, index: number) => text.slice(0, index).split("\n").length;
// TanStack Start only accepts `const name = createServerFn(...)`, and names the id after `name`.
const declaration = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*createServerFn\b/g;
const call = /\bcreateServerFn\s*(?:<[^>]*>)?\s*\(/g;

const declared = source.flatMap(({ file, text }) =>
  [...text.matchAll(declaration)].map((m) => ({
    key: `${file}#${m[1]!}`,
    at: `${file}:${lineOf(text, m.index + m[0].length)}`,
  })),
);
const found = declared.map(({ key }) => key);
const SELF = "src/server-fns.snapshot.test.ts";

describe("server functions installed apps call by id", () => {
  it("are all found by this scan", () => {
    // A call in a form the scan doesn't read would be missing from the list without anyone knowing.
    const calls = source.flatMap(({ file, text }) =>
      [...text.matchAll(call)].map((m) => `${file}:${lineOf(text, m.index)}`),
    );
    expect(calls.sort(), `Write each one as \`export const name = createServerFn(...)\`.`).toEqual(
      declared.map(({ at }) => at).sort(),
    );
    expect(found.length).toBeGreaterThan(0);
  });

  it("are never removed, renamed or moved", () => {
    const missing = SHIPPED.filter((key) => !found.includes(key));
    expect(
      missing,
      `These shipped, so installed apps still call them and will fail: put each back under the same file and name. Only once no supported app version calls one, remove it from SHIPPED in ${SELF}, on purpose.`,
    ).toEqual([]);
  });

  it("are listed when they're new", () => {
    const added = found.filter((key) => !SHIPPED.includes(key));
    expect(
      added,
      `New server functions: add each to SHIPPED in ${SELF}, in order, so a later rename or move is caught.`,
    ).toEqual([]);
  });

  it("never share a name in one file, so no id depends on the order they're written in", () => {
    expect(found.filter((key, i) => found.indexOf(key) !== i)).toEqual([]);
  });

  it("keep SHIPPED sorted and unique", () => {
    expect(SHIPPED).toEqual([...new Set(SHIPPED)].sort());
  });
});
