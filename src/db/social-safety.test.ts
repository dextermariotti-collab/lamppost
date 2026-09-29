import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, attempt, migratedDb } from "@/test/db";
import { ALICE, BOB, CAROL, createUsers, seedPersonData } from "@/test/seed";

/**
 * Blocking, reporting and profile visibility, against the real migration: what a stranger and
 * a friend can see by default, that a block ends a friendship and can't be undone by the
 * blocked person, that the friends league only includes people who chose to share, and that
 * the documented rollback restores the old rules.
 */
const NAME = "20260930100200_blocks_reports_visibility";
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

let db: PGlite;
const server = <T>(fn: () => Promise<T>) => as(db, "service_role", null, fn);
const asUser = <T>(id: string, fn: () => Promise<T>) => as(db, "authenticated", id, fn);
const count = async (sql: string, params: unknown[] = []) =>
  ((await db.query<{ n: number }>(sql, params)).rows[0]?.n ?? 0) as number;
const setVisibility = (id: string, value: "minimal" | "friends") =>
  server(() => db.query(`UPDATE profiles SET profile_visibility = $2 WHERE id = $1`, [id, value]));

beforeAll(async () => {
  db = await migratedDb();
  await createUsers(db, [ALICE, BOB, CAROL]);
  await seedPersonData(db, ALICE, BOB);
}, 60_000);
afterAll(async () => {
  await db.close();
});

describe("profile visibility", () => {
  it("starts as minimal for everyone", async () => {
    const { rows } = await db.query<{ profile_visibility: string }>(
      `SELECT profile_visibility FROM profiles`,
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.profile_visibility === "minimal")).toBe(true);
  });

  it("means a friend can't read progress, activity or badges", async () => {
    const q = (sql: string) => asUser(BOB, () => attempt(db, sql));
    const profile = await q(`SELECT total_xp FROM profiles WHERE id = '${ALICE}'`);
    expect(profile.ok && profile.rows.length).toBe(0);
    const activity = await q(`SELECT 1 FROM daily_activity WHERE user_id = '${ALICE}'`);
    expect(activity.ok && activity.rows.length).toBe(0);
    const badges = await q(`SELECT 1 FROM user_achievements WHERE user_id = '${ALICE}'`);
    expect(badges.ok && badges.rows.length).toBe(0);
  });

  it("lets a friend see them once the owner chooses to share, and not before or after", async () => {
    await setVisibility(ALICE, "friends");
    const q = (sql: string) => asUser(BOB, () => attempt(db, sql));
    const shared = await q(`SELECT total_xp FROM profiles WHERE id = '${ALICE}'`);
    expect(shared.ok && shared.rows.length).toBe(1);
    expect(
      (await q(`SELECT 1 FROM daily_activity WHERE user_id = '${ALICE}'`)).ok &&
        (await q(`SELECT 1 FROM daily_activity WHERE user_id = '${ALICE}'`)).rows?.length,
    ).toBe(1);
    // A stranger still sees nothing.
    const stranger = await asUser(CAROL, () =>
      attempt(db, `SELECT total_xp FROM profiles WHERE id = '${ALICE}'`),
    );
    expect(stranger.ok && stranger.rows.length).toBe(0);

    await setVisibility(ALICE, "minimal");
    const hidden = await q(`SELECT total_xp FROM profiles WHERE id = '${ALICE}'`);
    expect(hidden.ok && hidden.rows.length).toBe(0);
  });

  it("can't be read or changed from the browser", async () => {
    const read = await asUser(ALICE, () => attempt(db, `SELECT profile_visibility FROM profiles`));
    expect(read.ok).toBe(false);
    const write = await asUser(ALICE, () =>
      attempt(db, `UPDATE profiles SET profile_visibility = 'friends' WHERE id = '${ALICE}'`),
    );
    expect(write.ok).toBe(false);
  });

  it("rejects a value the app doesn't know", async () => {
    const bad = await server(() =>
      attempt(db, `UPDATE profiles SET profile_visibility = 'public' WHERE id = '${ALICE}'`),
    );
    expect(bad.ok).toBe(false);
  });
});

describe("discovery", () => {
  it("shows a stranger a name and an avatar, and no streak", async () => {
    const found = await asUser(CAROL, () =>
      attempt(db, `SELECT * FROM search_profiles('example')`),
    );
    // Nobody has a handle containing "example"; use the real handle.
    expect(found.ok).toBe(true);
    const handle = (
      await db.query<{ handle: string }>(`SELECT handle FROM profiles WHERE id=$1`, [ALICE])
    ).rows[0]!.handle;
    const rows = await asUser(CAROL, () =>
      attempt(db, `SELECT * FROM search_profiles($1)`, [handle]),
    );
    expect(rows.ok && rows.rows.map((r) => r["id"])).toContain(ALICE);
    expect(rows.ok && rows.rows.every((r) => r["current_streak"] === null)).toBe(true);
  });
});

describe("blocking", () => {
  it("is done by the server only", async () => {
    const call = await asUser(ALICE, () =>
      attempt(db, `SELECT public.block_user('${ALICE}', '${CAROL}')`),
    );
    expect(call.ok).toBe(false);
    const insert = await asUser(ALICE, () =>
      attempt(
        db,
        `INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ('${ALICE}','${CAROL}')`,
      ),
    );
    expect(insert.ok).toBe(false);
  });

  it("ends the friendship, its shared streak and the nudges between the two", async () => {
    expect(await count(`SELECT count(*)::int n FROM friendships`)).toBe(1);
    expect(await count(`SELECT count(*)::int n FROM shared_streaks`)).toBe(1);
    expect(await count(`SELECT count(*)::int n FROM nudges`)).toBe(1);
    const done = await server(() => attempt(db, `SELECT public.block_user($1, $2)`, [ALICE, BOB]));
    expect(done.ok).toBe(true);
    expect(await count(`SELECT count(*)::int n FROM friendships`)).toBe(0);
    expect(await count(`SELECT count(*)::int n FROM shared_streaks`)).toBe(0);
    expect(await count(`SELECT count(*)::int n FROM nudges`)).toBe(0);
    // Doing it twice is harmless.
    const again = await server(() => attempt(db, `SELECT public.block_user($1, $2)`, [ALICE, BOB]));
    expect(again.ok).toBe(true);
    expect(await count(`SELECT count(*)::int n FROM user_blocks`)).toBe(1);
  });

  it("stops a request in either direction, without saying why", async () => {
    for (const [from, to] of [
      [ALICE, BOB],
      [BOB, ALICE],
    ] as const) {
      const r = await asUser(from, () =>
        attempt(
          db,
          `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ('${from}','${to}','pending')`,
        ),
      );
      expect(r.ok).toBe(false);
      expect(!r.ok && r.error).toMatch(/could not be sent/);
    }
    // Someone unrelated is unaffected.
    const fine = await asUser(CAROL, () =>
      attempt(
        db,
        `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ('${CAROL}','${ALICE}','pending')`,
      ),
    );
    expect(fine.ok).toBe(true);
    await server(() => db.query(`DELETE FROM friendships`));
  });

  it("hides each from the other in search and invite lookup", async () => {
    const handles = new Map<string, string>();
    const invites = new Map<string, string>();
    for (const id of [ALICE, BOB]) {
      const row = (
        await db.query<{ handle: string; invite_code: string }>(
          `SELECT handle, invite_code FROM profiles WHERE id=$1`,
          [id],
        )
      ).rows[0]!;
      handles.set(id, row.handle);
      invites.set(id, row.invite_code);
    }
    for (const [viewer, other] of [
      [ALICE, BOB],
      [BOB, ALICE],
    ] as const) {
      const s = await asUser(viewer, () =>
        attempt(db, `SELECT id FROM search_profiles($1)`, [handles.get(other)]),
      );
      expect(s.ok && s.rows.map((r) => r["id"])).not.toContain(other);
      expect(s.ok).toBe(true);
      const i = await asUser(viewer, () =>
        attempt(db, `SELECT id FROM profile_by_invite($1)`, [invites.get(other)]),
      );
      expect(i.ok && i.rows).toEqual([]);
    }
  });

  it("is invisible to the person blocked, who can't lift it", async () => {
    const seen = await asUser(BOB, () => attempt(db, `SELECT * FROM user_blocks`));
    expect(seen.ok && seen.rows.length).toBe(0);
    const mine = await asUser(ALICE, () => attempt(db, `SELECT * FROM user_blocks`));
    expect(mine.ok && mine.rows.length).toBe(1);
    const lift = await asUser(BOB, () => attempt(db, `DELETE FROM user_blocks`));
    expect(!lift.ok || lift.rows.length === 0).toBe(true);
    expect(await count(`SELECT count(*)::int n FROM user_blocks`)).toBe(1);
  });

  it("can be lifted by the server, after which the two can find each other again", async () => {
    await server(() => db.query(`DELETE FROM user_blocks WHERE blocker_id = $1`, [ALICE]));
    const ok = await asUser(ALICE, () =>
      attempt(
        db,
        `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ('${ALICE}','${BOB}','pending')`,
      ),
    );
    expect(ok.ok).toBe(true);
    await server(() => db.query(`DELETE FROM friendships`));
  });
});

describe("reports about people", () => {
  const report = (reporter: string, reported: string, reason: string, details: string | null) =>
    server(() =>
      attempt(
        db,
        `INSERT INTO user_reports (reporter_id, reported_user_id, reason, details) VALUES ($1,$2,$3,$4)`,
        [reporter, reported, reason, details],
      ),
    );

  it("are kept by the server and can't be read or written from the browser", async () => {
    expect((await report(ALICE, CAROL, "harassment", "rude")).ok).toBe(true);
    for (const id of [ALICE, CAROL]) {
      const read = await asUser(id, () => attempt(db, `SELECT * FROM user_reports`));
      expect(read.ok, id).toBe(false);
    }
    const write = await asUser(ALICE, () =>
      attempt(
        db,
        `INSERT INTO user_reports (reporter_id, reported_user_id, reason) VALUES ('${ALICE}','${CAROL}','spam')`,
      ),
    );
    expect(write.ok).toBe(false);
  });

  it("need a known reason, short details and a different person", async () => {
    expect((await report(ALICE, CAROL, "made-up", null)).ok).toBe(false);
    expect((await report(ALICE, CAROL, "other", "x".repeat(1001))).ok).toBe(false);
    expect((await report(ALICE, ALICE, "other", null)).ok).toBe(false);
  });

  it("stay, unlinked, if the reporter deletes their account, and go if the reported person does", async () => {
    await report(BOB, CAROL, "spam", null);
    await db.query(`DELETE FROM auth.users WHERE id = $1`, [BOB]);
    const unlinked = await db.query<{ reporter_id: string | null }>(
      `SELECT reporter_id FROM user_reports WHERE reported_user_id = $1 AND reason = 'spam'`,
      [CAROL],
    );
    expect(unlinked.rows).toEqual([{ reporter_id: null }]);

    await db.query(`DELETE FROM auth.users WHERE id = $1`, [CAROL]);
    expect(
      await count(`SELECT count(*)::int n FROM user_reports WHERE reported_user_id = $1`, [CAROL]),
    ).toBe(0);
    await createUsers(db, [BOB, CAROL]);
  });
});

describe("the friends league", () => {
  const standings = async (viewer: string) =>
    (
      await server(() =>
        db.query<{ id: string }>(`SELECT id FROM league_standings($1, '2026-09-21')`, [viewer]),
      )
    ).rows.map((r) => r.id);

  it("includes friends only when both people chose to share, and never a blocked pair", async () => {
    await server(() =>
      db.query(
        `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'accepted')`,
        [ALICE, BOB],
      ),
    );
    expect(await standings(ALICE)).toEqual([ALICE]);

    await setVisibility(ALICE, "friends");
    expect(await standings(ALICE)).toEqual([ALICE]); // Bob hasn't opted in
    await setVisibility(BOB, "friends");
    expect((await standings(ALICE)).sort()).toEqual([ALICE, BOB].sort());

    await setVisibility(ALICE, "minimal");
    expect(await standings(ALICE)).toEqual([ALICE]);
    expect(await standings(BOB)).toEqual([BOB]); // Alice is not sharing, so Bob can't see her

    await setVisibility(ALICE, "friends");
    await server(() => db.query(`SELECT public.block_user($1,$2)`, [BOB, ALICE]));
    expect(await standings(ALICE)).toEqual([ALICE]);
  });
});

describe("the rollback", () => {
  it("restores the old visibility rules and can be re-applied", async () => {
    await server(() => db.query(`DELETE FROM user_blocks`));
    await server(() =>
      db.query(
        `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'accepted') ON CONFLICT DO NOTHING`,
        [ALICE, BOB],
      ),
    );
    await setVisibility(ALICE, "minimal");
    const canRead = () =>
      asUser(BOB, async () => {
        const r = await attempt(db, `SELECT total_xp FROM profiles WHERE id = '${ALICE}'`);
        return r.ok && r.rows.length === 1;
      });
    expect(await canRead()).toBe(false);

    await db.exec(read(`docs/rollback/${NAME}.down.sql`));
    await db.exec(read(`docs/rollback/${NAME}.down.sql`)); // safe to run twice
    expect(await canRead()).toBe(true);
    const tables = await db.query<{ n: number }>(
      `SELECT count(*)::int n FROM information_schema.tables WHERE table_name IN ('user_blocks','user_reports')`,
    );
    expect(tables.rows[0]!.n).toBe(0);

    await db.exec(read(`supabase/migrations/${NAME}.sql`));
    expect(await canRead()).toBe(false);
  });
});
