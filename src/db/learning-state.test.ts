import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, attempt, migratedDb } from "@/test/db";

/**
 * The account copy of the learning state is the server's alone, holds one object per account,
 * goes with the account, and its documented rollback really removes it.
 */
const NAME = "20261026100000_learning_state";
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const ALICE = "00000000-0000-0000-0000-00000000000a";

let db: PGlite;
beforeAll(async () => {
  db = await migratedDb();
  await db.query(
    `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, 'a@example.test', '{}')`,
    [ALICE],
  );
}, 60_000);
afterAll(async () => {
  await db.close();
});

const write = (state: string) =>
  as(db, "service_role", null, () =>
    attempt(
      db,
      `INSERT INTO learning_state (user_id, state) VALUES ($1, $2::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET state = excluded.state, rev = learning_state.rev + 1`,
      [ALICE, state],
    ),
  );

describe("learning_state", () => {
  it("holds one object per account, written by the server", async () => {
    expect((await write('{"v":1,"ratings":{}}')).ok).toBe(true);
    expect((await write('{"v":1,"reviews":{}}')).ok).toBe(true);
    const rows = await db.query<{ rev: number }>(`SELECT rev FROM learning_state`);
    expect(rows.rows).toEqual([{ rev: 2 }]);
    expect((await write("[1, 2]")).ok).toBe(false);
  });

  it("can't be read or written by the browser, signed in or not", async () => {
    for (const [role, user] of [
      ["anon", null],
      ["authenticated", ALICE],
    ] as const) {
      const select = await as(db, role, user, () => attempt(db, `SELECT * FROM learning_state`));
      const update = await as(db, role, user, () =>
        attempt(db, `UPDATE learning_state SET state = '{}'::jsonb WHERE user_id = $1`, [ALICE]),
      );
      expect(select.ok, `${role} select`).toBe(false);
      expect(update.ok, `${role} update`).toBe(false);
    }
  });

  it("goes with the account", async () => {
    await db.query(`DELETE FROM auth.users WHERE id = $1`, [ALICE]);
    const left = await db.query(`SELECT 1 FROM learning_state WHERE user_id = $1`, [ALICE]);
    expect(left.rows).toHaveLength(0);
  });

  it("is removed by its rollback, which can run twice, and comes back with the migration", async () => {
    const down = read(`docs/rollback/${NAME}.down.sql`);
    await db.exec(down);
    await db.exec(down);
    const gone = await db.query<{ t: string | null }>(
      `SELECT to_regclass('public.learning_state') AS t`,
    );
    expect(gone.rows[0]!.t).toBeNull();
    await db.exec(read(`supabase/migrations/${NAME}.sql`));
    const back = await db.query<{ t: string | null }>(
      `SELECT to_regclass('public.learning_state') AS t`,
    );
    expect(back.rows[0]!.t).toBe("learning_state");
  });
});
