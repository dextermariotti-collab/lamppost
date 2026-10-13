import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, attempt, migratedDb } from "@/test/db";
import { ALICE, createUsers } from "@/test/seed";

/**
 * The account's finished lessons are the server's to write, private to it, bounded, and the
 * documented rollback really removes them (and the migration can be applied again afterwards).
 */
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

let db: PGlite;
beforeAll(async () => {
  db = await migratedDb();
  await createUsers(db, [ALICE]);
}, 60_000);
afterAll(async () => {
  await db.close();
});

const store = (ids: string[]) =>
  as(db, "service_role", null, () =>
    attempt(db, `UPDATE profiles SET done_lessons = $1 WHERE id = $2`, [ids, ALICE]),
  );

describe("profiles.done_lessons", () => {
  it("starts empty and is written by the server", async () => {
    const before = await db.query<{ done_lessons: string[] }>(
      `SELECT done_lessons FROM profiles WHERE id = $1`,
      [ALICE],
    );
    expect(before.rows[0]?.done_lessons).toEqual([]);
    expect((await store(["claims-vague-language"])).ok).toBe(true);
  });

  it("can't be read or written by the account's own browser", async () => {
    const select = await as(db, "authenticated", ALICE, () =>
      attempt(db, `SELECT done_lessons FROM profiles WHERE id = $1`, [ALICE]),
    );
    const update = await as(db, "authenticated", ALICE, () =>
      attempt(db, `UPDATE profiles SET done_lessons = '{}' WHERE id = $1`, [ALICE]),
    );
    expect(select.ok).toBe(false);
    expect(update.ok).toBe(false);
  });

  it("holds at most 200 lessons", async () => {
    const many = Array.from({ length: 201 }, (_, i) => `lesson-${i}`);
    expect((await store(many)).ok).toBe(false);
    expect((await store(many.slice(0, 200))).ok).toBe(true);
  });

  it("is removed by its rollback, which can run twice, and comes back with the migration", async () => {
    const down = read("docs/rollback/20261013100000_done_lessons.down.sql");
    const up = read("supabase/migrations/20261013100000_done_lessons.sql");
    await db.exec(down);
    await db.exec(down);
    const gone = await db.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'done_lessons'`,
    );
    expect(gone.rows).toHaveLength(0);
    await db.exec(up);
    await db.exec(up);
    expect((await store(["claims-vague-language"])).ok).toBe(true);
  });
});
