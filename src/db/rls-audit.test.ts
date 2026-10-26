import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, attempt, migratedDb } from "@/test/db";
import { ALICE, BOB, CAROL, createUsers, seedPersonData } from "@/test/seed";

/**
 * A catalog-level audit of Row Level Security across every table in the public schema, run
 * against the app's real migrations: is it on everywhere, who can read what without an
 * account, do the policies on people's data tie rows to the signed-in user, and what does a
 * stranger or a friend actually see of a person who has data in every table. The findings
 * are written up in docs/rls-audit.md; this file is what keeps them true.
 */

let db: PGlite;
beforeAll(async () => {
  db = await migratedDb();
  await createUsers(db, [ALICE, BOB, CAROL]);
  await seedPersonData(db, ALICE, BOB);
}, 60_000);
afterAll(async () => {
  await db.close();
});

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

/** Shared, non-personal content that anyone, signed in or not, may read. */
const PUBLIC_CATALOGUES = ["achievements", "curriculum_lessons", "drill_variants"];

const tables = async () =>
  (
    await db.query<{ name: string; rls: boolean; anon_select: boolean; auth_select: boolean }>(`
      SELECT c.relname AS name, c.relrowsecurity AS rls,
             has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
             has_table_privilege('authenticated', c.oid, 'SELECT') AS auth_select
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname`)
  ).rows;

const personColumnsByTable = async () => {
  const { rows } = await db.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = ANY ($1) ORDER BY table_name, column_name`,
    [PERSON_COLUMNS],
  );
  const map = new Map<string, string[]>();
  // profiles is about a person too: its id is theirs.
  map.set("profiles", ["id"]);
  for (const r of rows) map.set(r.table_name, [...(map.get(r.table_name) ?? []), r.column_name]);
  return map;
};

describe("Row Level Security is on", () => {
  it("for every table in the public schema", async () => {
    const all = await tables();
    expect(all.length).toBeGreaterThanOrEqual(23);
    expect(all.filter((t) => !t.rls).map((t) => t.name)).toEqual([]);
  });
});

describe("what someone who isn't signed in can read", () => {
  it("is limited to the shared catalogues", async () => {
    const readable = (await tables()).filter((t) => t.anon_select).map((t) => t.name);
    expect(readable.sort()).toEqual([...PUBLIC_CATALOGUES].sort());
  });

  it("contains nothing about a person", async () => {
    const people = await personColumnsByTable();
    for (const name of PUBLIC_CATALOGUES) expect(people.has(name), name).toBe(false);
  });
});

describe("the policies on people's data", () => {
  it("tie every readable row to the signed-in user or to one of their friendships", async () => {
    const people = await personColumnsByTable();
    const all = await tables();
    const { rows: policies } = await db.query<{ tablename: string; qual: string | null }>(
      `SELECT tablename, qual FROM pg_policies WHERE schemaname = 'public' AND cmd IN ('SELECT', 'ALL')`,
    );
    const problems: string[] = [];
    for (const table of all) {
      if (!people.has(table.name)) continue;
      const own = policies.filter((p) => p.tablename === table.name);
      const hasAnyPrivilege = table.auth_select || table.name === "profiles"; // profiles is column-granted
      if (!hasAnyPrivilege) continue;
      if (own.length === 0)
        problems.push(`${table.name}: readable by the browser role but no policy`);
      for (const p of own) {
        if (!/auth\.uid\(\)|are_friends|is_friendship_member/.test(p.qual ?? "")) {
          problems.push(
            `${table.name}: a read policy that doesn't mention the signed-in user (${p.qual})`,
          );
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("leave the server-only tables with no browser access at all", async () => {
    const all = await tables();
    const serverOnly = [
      "consent_records",
      "generated_cases",
      "learning_state",
      "league_results",
      "lesson_parts",
      "rate_limits",
      "reward_chests",
      "server_locks",
      "user_cosmetics",
      "user_reports",
      "xp_weekly",
    ];
    for (const name of serverOnly) {
      const t = all.find((x) => x.name === name)!;
      expect(t.auth_select || t.anon_select, name).toBe(false);
    }
  });
});

describe("what people can actually see of someone with data in every table", () => {
  /** How many of ALICE's rows a signed-in user can read, per table. */
  const visibleAbout = async (viewer: string) => {
    const people = await personColumnsByTable();
    const seen: Record<string, number> = {};
    for (const [table, columns] of people) {
      const where = columns.map((c) => `${c} = '${ALICE}'`).join(" OR ");
      const result = await as(db, "authenticated", viewer, () =>
        attempt(db, `SELECT count(*)::int AS n FROM ${table} WHERE ${where}`),
      );
      // Permission denied for the whole table counts as seeing nothing.
      seen[table] = result.ok ? (result.rows[0]!["n"] as number) : 0;
    }
    return Object.fromEntries(Object.entries(seen).filter(([, n]) => n > 0));
  };

  it("a stranger sees no rows about them anywhere", async () => {
    expect(await visibleAbout(CAROL)).toEqual({});
  });

  it("a friend sees only the pair's shared items by default", async () => {
    const seen = Object.keys(await visibleAbout(BOB)).sort();
    expect(seen).toEqual(
      [
        "debates", // a debate Bob is in
        "friendships", // the friendship itself
        "nudges", // a nudge sent to Bob
        "shared_streaks", // a streak Bob shares
      ].sort(),
    );
  });

  it("a friend also sees progress, activity and badges once the person chooses to share", async () => {
    await db.query(`UPDATE profiles SET profile_visibility = 'friends' WHERE id = $1`, [ALICE]);
    try {
      const seen = Object.keys(await visibleAbout(BOB)).sort();
      expect(seen).toEqual(
        [
          "daily_activity", // how much they did each day (friends' streak view)
          "debates",
          "friendships",
          "nudges",
          "profiles", // public columns only, checked below
          "shared_streaks",
          "user_achievements", // badges
        ].sort(),
      );
      // A stranger still sees nothing.
      expect(await visibleAbout(CAROL)).toEqual({});
    } finally {
      await db.query(`UPDATE profiles SET profile_visibility = 'minimal' WHERE id = $1`, [ALICE]);
    }
  });

  it("the friend's view of the profile can't reach the private columns", async () => {
    await db.query(`UPDATE profiles SET profile_visibility = 'friends' WHERE id = $1`, [ALICE]);
    for (const column of [
      "profile_visibility",
      "invite_code",
      "goal",
      "daily_goal",
      "notify_nudges_email",
      "gems",
      "age_band",
      "terms_version",
    ]) {
      const r = await as(db, "authenticated", BOB, () =>
        attempt(db, `SELECT ${column} FROM profiles WHERE id = '${ALICE}'`),
      );
      expect(r.ok, column).toBe(false);
    }
    await db.query(`UPDATE profiles SET profile_visibility = 'minimal' WHERE id = $1`, [ALICE]);
  });

  it("someone reading their own data sees all of it", async () => {
    const own = await as(db, "authenticated", ALICE, () =>
      attempt(db, `SELECT count(*)::int AS n FROM argument_attempts WHERE user_id = '${ALICE}'`),
    );
    expect(own.ok && own.rows[0]!["n"]).toBe(1);
  });
});

describe("the grant tightened after the first audit", () => {
  const NAME = "20260930100100_tighten_moderation_blocks";
  const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

  it("has its rollback undo and redo it cleanly", async () => {
    const before = await db.query<{ p: boolean }>(
      `SELECT has_table_privilege('authenticated', 'public.moderation_blocks', 'SELECT') AS p`,
    );
    expect(before.rows[0]!.p).toBe(false);
    await db.exec(read(`docs/rollback/${NAME}.down.sql`));
    await db.exec(read(`docs/rollback/${NAME}.down.sql`));
    const undone = await db.query<{ p: boolean }>(
      `SELECT has_table_privilege('authenticated', 'public.moderation_blocks', 'SELECT') AS p`,
    );
    expect(undone.rows[0]!.p).toBe(true);
    await db.exec(read(`supabase/migrations/${NAME}.sql`));
    const redone = await db.query<{ p: boolean }>(
      `SELECT has_table_privilege('authenticated', 'public.moderation_blocks', 'SELECT') AS p`,
    );
    expect(redone.rows[0]!.p).toBe(false);
  });
});
