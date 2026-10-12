import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, attempt, migratedDb } from "@/test/db";

/**
 * The store of AI-written daily cases is the server's alone, holds one case per day, and its
 * documented rollback really removes it (and the migration can be applied again afterwards).
 */
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const ALICE = "00000000-0000-0000-0000-00000000000a";

let db: PGlite;
beforeAll(async () => {
  db = await migratedDb();
}, 60_000);
afterAll(async () => {
  await db.close();
});

const upsert = `INSERT INTO generated_cases (day, content, model) VALUES ($1, $2::jsonb, 'm')
  ON CONFLICT (day) DO NOTHING`;

describe("generated_cases", () => {
  it("keeps the first case written for a day", async () => {
    const write = (content: string) =>
      as(db, "service_role", null, () => attempt(db, upsert, ["2026-11-02", content]));
    expect((await write('{"title":"first"}')).ok).toBe(true);
    expect((await write('{"title":"second"}')).ok).toBe(true);
    const rows = await db.query<{ content: { title: string } }>(
      `SELECT content FROM generated_cases WHERE day = '2026-11-02'`,
    );
    expect(rows.rows.map((r) => r.content.title)).toEqual(["first"]);
  });

  it("only takes a real day as its key", async () => {
    const bad = await as(db, "service_role", null, () => attempt(db, upsert, ["tomorrow", "{}"]));
    expect(bad.ok).toBe(false);
  });

  it("can't be read or written by the browser, signed in or not", async () => {
    for (const [role, user] of [
      ["anon", null],
      ["authenticated", ALICE],
    ] as const) {
      const select = await as(db, role, user, () => attempt(db, `SELECT * FROM generated_cases`));
      const insert = await as(db, role, user, () => attempt(db, upsert, ["2026-11-03", "{}"]));
      expect(select.ok, `${role} select`).toBe(false);
      expect(insert.ok, `${role} insert`).toBe(false);
    }
  });

  it("is removed by its rollback, which can run twice, and comes back with the migration", async () => {
    const down = read("docs/rollback/20261012100000_generated_cases.down.sql");
    const up = read("supabase/migrations/20261012100000_generated_cases.sql");
    await db.exec(down);
    await db.exec(down);
    const gone = await db.query(`SELECT to_regclass('public.generated_cases') AS t`);
    expect((gone.rows[0] as { t: string | null }).t).toBeNull();
    await db.exec(up);
    const back = await as(db, "service_role", null, () =>
      attempt(db, upsert, ["2026-11-04", "{}"]),
    );
    expect(back.ok).toBe(true);
  });
});
