import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Copy that promises more than the app can back up. Each phrase here was either removed from
 * the app or is one we don't want to drift back in. If a phrase is true and you can show it,
 * change the check rather than the sentence.
 */
const BANNED: [RegExp, string][] = [
  [/learning sticks/i, "a claim about how learning works that we can't show"],
  [/sharper/i, "a promise about how much better someone will think"],
  [/think(ing)? (better|smarter)/i, "a promise about how much better someone will think"],
  [/guarantee/i, "a promise nobody can keep"],
  [
    /scientifically|clinically|\bproven\b|science-backed|research-backed/i,
    "evidence we haven't cited",
  ],
  [/on any topic/i, "the course is fixed at 35 lessons"],
  [/timed to when you.d forget/i, "the reviews come back at set intervals, not a model of memory"],
  [/apple pay|google pay/i, "a payment method that isn't set up"],
  [/real arguments/i, "the lessons use made-up examples"],
  [/safety@|support@|hello@|privacy@/i, "an invented contact address"],
  [/\bAI[- ](powered )?tutor that (knows|understands)/i, "the AI doesn't understand, it predicts"],
];

const files: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith(".gen.ts"))
      files.push(path);
  }
};
for (const dir of ["routes", "components", "lib"]) walk(join(process.cwd(), "src", dir));

describe("the app's copy", () => {
  it("doesn't make claims it can't back up", () => {
    const found: string[] = [];
    for (const file of files) {
      // The prompts sent to the model may say "think sharper"; only what a learner reads counts.
      if (/\.server\.ts$/.test(file) || /ai-guardrails|exercise-ai/.test(file)) continue;
      // Comments explain the code; only what a learner can read counts.
      const source = readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
        .join("\n");
      for (const [pattern, why] of BANNED) {
        const match = source.match(pattern);
        if (match) found.push(`${file.replace(process.cwd() + "/", "")}: "${match[0]}" (${why})`);
      }
    }
    // This file states the phrases it forbids.
    expect(found.filter((line) => !line.includes("honest-claims.test"))).toEqual([]);
  });
});
