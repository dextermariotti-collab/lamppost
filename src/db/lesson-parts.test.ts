import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, attempt, migratedDb } from "@/test/db";

/**
 * The holding area for a lesson being written in parts: the server's alone. The
 * writes here are the same statements Supabase's client sends for `upsert`.
 */
let db: PGlite;

const store = (sql: string, params: unknown[] = []) =>
  as(db, "service_role", null, () => attempt(db, sql, params));

beforeAll(async () => {
  db = await migratedDb();
}, 60_000);
afterAll(async () => {
  await db.close();
});

describe("lesson_parts", () => {
  it("keeps one row per lesson and part, and a rewrite replaces it", async () => {
    const upsert = `INSERT INTO lesson_parts (lesson_id, part, content_version, content)
      VALUES ($1, $2, 7, $3::jsonb)
      ON CONFLICT (lesson_id, part) DO UPDATE SET content = EXCLUDED.content`;
    expect((await store(upsert, ["l1", "drill:0", '{"a":1}'])).ok).toBe(true);
    expect((await store(upsert, ["l1", "drill:0", '{"a":2}'])).ok).toBe(true);
    const rows = await db.query<{ content: { a: number } }>(
      `SELECT content FROM lesson_parts WHERE lesson_id='l1'`,
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]!.content.a).toBe(2);
  });

  it("writing the idea card once keeps the first one", async () => {
    const once = `INSERT INTO lesson_parts (lesson_id, part, content_version, content)
      VALUES ($1, 'concept', 7, $2::jsonb) ON CONFLICT (lesson_id, part) DO NOTHING`;
    await store(once, ["l2", '{"card":"first"}']);
    await store(once, ["l2", '{"card":"second"}']);
    const rows = await db.query<{ content: { card: string } }>(
      `SELECT content FROM lesson_parts WHERE lesson_id='l2' AND part='concept'`,
    );
    expect(rows.rows.map((r) => r.content.card)).toEqual(["first"]);
  });

  it("parts of another content version are not returned for the current one", async () => {
    await store(
      `INSERT INTO lesson_parts (lesson_id, part, content_version, content) VALUES ('l3','concept',6,'{}'), ('l3','written',7,'{}')`,
    );
    const r = await store(
      `SELECT part FROM lesson_parts WHERE lesson_id='l3' AND content_version = 7`,
    );
    expect(r.ok && r.rows.map((row) => row["part"])).toEqual(["written"]);
  });

  it("is out of reach of every browser role", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      const uid = role === "authenticated" ? "00000000-0000-0000-0000-0000000000aa" : null;
      for (const sql of [
        `SELECT * FROM lesson_parts`,
        `INSERT INTO lesson_parts (lesson_id, part, content_version, content) VALUES ('x','concept',7,'{}')`,
        `UPDATE lesson_parts SET content = '{}'`,
        `DELETE FROM lesson_parts`,
      ]) {
        const r = await as(db, role, uid, () => attempt(db, sql));
        expect(r.ok, `${role}: ${sql}`).toBe(false);
      }
    }
  });
});
