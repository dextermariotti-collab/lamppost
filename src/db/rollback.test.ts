import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, attempt, migratedDb } from "@/test/db";

/**
 * The documented rollback must really undo the migration (and be re-appliable),
 * because it is what someone runs at 2am if the release has to be backed out.
 */
const ALICE = "00000000-0000-0000-0000-00000000000a";
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const down = () => read("docs/rollback/20260928200000_lock_server_owned_writes.down.sql");
const up = () => read("supabase/migrations/20260928200000_lock_server_owned_writes.sql");

let db: PGlite;

const forge = async () => {
  const xp = await as(db, "authenticated", ALICE, () =>
    attempt(db, `UPDATE profiles SET total_xp = 999999 WHERE id = $1`, [ALICE]),
  );
  const activity = await as(db, "authenticated", ALICE, () =>
    attempt(
      db,
      `INSERT INTO daily_activity (user_id, day, lessons_completed) VALUES ($1,'2026-09-23',99)`,
      [ALICE],
    ),
  );
  return { xp: xp.ok, activity: activity.ok };
};

beforeAll(async () => {
  db = await migratedDb();
  await db.query(
    `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1,'a@example.test','{}')`,
    [ALICE],
  );
}, 60_000);
afterAll(async () => {
  await db.close();
});

describe("rolling the migration back", () => {
  it("restores the previous rules, and re-applying the migration locks them again", async () => {
    expect(await forge()).toEqual({ xp: false, activity: false });

    await db.exec(down());
    expect(await forge()).toEqual({ xp: true, activity: true });
    // Running the rollback twice is harmless.
    await db.exec(down());

    await db.exec(up());
    await db.query(`UPDATE profiles SET total_xp = 0`);
    await db.query(`DELETE FROM daily_activity`);
    expect(await forge()).toEqual({ xp: false, activity: false });
  }, 60_000);
});
