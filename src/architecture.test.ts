import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The structural rules the rest of the code relies on, checked over the source itself so a new
 * file can't quietly break one. Each rule says why it exists; CLAUDE.md has the longer story.
 */
const ROOT = process.cwd();
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const source = walk(join(ROOT, "src"))
  .filter((file) => /\.(ts|tsx)$/.test(file) && !/\.test\.tsx?$/.test(file))
  .filter((file) => !file.includes(`${join("src", "test")}`))
  .map((file) => ({ file: relative(ROOT, file), text: readFileSync(file, "utf8") }));
const generated = (file: string) =>
  file.startsWith(join("src", "integrations", "supabase")) || file.endsWith("routeTree.gen.ts");

describe("what reaches the browser", () => {
  it("imports a server-only module only from another one, or lazily inside a handler", () => {
    // A static import from a file the browser loads would ship the service-role client or a
    // prompt to every visitor. `await import()` inside a server handler is how they're reached.
    const found = source.flatMap(({ file, text }) =>
      file.endsWith(".server.ts")
        ? []
        : [...text.matchAll(/^import[^;]*?from\s+["']([^"']+\.server)["']/gms)].map(
            (match) => `${file} → ${match[1]}`,
          ),
    );
    expect(found).toEqual([]);
  });

  it("reads server secrets only in server code, and never ships them to the browser", () => {
    const secret = /SUPABASE_SERVICE_ROLE_KEY|AI_API_KEY|RATE_LIMIT_SECRET/;
    const serverSide = (file: string) =>
      /\.(server|functions)\.ts$/.test(file) || file.startsWith(join("src", "routes", "api"));
    const found = source
      .filter(({ file, text }) => secret.test(text) && !serverSide(file))
      .map(({ file }) => file);
    expect(found).toEqual([]);
    // Vite builds every VITE_ value into the browser bundle.
    const example = readFileSync(join(ROOT, ".env.example"), "utf8");
    const exposed = /VITE_\w*(SERVICE_ROLE|SECRET|AI_API|WARM)/;
    expect(example).not.toMatch(exposed);
    expect(source.filter(({ text }) => exposed.test(text)).map(({ file }) => file)).toEqual([]);
  });

  it("keeps real settings out of the repository", () => {
    // .env holds the real values locally; only the example, with blanks and placeholders, is shared.
    const ignored = readFileSync(join(ROOT, ".gitignore"), "utf8").split("\n");
    expect(ignored).toContain(".env");
    const example = readFileSync(join(ROOT, ".env.example"), "utf8");
    const filled = example
      .split("\n")
      .filter((line) => /^[A-Z_]+=/.test(line))
      .filter((line) => !/=("")?$|\.\.\."$|YOUR-[A-Z-]+/.test(line));
    expect(filled).toEqual([]);
  });
});

describe("conventions that keep data consistent", () => {
  it("keys every saved value on the device with the lamppost- prefix", () => {
    // Deleting an account and signing out clear the device by that prefix (device-data.ts), so a
    // key without it would outlive the account.
    const found = source
      .filter(({ file }) => !generated(file))
      .flatMap(({ file, text }) =>
        [
          ...[...text.matchAll(/(?:get|set|remove)Item\(\s*["'`]([^"'`]+)/g)].map((m) => m[1]!),
          ...[...text.matchAll(/\b[A-Z_]*KEY\s*=\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]!),
        ]
          .filter((key) => !key.startsWith("lamppost-"))
          .map((key) => `${file}: ${key}`),
      );
    expect(found).toEqual([]);
  });

  it("makes a day key from the device's calendar day, never the UTC date", () => {
    // A UTC date is tomorrow for anyone west of Greenwich in the evening. days.ts is the one
    // place that turns a date into a key.
    const found = source
      .filter(({ file }) => file !== join("src", "lib", "days.ts"))
      .filter(({ text }) => /toISOString\(\)\.(slice\(0,\s*10\)|split\(["']T["']\))/.test(text))
      .map(({ file }) => file);
    expect(found).toEqual([]);
  });

  it("names AI models only in ai-models.ts", () => {
    const found = source
      .filter(({ file }) => file !== join("src", "lib", "ai-models.ts"))
      .filter(({ text }) =>
        /["'`]((google|openai|anthropic|meta|mistral)\/[\w.-]+|(gemini|gpt|claude)-[\w.-]+)["'`]/.test(
          text,
        ),
      )
      .map(({ file }) => file);
    expect(found).toEqual([]);
  });
});

describe("migrations", () => {
  const migrations = readdirSync(join(ROOT, "supabase", "migrations")).filter((f) =>
    f.endsWith(".sql"),
  );

  it("are named by timestamp, each one distinct", () => {
    for (const file of migrations) expect(file).toMatch(/^\d{14}_[a-z0-9_-]+\.sql$/);
    const stamps = migrations.map((file) => file.slice(0, 14));
    expect(new Set(stamps).size).toBe(stamps.length);
  });

  it("come with a rollback kept outside the auto-applied folder", () => {
    // From the write lockdown on, every change ships with a tested way back.
    const since = "20260928200000";
    const missing = migrations
      .filter((file) => file.slice(0, 14) >= since)
      .filter(
        (file) => !existsSync(join(ROOT, "docs", "rollback", file.replace(".sql", ".down.sql"))),
      );
    expect(missing).toEqual([]);
    expect(migrations.filter((file) => file.includes(".down."))).toEqual([]);
  });
});
