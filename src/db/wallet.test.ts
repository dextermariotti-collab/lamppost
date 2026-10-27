import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, attempt, migratedDb } from "@/test/db";

/**
 * Gems are spent on the server: the balance is earned minus spent, spending is one
 * atomic check-and-update, and no browser role can touch any of it.
 */
const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";

let db: PGlite;
const server = <T>(fn: () => Promise<T>) => as(db, "service_role", null, fn);
const user = <T>(id: string, fn: () => Promise<T>) => as(db, "authenticated", id, fn);

const earn = (id: string, total: number) =>
  server(() => attempt(db, `UPDATE profiles SET gems_earned = $2 WHERE id = $1`, [id, total]));

const spend = async (id: string, cost: number) => {
  const r = await server(() => attempt(db, `SELECT * FROM spend_gems($1, $2)`, [id, cost]));
  if (!r.ok) throw new Error(r.error);
  return r.rows[0] as { ok: boolean; balance: number; spent: number };
};

const row = async (id: string) =>
  (
    await db.query<{ gems: number; gems_earned: number; gems_spent: number }>(
      `SELECT gems, gems_earned, gems_spent FROM profiles WHERE id=$1`,
      [id],
    )
  ).rows[0]!;

beforeAll(async () => {
  db = await migratedDb();
  for (const [id, name] of [
    [ALICE, "alice"],
    [BOB, "bob"],
  ] as const) {
    await db.query(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, '{}')`, [
      id,
      `${name}@example.test`,
    ]);
  }
}, 60_000);
afterAll(async () => {
  await db.close();
});

describe("the balance", () => {
  it("is always earned minus spent, whatever wrote the row", async () => {
    await earn(ALICE, 150);
    expect(await row(ALICE)).toEqual({ gems: 150, gems_earned: 150, gems_spent: 0 });
    // A stale writer that still sets `gems` directly can't make it disagree.
    await server(() => attempt(db, `UPDATE profiles SET gems = 9999 WHERE id=$1`, [ALICE]));
    expect((await row(ALICE)).gems).toBe(150);
  });
});

describe("applying the migration to an existing database", () => {
  const FILE = "20260929100200_server_wallet.sql";

  it("turns each existing balance into lifetime earnings, and can be run twice", async () => {
    const old = await migratedDb({ skip: [FILE] });
    await old.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1,'c@example.test','{}')`,
      ["00000000-0000-0000-0000-00000000000c"],
    );
    await old.query(`UPDATE profiles SET gems = 75`);
    const sql = readFileSync(join(process.cwd(), "supabase/migrations", FILE), "utf8");

    await old.exec(sql);
    const after = await old.query(`SELECT gems, gems_earned, gems_spent FROM profiles`);
    expect(after.rows).toEqual([{ gems: 75, gems_earned: 75, gems_spent: 0 }]);

    await old.exec(sql);
    const again = await old.query(`SELECT gems, gems_earned, gems_spent FROM profiles`);
    expect(again.rows).toEqual(after.rows);
    await old.close();
  }, 60_000);
});

describe("spend_gems", () => {
  it("spends gems the account has earned, and reports the new balance", async () => {
    await earn(BOB, 200);
    expect(await spend(BOB, 60)).toEqual({ ok: true, balance: 140, spent: 60 });
    expect(await row(BOB)).toEqual({ gems: 140, gems_earned: 200, gems_spent: 60 });
  });

  it("refuses to spend gems that haven't been earned, and changes nothing", async () => {
    const before = await row(BOB);
    const result = await spend(BOB, 500);
    expect(result).toEqual({ ok: false, balance: before.gems, spent: before.gems_spent });
    expect(await row(BOB)).toEqual(before);
  });

  it("lets the last gems be spent exactly, and no more", async () => {
    await earn(ALICE, 120);
    expect((await spend(ALICE, 60)).ok).toBe(true);
    expect((await spend(ALICE, 60)).ok).toBe(true);
    const third = await spend(ALICE, 60);
    expect(third.ok).toBe(false);
    expect((await row(ALICE)).gems).toBe(0);
  });

  it("can't be spent twice by requests that arrive together", async () => {
    await earn(BOB, 60 + 3 * 60);
    const before = (await row(BOB)).gems;
    const results = await Promise.all(Array.from({ length: 10 }, () => spend(BOB, 60)));
    const wins = results.filter((r) => r.ok).length;
    expect(wins).toBe(Math.floor(before / 60));
    const after = await row(BOB);
    expect(after.gems).toBe(before - wins * 60);
    expect(after.gems).toBeGreaterThanOrEqual(0);
  });

  it("only touches the account it is asked about", async () => {
    const other = await row(ALICE);
    await earn(BOB, (await row(BOB)).gems_earned + 120);
    await spend(BOB, 60);
    expect(await row(ALICE)).toEqual(other);
  });

  it("says so, rather than inventing a balance, for an account that doesn't exist", async () => {
    expect(await spend("00000000-0000-0000-0000-0000000000ff", 60)).toEqual({
      ok: false,
      balance: 0,
      spent: 0,
    });
  });

  it("rejects nonsense amounts", async () => {
    for (const cost of [0, -5, 1_000_000]) {
      const r = await server(() => attempt(db, `SELECT * FROM spend_gems($1, $2)`, [ALICE, cost]));
      expect(r.ok, `cost ${cost}`).toBe(false);
    }
  });
});

describe("the database itself refuses an overdrawn account", () => {
  it("even for the server, if the code around it had a bug", async () => {
    const r = await server(() =>
      attempt(db, `UPDATE profiles SET gems_spent = gems_earned + 1 WHERE id=$1`, [ALICE]),
    );
    expect(r.ok).toBe(false);
  });
});

describe("no browser role can touch the wallet", () => {
  it("cannot read, write or run any of it", async () => {
    for (const [role, uid] of [
      ["authenticated", ALICE],
      ["anon", null],
    ] as const) {
      for (const sql of [
        `UPDATE profiles SET gems_earned = 999999 WHERE id = '${ALICE}'`,
        `UPDATE profiles SET gems_spent = 0 WHERE id = '${ALICE}'`,
        `UPDATE profiles SET gems = 999999 WHERE id = '${ALICE}'`,
        `SELECT gems_earned FROM profiles WHERE id = '${ALICE}'`,
        `SELECT gems_spent FROM profiles WHERE id = '${ALICE}'`,
        `SELECT * FROM spend_gems('${ALICE}', 1)`,
      ]) {
        const r = await as(db, role, uid, () => attempt(db, sql));
        expect(r.ok, `${role}: ${sql}`).toBe(false);
      }
    }
  });

  it("cannot spend or refund by changing the columns the guard protects", async () => {
    const before = await row(ALICE);
    await user(ALICE, () =>
      attempt(db, `UPDATE profiles SET display_name = 'x' WHERE id = $1`, [ALICE]),
    );
    expect(await row(ALICE)).toEqual(before);
  });
});
