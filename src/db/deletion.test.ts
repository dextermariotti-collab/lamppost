import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migratedDb } from "@/test/db";
import { ALICE, BOB, createUsers, seedPersonData } from "@/test/seed";

/**
 * Account deletion removes the sign-in identity, and everything else must go with it.
 * These tests hold the schema to that: no table may hold a person's data without a
 * foreign key that either deletes it or unlinks it, and a real user's rows across the
 * tables really disappear.
 */

let db: PGlite;
beforeAll(async () => {
  db = await migratedDb();
}, 60_000);
afterAll(async () => {
  await db.close();
});

/** Columns that hold a person's id, wherever they appear. Add to this when a new one is invented. */
const PERSON_COLUMNS = [
  "user_id",
  "requester_id",
  "addressee_id",
  "from_user_id",
  "to_user_id",
  "proposed_by",
  "challenger_id",
  "opponent_id",
  "blocker_id",
  "blocked_id",
  "reporter_id",
  "reported_user_id",
];

describe("the shape of the schema", () => {
  it("references the sign-in identity only with ON DELETE CASCADE or SET NULL", async () => {
    const { rows } = await db.query<{ tbl: string; col: string; action: string }>(`
      SELECT c.conrelid::regclass::text AS tbl, a.attname AS col, c.confdeltype AS action
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
       WHERE c.contype = 'f' AND c.confrelid = 'auth.users'::regclass`);
    expect(rows.length).toBeGreaterThan(10);
    const wrong = rows.filter((r) => r.action !== "c" && r.action !== "n");
    expect(wrong, JSON.stringify(wrong)).toEqual([]);
  });

  it("keeps a person's id in a column with no foreign key nowhere", async () => {
    const { rows } = await db.query<{ tbl: string; col: string }>(
      `SELECT c.table_name AS tbl, c.column_name AS col
         FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.column_name = ANY ($1)
          AND NOT EXISTS (
            SELECT 1 FROM pg_constraint k
              JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = ANY (k.conkey)
             WHERE k.contype = 'f' AND k.conrelid = ('public.' || quote_ident(c.table_name))::regclass
               AND a.attname = c.column_name)`,
      [PERSON_COLUMNS],
    );
    expect(rows, JSON.stringify(rows)).toEqual([]);
  });

  it("holds the one thing keyed by text, the abuse counters, apart on purpose", async () => {
    const { rows } = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'rate_limits' AND column_name = 'key'`,
    );
    expect(rows).toHaveLength(1);
  });
});

describe("deleting a real account", () => {
  it("leaves nothing of theirs behind, keeps other people's data, and unlinks safety records", async () => {
    await createUsers(db, [ALICE, BOB]);
    await seedPersonData(db, ALICE, BOB);

    await db.query(`DELETE FROM auth.users WHERE id=$1`, [ALICE]);

    const gone = [
      ["profiles", "id"],
      ["friendships", "requester_id"],
      ["friendships", "addressee_id"],
      ["shared_streaks", "proposed_by"],
      ["nudges", "from_user_id"],
      ["daily_activity", "user_id"],
      ["user_achievements", "user_id"],
      ["argument_attempts", "user_id"],
      ["practice_sessions", "user_id"],
      ["subscriptions", "user_id"],
      ["debates", "challenger_id"],
      ["reward_chests", "user_id"],
      ["user_cosmetics", "user_id"],
      ["xp_weekly", "user_id"],
      ["league_results", "user_id"],
      ["consent_records", "user_id"],
      ["user_blocks", "blocker_id"],
    ] as const;
    for (const [table, column] of gone) {
      const left = await db.query(`SELECT 1 FROM ${table} WHERE ${column} = $1`, [ALICE]);
      expect(left.rows, `${table}.${column}`).toHaveLength(0);
    }
    // Safety records stay for audit, no longer linked to the person.
    const report = await db.query<{ user_id: string | null }>(
      `SELECT user_id FROM content_reports`,
    );
    expect(report.rows).toEqual([{ user_id: null }]);
    const filed = await db.query<{ reporter_id: string | null; reported_user_id: string }>(
      `SELECT reporter_id, reported_user_id FROM user_reports`,
    );
    expect(filed.rows).toEqual([{ reporter_id: null, reported_user_id: BOB }]);
    const block = await db.query<{ user_id: string | null }>(
      `SELECT user_id FROM moderation_blocks`,
    );
    expect(block.rows).toEqual([{ user_id: null }]);
    // Someone else's account is untouched.
    const bob = await db.query(`SELECT id FROM profiles WHERE id=$1`, [BOB]);
    expect(bob.rows).toHaveLength(1);
    // The one thing keyed by text is what the server removes itself after deleting the identity.
    const counters = await db.query(`SELECT 1 FROM rate_limits WHERE key = $1`, [`u:${ALICE}`]);
    expect(counters.rows).toHaveLength(1);
  });
});
