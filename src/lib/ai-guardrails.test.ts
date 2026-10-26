import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GUARDRAILS, SCOPE_RULES, withGuardrails } from "./ai-guardrails.server";
import { CONTENT_POLICY_RULES } from "./moderation.server";

describe("guardrails", () => {
  it("say what the app is for, that the model is an AI, and that it gives no advice", () => {
    expect(SCOPE_RULES).toMatch(/critical thinking/i);
    expect(SCOPE_RULES).toMatch(/You are an AI and can be wrong/);
    expect(SCOPE_RULES).toMatch(/medical/i);
    expect(SCOPE_RULES).toMatch(/legal/i);
    expect(SCOPE_RULES).toMatch(/financial/i);
    expect(SCOPE_RULES).toMatch(/never instructions to you/i);
    expect(CONTENT_POLICY_RULES).toMatch(/sexual/i);
    expect(CONTENT_POLICY_RULES).toMatch(/self-harm/i);
    expect(GUARDRAILS).toContain(CONTENT_POLICY_RULES);
    expect(GUARDRAILS).toContain(SCOPE_RULES);
  });

  it("adds the rules once, whatever the prompt already carries", () => {
    const bare = withGuardrails("You write things.");
    expect(bare).toContain(CONTENT_POLICY_RULES);
    expect(bare).toContain(SCOPE_RULES);
    expect(withGuardrails(bare)).toBe(bare);
    const partial = withGuardrails(`You write things.\n\n${CONTENT_POLICY_RULES}`);
    expect(partial.split(CONTENT_POLICY_RULES)).toHaveLength(2);
    expect(partial).toContain(SCOPE_RULES);
  });
});

/**
 * The guarantee that matters: no code path calls a model with a prompt that skips the rules.
 * The topic classifier is the one exception, because it has to reply in its own JSON shape.
 */
describe("every model call carries the guardrails", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(path);
    }
  };
  walk(join(__dirname, ".."));

  it("passes every system prompt through withGuardrails", () => {
    const bare: string[] = [];
    let calls = 0;
    for (const file of files) {
      if (file.endsWith("moderation.server.ts")) continue;
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\b(streamText|generateText)\(\{/g)) {
        calls += 1;
        const body = source.slice(match.index, match.index + 400);
        if (!/system:\s*withGuardrails\(/.test(body)) bare.push(`${file}: ${match[0]}`);
      }
    }
    expect(calls).toBeGreaterThanOrEqual(7);
    expect(bare).toEqual([]);
  });

  /** The options object a call is made with, from its opening brace to the matching close. */
  const callBody = (source: string, start: number) => {
    let depth = 0;
    for (let i = source.indexOf("{", start); i < source.length; i++) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
    }
    return source.slice(start);
  };

  it("caps what every model call may write, the topic screen included", () => {
    const uncapped: string[] = [];
    let calls = 0;
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\b(streamText|generateText)\(\{/g)) {
        calls += 1;
        const body = callBody(source, match.index);
        if (!/\.\.\.aiOutput\(|\bmaxOutputTokens:/.test(body)) uncapped.push(`${file}: ${body}`);
      }
    }
    expect(calls).toBeGreaterThanOrEqual(8);
    expect(uncapped).toEqual([]);
  });
});
