import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, attempt, migratedDb } from "@/test/db";

/**
 * Consent and age band, against the real migration: the server stamps the time, a teen
 * needs the guardian confirmation, the browser can neither read nor write any of it, and
 * the documented rollback removes it cleanly.
 */
const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";
const NAME = "20260930100000_consent_and_age";
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

let db: PGlite;
const server = <T>(fn: () => Promise<T>) => as(db, "service_role", null, fn);
const consent = (user: string, band: string | null, guardian: boolean | null, terms = "t1") =>
  attempt(db, `SELECT public.record_consent($1, $2, 'p1', $3, $4) AS at`, [
    user,
    terms,
    band,
    guardian,
  ]);

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

describe("record_consent", () => {
  it("stamps the time itself and updates the profile", async () => {
    const before = Date.now();
    const result = await server(() => consent(ALICE, "18+", false));
    expect(result.ok).toBe(true);
    const profile = (
      await db.query<Record<string, unknown>>(
        `SELECT terms_version, privacy_version, terms_accepted_at, age_band, guardian_confirmed FROM profiles WHERE id=$1`,
        [ALICE],
      )
    ).rows[0]!;
    expect(profile).toMatchObject({
      terms_version: "t1",
      privacy_version: "p1",
      age_band: "18+",
      guardian_confirmed: false,
    });
    const at = new Date(profile["terms_accepted_at"] as string).getTime();
    expect(at).toBeGreaterThanOrEqual(before - 5_000);
    expect(at).toBeLessThanOrEqual(Date.now() + 5_000);
  });

  it("keeps every acceptance as history and the latest on the profile", async () => {
    await server(() => consent(ALICE, "18+", false, "t2"));
    const history = await db.query(
      `SELECT terms_version FROM consent_records WHERE user_id=$1 ORDER BY accepted_at, id`,
      [ALICE],
    );
    expect(history.rows.length).toBeGreaterThanOrEqual(2);
    const latest = (
      await db.query<{ terms_version: string }>(`SELECT terms_version FROM profiles WHERE id=$1`, [
        ALICE,
      ])
    ).rows[0]!;
    expect(latest.terms_version).toBe("t2");
  });

  it("needs the guardian's confirmation for 13-17, and stores it", async () => {
    expect((await server(() => consent(BOB, "13-17", false))).ok).toBe(false);
    expect((await server(() => consent(BOB, "13-17", null))).ok).toBe(false);
    expect((await server(() => consent(BOB, "13-17", true))).ok).toBe(true);
    const row = (
      await db.query<{ guardian_confirmed: boolean; age_band: string }>(
        `SELECT guardian_confirmed, age_band FROM profiles WHERE id=$1`,
        [BOB],
      )
    ).rows[0]!;
    expect(row).toEqual({ guardian_confirmed: true, age_band: "13-17" });
  });

  it("does not keep a guardian confirmation for an adult", async () => {
    await server(() => consent(ALICE, "18+", true, "t3"));
    const row = (
      await db.query<{ guardian_confirmed: boolean }>(
        `SELECT guardian_confirmed FROM profiles WHERE id=$1`,
        [ALICE],
      )
    ).rows[0]!;
    expect(row.guardian_confirmed).toBe(false);
  });

  it("has no age band for under-13s, so there is nothing to store for them", async () => {
    for (const band of ["12", "under-13", "", null]) {
      expect((await server(() => consent(ALICE, band, true))).ok, String(band)).toBe(false);
    }
    const bad = await server(() =>
      attempt(db, `UPDATE profiles SET age_band='9' WHERE id=$1`, [ALICE]),
    );
    expect(bad.ok).toBe(false);
  });

  it("refuses an unknown user and an empty or oversized version", async () => {
    expect(
      (await server(() => consent("00000000-0000-0000-0000-0000000000ff", "18+", false))).ok,
    ).toBe(false);
    expect((await server(() => consent(ALICE, "18+", false, ""))).ok).toBe(false);
    expect((await server(() => consent(ALICE, "18+", false, "x".repeat(41)))).ok).toBe(false);
  });
});

describe("what the browser can reach", () => {
  it("can't run the function, read the columns or the history, or write any of it", async () => {
    for (const sql of [
      `SELECT public.record_consent('${ALICE}', 't', 'p', '18+', false)`,
      `SELECT terms_version FROM profiles WHERE id='${ALICE}'`,
      `SELECT age_band FROM profiles WHERE id='${ALICE}'`,
      `SELECT * FROM consent_records`,
      `UPDATE profiles SET age_band='18+' WHERE id='${ALICE}'`,
      `UPDATE profiles SET terms_version='t9' WHERE id='${ALICE}'`,
      `INSERT INTO consent_records (user_id, terms_version, privacy_version, age_band) VALUES ('${ALICE}','t','p','18+')`,
    ]) {
      const asUser = await as(db, "authenticated", ALICE, () => attempt(db, sql));
      expect(asUser.ok, sql).toBe(false);
      const asGuest = await as(db, "anon", null, () => attempt(db, sql));
      expect(asGuest.ok, sql).toBe(false);
    }
  });

  it("goes with the account when it is deleted", async () => {
    await db.query(`DELETE FROM auth.users WHERE id=$1`, [BOB]);
    const left = await db.query(`SELECT 1 FROM consent_records WHERE user_id=$1`, [BOB]);
    expect(left.rows).toHaveLength(0);
  });
});

describe("the documented rollback", () => {
  it("removes the columns, the history and the function, is safe twice, and can be re-applied", async () => {
    await db.exec(read(`docs/rollback/${NAME}.down.sql`));
    await db.exec(read(`docs/rollback/${NAME}.down.sql`));
    const cols = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name IN ('age_band','terms_version','guardian_confirmed')`,
    );
    expect(cols.rows).toHaveLength(0);
    const fn = await db.query(`SELECT 1 FROM pg_proc WHERE proname='record_consent'`);
    expect(fn.rows).toHaveLength(0);
    // The rest of the profile is untouched.
    const still = await db.query(`SELECT id FROM profiles WHERE id=$1`, [ALICE]);
    expect(still.rows).toHaveLength(1);

    await db.exec(read(`supabase/migrations/${NAME}.sql`));
    expect((await server(() => consent(ALICE, "18+", false))).ok).toBe(true);
  }, 60_000);
});
