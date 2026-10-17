import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, attempt, migratedDb } from "@/test/db";

/**
 * Rewards and the friends league, in real Postgres, as the role that uses them
 * (the service role) and as the roles that must not: every counter is written by
 * one atomic statement, and no browser role can touch any of it.
 */
const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";
const CAROL = "00000000-0000-0000-0000-00000000000c";
const DAN = "00000000-0000-0000-0000-00000000000d";
const FILE = "20260929110000_rewards_and_league.sql";

let db: PGlite;
const server = <T>(fn: () => Promise<T>) => as(db, "service_role", null, fn);
const call = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
  const r = await server(() => attempt(db, sql, params));
  if (!r.ok) throw new Error(r.error);
  return r.rows as T[];
};
const profile = async (id: string) =>
  (
    await db.query<{
      gems: number;
      gems_earned: number;
      gems_spent: number;
      gems_granted: number;
      hint_tokens: number;
      league_tier: number;
    }>(
      `SELECT gems, gems_earned, gems_spent, gems_granted, hint_tokens, league_tier FROM profiles WHERE id=$1`,
      [id],
    )
  ).rows[0]!;
const earn = (id: string, total: number) =>
  server(() => attempt(db, `UPDATE profiles SET gems_earned = $2 WHERE id = $1`, [id, total]));

const chest = (
  user: string,
  day: string,
  kind: "gems" | "hint",
  amount: number,
  cap = 3,
  source = "lesson",
) =>
  call<{
    ok: boolean;
    reason: string | null;
    kind: string | null;
    amount: number;
    converted: boolean;
    opened_today: number;
    balance: number;
    hint_tokens: number;
  }>(`SELECT * FROM grant_chest($1, $2::date, $3, $4, $5, $6, 5, 5)`, [
    user,
    day,
    source,
    kind,
    amount,
    cap,
  ]).then((rows) => rows[0]!);

beforeAll(async () => {
  db = await migratedDb();
  for (const [id, name] of [
    [ALICE, "alice"],
    [BOB, "bob"],
    [CAROL, "carol"],
    [DAN, "dan"],
  ] as const) {
    await db.query(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1,$2,$3)`, [
      id,
      `${name}@example.test`,
      JSON.stringify({ display_name: name }),
    ]);
  }
  // alice–bob friends; carol has only asked alice; dan is a stranger.
  await db.query(
    `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'accepted'), ($3,$1,'pending')`,
    [ALICE, BOB, CAROL],
  );
}, 60_000);
afterAll(async () => {
  await db.close();
});

describe("the wallet with server grants", () => {
  it("is earned plus granted minus spent, and spending draws on grants too", async () => {
    await earn(ALICE, 30);
    await chest(ALICE, "2026-09-28", "gems", 40, 9);
    expect(await profile(ALICE)).toMatchObject({ gems: 70, gems_earned: 30, gems_granted: 40 });
    const [spent] = await call<{ ok: boolean; balance: number; spent: number; granted: number }>(
      `SELECT * FROM spend_gems($1, 60)`,
      [ALICE],
    );
    expect(spent).toEqual({ ok: true, balance: 10, spent: 60, granted: 40 });
    const [refused] = await call<{ ok: boolean; balance: number }>(
      `SELECT * FROM spend_gems($1, 60)`,
      [ALICE],
    );
    expect(refused).toMatchObject({ ok: false, balance: 10 });
  });

  it("can't be overdrawn, even by the server writing a bad number", async () => {
    const r = await server(() =>
      attempt(db, `UPDATE profiles SET gems_spent = gems_earned + gems_granted + 1 WHERE id=$1`, [
        ALICE,
      ]),
    );
    expect(r.ok).toBe(false);
  });
});

describe("reward chests", () => {
  it("credits gems, records what came out, and counts the day", async () => {
    const before = await profile(BOB);
    const first = await chest(BOB, "2026-09-28", "gems", 10, 3, "review");
    expect(first).toMatchObject({
      ok: true,
      kind: "gems",
      amount: 10,
      converted: false,
      opened_today: 1,
    });
    expect(first.balance).toBe(before.gems + 10);
    const rows = await db.query(
      `SELECT source, kind, amount, opened_on::text AS day FROM reward_chests WHERE user_id=$1`,
      [BOB],
    );
    expect(rows.rows).toEqual([{ source: "review", kind: "gems", amount: 10, day: "2026-09-28" }]);
  });

  it("stops at the daily cap and says why, without giving anything", async () => {
    await chest(BOB, "2026-09-28", "gems", 5);
    await chest(BOB, "2026-09-28", "gems", 5);
    const before = await profile(BOB);
    const fourth = await chest(BOB, "2026-09-28", "gems", 40);
    expect(fourth).toMatchObject({ ok: false, reason: "daily-limit", opened_today: 3 });
    expect(await profile(BOB)).toEqual(before);
    expect(
      (
        await db.query(`SELECT 1 FROM reward_chests WHERE user_id=$1 AND opened_on='2026-09-28'`, [
          BOB,
        ])
      ).rows,
    ).toHaveLength(3);
  });

  it("starts fresh on the next day", async () => {
    const next = await chest(BOB, "2026-09-29", "gems", 5);
    expect(next).toMatchObject({ ok: true, opened_today: 1 });
  });

  it("gives out no more than the cap when many are opened at once", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => chest(CAROL, "2026-09-28", "gems", 5)),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect((await profile(CAROL)).gems_granted).toBe(15);
  });

  it("honors a lower cap, such as one earned by little activity", async () => {
    await chest(DAN, "2026-09-28", "gems", 5, 1);
    expect(await chest(DAN, "2026-09-28", "gems", 5, 1)).toMatchObject({
      ok: false,
      reason: "daily-limit",
    });
    expect(await chest(DAN, "2026-09-27", "gems", 5, 0)).toMatchObject({
      ok: false,
      reason: "daily-limit",
    });
  });

  it("holds a hint token, and turns one into gems when the pouch is full, saying so", async () => {
    const day = "2026-09-20";
    await server(() => attempt(db, `UPDATE profiles SET hint_tokens = 4 WHERE id=$1`, [ALICE]));
    const held = await chest(ALICE, day, "hint", 1, 9);
    expect(held).toMatchObject({
      ok: true,
      kind: "hint",
      amount: 1,
      converted: false,
      hint_tokens: 5,
    });
    const overflow = await chest(ALICE, day, "hint", 1, 9);
    expect(overflow).toMatchObject({
      ok: true,
      kind: "gems",
      amount: 5,
      converted: true,
      hint_tokens: 5,
    });
    const row = await db.query(
      `SELECT kind, amount, converted FROM reward_chests WHERE user_id=$1 AND opened_on=$2 ORDER BY created_at DESC, id LIMIT 2`,
      [ALICE, day],
    );
    expect(row.rows).toEqual(
      expect.arrayContaining([{ kind: "gems", amount: 5, converted: true }]),
    );
  });

  it("refuses nonsense and unknown accounts", async () => {
    for (const args of [
      ["gems", 0],
      ["gems", 5000],
      ["coins", 5],
    ] as const) {
      const r = await server(() =>
        attempt(db, `SELECT * FROM grant_chest($1,'2026-09-28','lesson',$2,$3,3,5,5)`, [
          ALICE,
          args[0],
          args[1],
        ]),
      );
      expect(r.ok, String(args)).toBe(false);
    }
    const stranger = await chest("00000000-0000-0000-0000-0000000000ff", "2026-09-28", "gems", 5);
    expect(stranger).toMatchObject({ ok: false, reason: "no-profile" });
    const bad = await server(() =>
      attempt(db, `SELECT * FROM grant_chest($1,'2026-09-28','casino','gems',5,3,5,5)`, [ALICE]),
    );
    expect(bad.ok).toBe(false);
  });
});

describe("hint tokens", () => {
  const buy = async (id: string) =>
    (
      await call<{ ok: boolean; reason: string | null; balance: number; hint_tokens: number }>(
        `SELECT * FROM buy_hint_token($1, 20, 5)`,
        [id],
      )
    )[0]!;

  it("costs gems, up to the size of the pouch", async () => {
    await earn(CAROL, 500);
    await server(() => attempt(db, `UPDATE profiles SET hint_tokens = 0 WHERE id=$1`, [CAROL]));
    const start = (await profile(CAROL)).gems;
    const got = await buy(CAROL);
    expect(got).toMatchObject({ ok: true, hint_tokens: 1, balance: start - 20 });
    for (let i = 0; i < 4; i++) expect((await buy(CAROL)).ok).toBe(true);
    expect(await buy(CAROL)).toMatchObject({ ok: false, reason: "pouch-full", hint_tokens: 5 });
    expect((await profile(CAROL)).gems).toBe(start - 100);
  });

  it("refuses when the gems aren't there, and takes nothing", async () => {
    await server(() =>
      attempt(
        db,
        `UPDATE profiles SET gems_earned = 0, gems_granted = 0, gems_spent = 0, hint_tokens = 0 WHERE id=$1`,
        [DAN],
      ),
    );
    expect(await buy(DAN)).toMatchObject({ ok: false, reason: "not-enough-gems", balance: 0 });
    expect((await profile(DAN)).hint_tokens).toBe(0);
  });

  it("uses one token at a time and never goes below zero", async () => {
    await server(() => attempt(db, `UPDATE profiles SET hint_tokens = 1 WHERE id=$1`, [DAN]));
    const use = async () =>
      (
        await call<{ ok: boolean; hint_tokens: number }>(`SELECT * FROM use_hint_token($1)`, [DAN])
      )[0]!;
    expect(await use()).toEqual({ ok: true, hint_tokens: 0 });
    expect(await use()).toEqual({ ok: false, hint_tokens: 0 });
  });

  it("can't be used twice by requests that arrive together", async () => {
    await server(() => attempt(db, `UPDATE profiles SET hint_tokens = 2 WHERE id=$1`, [DAN]));
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        call<{ ok: boolean }>(`SELECT * FROM use_hint_token($1)`, [DAN]),
      ),
    );
    expect(results.filter((r) => r[0]!.ok)).toHaveLength(2);
    expect((await profile(DAN)).hint_tokens).toBe(0);
  });
});

describe("cosmetics", () => {
  const unlock = async (id: string, item: string, cost = 80) =>
    (
      await call<{ ok: boolean; reason: string | null; balance: number }>(
        `SELECT * FROM unlock_cosmetic($1, $2, $3)`,
        [id, item, cost],
      )
    )[0]!;

  it("unlocks an item once, for its price", async () => {
    await earn(BOB, 400);
    const start = (await profile(BOB)).gems;
    expect(await unlock(BOB, "headphones")).toMatchObject({ ok: true, balance: start - 80 });
    expect(await unlock(BOB, "headphones")).toMatchObject({
      ok: false,
      reason: "owned",
      balance: start - 80,
    });
    expect(
      (await db.query(`SELECT item FROM user_cosmetics WHERE user_id=$1`, [BOB])).rows,
    ).toEqual([{ item: "headphones" }]);
  });

  it("refuses when the gems aren't there", async () => {
    await server(() =>
      attempt(
        db,
        `UPDATE profiles SET gems_earned = 10, gems_granted = 0, gems_spent = 0 WHERE id=$1`,
        [DAN],
      ),
    );
    expect(await unlock(DAN, "crown", 200)).toMatchObject({
      ok: false,
      reason: "not-enough-gems",
      balance: 10,
    });
    expect(
      (await db.query(`SELECT 1 FROM user_cosmetics WHERE user_id=$1`, [DAN])).rows,
    ).toHaveLength(0);
  });

  it("takes the gems once when the same item is bought twice at once", async () => {
    await earn(CAROL, 2000);
    const start = (await profile(CAROL)).gems;
    const results = await Promise.all(Array.from({ length: 5 }, () => unlock(CAROL, "bow", 100)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await profile(CAROL)).gems).toBe(start - 100);
  });

  it("rejects an empty or oversized item name", async () => {
    for (const item of ["", "x".repeat(41)]) {
      const r = await server(() =>
        attempt(db, `SELECT * FROM unlock_cosmetic($1,$2,10)`, [ALICE, item]),
      );
      expect(r.ok, item).toBe(false);
    }
  });
});

describe("weekly XP and the friends league", () => {
  it("adds up XP for a week, and ignores zero or negative amounts", async () => {
    for (const delta of [30, 20, 0, -50]) {
      await call(`SELECT record_weekly_xp($1, '2026-09-21', $2)`, [ALICE, delta]);
    }
    const r = await db.query(
      `SELECT xp FROM xp_weekly WHERE user_id=$1 AND week_start='2026-09-21'`,
      [ALICE],
    );
    expect(r.rows).toEqual([{ xp: 50 }]);
  });

  it("lists the learner and their accepted friends who share, and nobody else", async () => {
    // Both people have to have chosen to share progress with friends.
    await db.query(`UPDATE profiles SET profile_visibility = 'friends' WHERE id = ANY($1)`, [
      [ALICE, BOB],
    ]);
    await call(`SELECT record_weekly_xp($1, '2026-09-21', 120)`, [BOB]);
    await call(`SELECT record_weekly_xp($1, '2026-09-21', 999)`, [CAROL]); // pending request only
    await call(`SELECT record_weekly_xp($1, '2026-09-21', 999)`, [DAN]); // a stranger
    const rows = await call<{ handle: string; weekly_xp: number; id: string }>(
      `SELECT * FROM league_standings($1, '2026-09-21')`,
      [ALICE],
    );
    expect(rows.map((r) => r.id).sort()).toEqual([ALICE, BOB].sort());
    expect(rows.map((r) => r.weekly_xp)).toEqual([120, 50]);
  });

  it("shows a friend with no XP that week as zero rather than leaving them out", async () => {
    const rows = await call<{ id: string; weekly_xp: number }>(
      `SELECT * FROM league_standings($1, '2026-09-14')`,
      [ALICE],
    );
    expect(rows.map((r) => r.weekly_xp)).toEqual([0, 0]);
  });

  it("returns only public profile fields, never private ones", async () => {
    const rows = await call(`SELECT * FROM league_standings($1, '2026-09-21')`, [ALICE]);
    expect(Object.keys(rows[0]!).sort()).toEqual(
      [
        "companion_accessory",
        "companion_expression",
        "companion_palette",
        "companion_preset",
        "display_name",
        "handle",
        "id",
        "league_tier",
        "weekly_xp",
      ].sort(),
    );
  });

  it("judges a week once: the tier changes the first time and never again", async () => {
    const apply = async (after: number) =>
      (
        await call<{ apply_league_result: boolean }>(
          `SELECT apply_league_result($1, '2026-09-14', 1, 4, 300, 0::smallint, $2::smallint)`,
          [ALICE, after],
        )
      )[0]!.apply_league_result;
    expect(await apply(1)).toBe(true);
    expect((await profile(ALICE)).league_tier).toBe(1);
    expect(await apply(2)).toBe(false);
    expect((await profile(ALICE)).league_tier).toBe(1);
    expect(
      (
        await db.query(`SELECT tier_before, tier_after FROM league_results WHERE user_id=$1`, [
          ALICE,
        ])
      ).rows,
    ).toEqual([{ tier_before: 0, tier_after: 1 }]);
  });

  it("refuses a tier outside the ladder", async () => {
    for (const tier of [-1, 5]) {
      const r = await server(() =>
        attempt(
          db,
          `SELECT apply_league_result($1,'2026-09-07',1,3,100,0::smallint,$2::smallint)`,
          [ALICE, tier],
        ),
      );
      expect(r.ok, String(tier)).toBe(false);
    }
  });
});

describe("no browser role can reach any of it", () => {
  it("cannot read, write or run anything new", async () => {
    for (const [role, uid] of [
      ["authenticated", ALICE],
      ["anon", null],
    ] as const) {
      for (const sql of [
        `SELECT * FROM reward_chests`,
        `INSERT INTO reward_chests (user_id, opened_on, source, kind, amount) VALUES ('${ALICE}','2026-09-28','lesson','gems',999)`,
        `SELECT * FROM user_cosmetics`,
        `INSERT INTO user_cosmetics (user_id, item) VALUES ('${ALICE}','crown')`,
        `SELECT * FROM xp_weekly`,
        `UPDATE xp_weekly SET xp = 99999`,
        `SELECT * FROM league_results`,
        `UPDATE profiles SET gems_granted = 9999 WHERE id='${ALICE}'`,
        `UPDATE profiles SET hint_tokens = 99 WHERE id='${ALICE}'`,
        `UPDATE profiles SET league_tier = 4 WHERE id='${ALICE}'`,
        `SELECT hint_tokens FROM profiles WHERE id='${ALICE}'`,
        `SELECT * FROM grant_chest('${ALICE}','2026-09-28','lesson','gems',5,3,5,5)`,
        `SELECT * FROM buy_hint_token('${ALICE}',1,5)`,
        `SELECT * FROM use_hint_token('${ALICE}')`,
        `SELECT * FROM unlock_cosmetic('${ALICE}','crown',1)`,
        `SELECT record_weekly_xp('${ALICE}','2026-09-21',999)`,
        `SELECT * FROM league_standings('${BOB}','2026-09-21')`,
        `SELECT apply_league_result('${ALICE}','2026-09-01',1,3,100,0::smallint,4::smallint)`,
      ]) {
        const r = await as(db, role, uid, () => attempt(db, sql));
        expect(r.ok, `${role}: ${sql}`).toBe(false);
      }
    }
  });
});

describe("an account's rewards go with the account", () => {
  it("deleting the sign-in identity removes chests, cosmetics, weekly XP and results", async () => {
    await db.query(`DELETE FROM profiles WHERE id=$1`, [BOB]);
    await db.query(`DELETE FROM auth.users WHERE id=$1`, [BOB]);
    for (const table of ["reward_chests", "user_cosmetics", "xp_weekly", "league_results"]) {
      const r = await db.query(`SELECT 1 FROM ${table} WHERE user_id=$1`, [BOB]);
      expect(r.rows, table).toHaveLength(0);
    }
  });
});

describe("applying the migration to an existing database", () => {
  it("keeps every balance, and can be applied twice", async () => {
    const old = await migratedDb({ before: FILE });
    await old.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1,'e@example.test','{}')`,
      ["00000000-0000-0000-0000-0000000000e1"],
    );
    await old.query(`UPDATE profiles SET gems_earned = 200, gems_spent = 60`);
    const before = await old.query(`SELECT gems FROM profiles`);
    expect(before.rows).toEqual([{ gems: 140 }]);

    const sql = readFileSync(join(process.cwd(), "supabase/migrations", FILE), "utf8");
    await old.exec(sql);
    const after = await old.query(
      `SELECT gems, gems_granted, hint_tokens, league_tier FROM profiles`,
    );
    expect(after.rows).toEqual([{ gems: 140, gems_granted: 0, hint_tokens: 0, league_tier: 0 }]);

    await old.exec(sql);
    expect((await old.query(`SELECT gems FROM profiles`)).rows).toEqual([{ gems: 140 }]);
    await old.close();
  }, 60_000);
});
