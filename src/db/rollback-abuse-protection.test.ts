import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, attempt, migratedDb } from "@/test/db";

/**
 * The documented rollbacks for the abuse-protection migrations must really undo
 * them and leave the database able to take the migration again: they are what
 * someone runs at 2am if a release has to be backed out.
 */
const ALICE = "00000000-0000-0000-0000-00000000000a";
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const up = (name: string) => read(`supabase/migrations/${name}.sql`);
const down = (name: string) => read(`docs/rollback/${name}.down.sql`);

let db: PGlite;
const server = <T>(fn: () => Promise<T>) => as(db, "service_role", null, fn);
const exists = async (sql: string) => ((await db.query(sql)).rows[0] as { n: number }).n > 0;
const tableExists = (name: string) =>
  exists(
    `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND tablename='${name}'`,
  );
const functionExists = (name: string) =>
  exists(`SELECT count(*)::int AS n FROM pg_proc WHERE proname='${name}'`);

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

describe("rolling back the rate limits", () => {
  const NAME = "20260929100000_rate_limits_and_locks";
  const LATER = "20261019100000_social_safety_hardening";

  it("removes the counters, leases and functions, and can be re-applied", async () => {
    expect(await tableExists("rate_limits")).toBe(true);
    // Rollbacks run newest first; the later one puts the original lease functions back.
    await db.exec(down(LATER));
    await db.exec(down(NAME));
    expect(await tableExists("rate_limits")).toBe(false);
    expect(await tableExists("server_locks")).toBe(false);
    for (const fn of ["check_rate_limits", "acquire_lock", "release_lock"]) {
      expect(await functionExists(fn), fn).toBe(false);
    }
    // Twice is harmless.
    await db.exec(down(NAME));

    await db.exec(up(NAME));
    await db.exec(up(LATER));
    const again = await server(() => attempt(db, `SELECT * FROM check_rate_limits('[]'::jsonb)`));
    expect(again.ok).toBe(true);
    const lease = await server(() => attempt(db, `SELECT acquire_lock('k', 5, 'me') AS got`));
    expect(lease.ok && lease.rows[0]?.["got"]).toBe(true);
  }, 60_000);
});

describe("rolling back lesson parts", () => {
  const NAME = "20260929100100_lesson_parts";

  it("removes the table, and can be re-applied", async () => {
    expect(await tableExists("lesson_parts")).toBe(true);
    await db.exec(down(NAME));
    expect(await tableExists("lesson_parts")).toBe(false);
    await db.exec(down(NAME));

    await db.exec(up(NAME));
    const write = await server(() =>
      attempt(
        db,
        `INSERT INTO lesson_parts (lesson_id, part, content_version, content) VALUES ('l','concept',7,'{}')`,
      ),
    );
    expect(write.ok).toBe(true);
  }, 60_000);
});

describe("rolling back rewards and the league", () => {
  const NAME = "20260929110000_rewards_and_league";
  const spendRow = async (cost: number) => {
    const r = await server(() => attempt(db, `SELECT * FROM spend_gems($1, $2)`, [ALICE, cost]));
    return r.ok ? (r.rows[0] as Record<string, unknown>) : null;
  };

  it("keeps every balance, drops the new functions, restores the old spend, and can be re-applied", async () => {
    await server(() => attempt(db, `UPDATE profiles SET gems_earned = 30 WHERE id=$1`, [ALICE]));
    await server(() =>
      attempt(db, `SELECT * FROM grant_chest($1,'2026-09-28','lesson','gems',40,3,5,5)`, [ALICE]),
    );
    const before = await db.query<{ gems: number }>(`SELECT gems FROM profiles WHERE id=$1`, [
      ALICE,
    ]);
    expect(before.rows[0]!.gems).toBe(70);

    await db.exec(down(NAME));
    for (const fn of [
      "grant_chest",
      "buy_hint_token",
      "use_hint_token",
      "unlock_cosmetic",
      "record_weekly_xp",
      "league_standings",
      "apply_league_result",
    ]) {
      expect(await functionExists(fn), fn).toBe(false);
    }
    // No learner loses gems: the grant became earnings.
    const after = await db.query(
      `SELECT gems, gems_earned, gems_granted FROM profiles WHERE id=$1`,
      [ALICE],
    );
    expect(after.rows).toEqual([{ gems: 70, gems_earned: 70, gems_granted: 0 }]);
    // Spending works the way it did before this migration: three columns, no `granted`.
    expect(Object.keys((await spendRow(10))!).sort()).toEqual(["balance", "ok", "spent"]);
    // What learners earned and unlocked is left where it was.
    expect(await tableExists("reward_chests")).toBe(true);
    expect(await tableExists("user_cosmetics")).toBe(true);
    // Twice is harmless.
    await db.exec(down(NAME));

    await db.exec(up(NAME));
    const again = await server(() =>
      attempt(db, `SELECT * FROM grant_chest($1,'2026-09-29','lesson','gems',5,3,5,5)`, [ALICE]),
    );
    expect(again.ok).toBe(true);
    expect(Object.keys((await spendRow(5))!).sort()).toEqual(["balance", "granted", "ok", "spent"]);
  }, 60_000);

  it("leaves the browser unable to touch the wallet or the league", async () => {
    await db.exec(down(NAME));
    for (const sql of [
      `UPDATE profiles SET gems_earned = 99999 WHERE id='${ALICE}'`,
      `UPDATE profiles SET hint_tokens = 99 WHERE id='${ALICE}'`,
      `UPDATE profiles SET league_tier = 4 WHERE id='${ALICE}'`,
      `SELECT * FROM reward_chests`,
    ]) {
      const r = await as(db, "authenticated", ALICE, () => attempt(db, sql));
      expect(r.ok, sql).toBe(false);
    }
    await db.exec(up(NAME));
  }, 60_000);
});

describe("rolling back the server-side wallet", () => {
  const NAME = "20260929100200_server_wallet";

  const spend = async (cost: number) => {
    const r = await server(() => attempt(db, `SELECT * FROM spend_gems($1, $2)`, [ALICE, cost]));
    return r.ok ? (r.rows[0] as { ok: boolean }).ok : false;
  };

  it("keeps the balance, drops the spend function and the derived balance, and can be re-applied", async () => {
    // Start from a known wallet: nothing granted or spent yet.
    await server(() =>
      attempt(
        db,
        `UPDATE profiles SET gems_earned = 200, gems_granted = 0, gems_spent = 0 WHERE id=$1`,
        [ALICE],
      ),
    );
    expect(await spend(60)).toBe(true);
    const before = await db.query<{ gems: number }>(`SELECT gems FROM profiles WHERE id=$1`, [
      ALICE,
    ]);
    expect(before.rows[0]!.gems).toBe(140);

    await db.exec(down(NAME));
    expect(await functionExists("spend_gems")).toBe(false);
    expect(await functionExists("keep_gem_balance")).toBe(false);
    // The balance the learner had is still there, and `gems` is an ordinary column again.
    const after = await db.query<{ gems: number }>(`SELECT gems FROM profiles WHERE id=$1`, [
      ALICE,
    ]);
    expect(after.rows[0]!.gems).toBe(140);
    await server(() => attempt(db, `UPDATE profiles SET gems = 500 WHERE id=$1`, [ALICE]));
    const plain = await db.query<{ gems: number }>(`SELECT gems FROM profiles WHERE id=$1`, [
      ALICE,
    ]);
    expect(plain.rows[0]!.gems).toBe(500);
    // Twice is harmless.
    await db.exec(down(NAME));

    // The browser still can't write its own XP or gems after the rollback.
    const forged = await as(db, "authenticated", ALICE, () =>
      attempt(db, `UPDATE profiles SET gems = 999999 WHERE id=$1`, [ALICE]),
    );
    expect(forged.ok).toBe(false);

    await db.exec(up(NAME));
    const balance = await db.query<{ gems: number; gems_earned: number }>(
      `SELECT gems, gems_earned FROM profiles WHERE id=$1`,
      [ALICE],
    );
    // Gems the old code added while it was rolled back are kept: earned catches up to
    // the balance plus what was spent, so nobody loses gems by a rollback and re-apply.
    expect(balance.rows[0]).toEqual({ gems: 500, gems_earned: 560 });
  }, 60_000);
});
