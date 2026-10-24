import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, attempt, migratedDb } from "@/test/db";

/**
 * People search and the random default handles every new account gets ("reader-" and eight
 * characters): a default handle is found only when the whole of it is typed, so nobody can list
 * strangers who never chose to be found. Against the real migrations, plus the documented rollback.
 */
const NAME = "20261021100000_search_named_handles";
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const up = () => read(`supabase/migrations/${NAME}.sql`);
const down = () => read(`docs/rollback/${NAME}.down.sql`);

const ME = "00000000-0000-0000-0000-0000000000a1"; // the searcher, still on a default handle
const R1 = "00000000-0000-0000-0000-0000000000b1";
const R2 = "00000000-0000-0000-0000-0000000000b2";
const R3 = "00000000-0000-0000-0000-0000000000b3"; // blocked by ME below
const SHARER = "00000000-0000-0000-0000-0000000000c1";
const AVID = "00000000-0000-0000-0000-0000000000c2";
const DEFAULTS = [R1, R2, R3];

let db: PGlite;
const server = <T>(fn: () => Promise<T>) => as(db, "service_role", null, fn);
const handles = new Map<string, string>();

async function search(viewer: string, query: string) {
  const r = await server(() =>
    attempt(db, `SELECT id FROM search_profiles($1, $2)`, [viewer, query]),
  );
  expect(r.ok, JSON.stringify(r)).toBe(true);
  return r.ok ? r.rows.map((row) => row["id"] as string) : [];
}

const definition = (on: PGlite) =>
  on
    .query<{
      args: string;
      result: string;
      lang: string;
      volatile: string;
      definer: boolean;
      config: string[] | null;
      acl: string | null;
    }>(
      `SELECT pg_get_function_identity_arguments(p.oid) AS args,
              pg_get_function_result(p.oid) AS result,
              l.lanname AS lang, p.provolatile AS volatile, p.prosecdef AS definer,
              p.proconfig AS config, p.proacl::text AS acl
         FROM pg_proc p JOIN pg_language l ON l.oid = p.prolang
        WHERE p.proname = 'search_profiles'`,
    )
    .then((r) => r.rows);

const body = (on: PGlite) =>
  on
    .query<{ def: string }>(
      `SELECT pg_get_functiondef(p.oid) AS def FROM pg_proc p WHERE p.proname = 'search_profiles'`,
    )
    .then((r) => r.rows.map((row) => row.def));

beforeAll(async () => {
  db = await migratedDb();
  const ids = [ME, R1, R2, R3, SHARER, AVID];
  await db.query(
    `INSERT INTO auth.users (id, email, raw_user_meta_data)
     SELECT id, id::text || '@example.test', '{}' FROM unnest($1::uuid[]) AS id`,
    [ids],
  );
  await server(async () => {
    await db.query(`UPDATE profiles SET handle = 'sharer' WHERE id = $1`, [SHARER]);
    await db.query(`UPDATE profiles SET handle = 'avid-reader' WHERE id = $1`, [AVID]);
    await db.query(`SELECT public.block_user($1, $2)`, [ME, R3]);
  });
  const rows = await db.query<{ id: string; handle: string }>(
    `SELECT id, handle FROM profiles WHERE id = ANY($1::uuid[])`,
    [ids],
  );
  for (const row of rows.rows) handles.set(row.id, row.handle);
}, 60_000);
afterAll(async () => {
  await db.close();
});

describe("a default handle", () => {
  it("is what every account here starts with", () => {
    for (const id of [ME, ...DEFAULTS]) expect(handles.get(id)).toMatch(/^reader-[a-z0-9]{8}$/);
  });

  it("is never listed by searching part of it", async () => {
    const r1 = handles.get(R1)!;
    for (const q of [
      "reader",
      "READER",
      " reader ",
      "reader-",
      "eader-",
      r1.slice(0, 11),
      r1.slice(0, -1),
      r1.slice(7),
    ]) {
      const found = await search(ME, q);
      for (const id of DEFAULTS) expect(found, q).not.toContain(id);
    }
  });

  it("is found when the whole handle is typed, in any case, with spaces around it", async () => {
    const r1 = handles.get(R1)!;
    for (const q of [
      r1,
      r1.toUpperCase(),
      `  ${r1}  `,
      ` ${r1.slice(0, 9).toUpperCase()}${r1.slice(9)} `,
    ]) {
      expect(await search(ME, q), q).toEqual([R1]);
    }
    expect(await search(ME, handles.get(R2)!)).toEqual([R2]);
  });
});

describe("a chosen handle", () => {
  it("still matches any part of it", async () => {
    expect(await search(ME, "shar")).toEqual([SHARER]);
    expect(await search(ME, "HARE")).toEqual([SHARER]);
    // Only a handle that starts with "reader-" is held back: this one was chosen.
    expect(await search(ME, "reader")).toEqual([AVID]);
  });

  it("still needs three characters, and % and _ are ordinary characters", async () => {
    expect(await search(ME, "sh")).toEqual([]);
    expect(await search(ME, "  sh  ")).toEqual([]);
    expect(await search(ME, "%%%")).toEqual([]);
    expect(await search(ME, "___")).toEqual([]);
  });

  it("still lists at most 12, in handle order", async () => {
    const many = Array.from(
      { length: 14 },
      (_, i) => `00000000-0000-0000-0000-0000000001${String(i).padStart(2, "0")}`,
    );
    await db.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data)
       SELECT id, id::text || '@example.test', '{}' FROM unnest($1::uuid[]) AS id`,
      [many],
    );
    await server(() =>
      db.query(
        `UPDATE profiles SET handle = 'crowd_' || lpad((right(id::text, 2)::int)::text, 2, '0')
          WHERE id = ANY($1::uuid[])`,
        [many],
      ),
    );
    const found = await search(ME, "crowd");
    expect(found).toEqual(many.slice(0, 12));
    await db.query(`DELETE FROM auth.users WHERE id = ANY($1::uuid[])`, [many]);
  });
});

describe("who is never listed", () => {
  it("the searcher, whether their handle is a default or chosen", async () => {
    expect(await search(ME, handles.get(ME)!)).toEqual([]);
    expect(await search(SHARER, "sharer")).toEqual([]);
  });

  it("either side of a blocked pair, even by the whole handle", async () => {
    expect(await search(ME, handles.get(R3)!)).toEqual([]);
    expect(await search(R3, handles.get(ME)!)).toEqual([]);
    // R3 can still be found by someone they haven't blocked.
    expect(await search(R1, handles.get(R3)!)).toEqual([R3]);
  });

  it("anyone, for a viewer who isn't named", async () => {
    const r = await server(() =>
      attempt(db, `SELECT id FROM search_profiles(NULL, $1)`, [handles.get(R1)!]),
    );
    expect(r.ok && r.rows).toEqual([]);
  });
});

describe("the function itself", () => {
  it("keeps the signature, language, volatility, search_path and grants it had before", async () => {
    const before = await migratedDb({ before: NAME });
    try {
      const was = await definition(before);
      expect(was).toHaveLength(1);
      expect(await definition(db)).toEqual(was);
    } finally {
      await before.close();
    }
  }, 60_000);

  it("can't be run from the browser", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      const r = await as(db, role, role === "anon" ? null : ME, () =>
        attempt(db, `SELECT * FROM search_profiles($1, 'shar')`, [ME]),
      );
      expect(r.ok, role).toBe(false);
    }
  });
});

describe("the first signup trigger's defaults", () => {
  it("become random reader- handles, and handles in any other form are kept", async () => {
    const old = await migratedDb({ before: NAME });
    try {
      const made: Record<string, string> = {
        "00000000-0000-0000-0000-0000000000d1": "learner", // nothing in the email to use
        "00000000-0000-0000-0000-0000000000d2": "learnerab23", // "learner" was taken
        "00000000-0000-0000-0000-0000000000d3": "learnerqr7k9m", // the August backfill
        "00000000-0000-0000-0000-0000000000d4": "learnerjoe", // chosen: three characters
        "00000000-0000-0000-0000-0000000000d5": "learner-ab23", // chosen: not the format
        "00000000-0000-0000-0000-0000000000d6": "learnerab1o", // chosen: 1 and o are never drawn
      };
      const ids = Object.keys(made);
      await old.query(
        `INSERT INTO auth.users (id, email, raw_user_meta_data)
         SELECT id, id::text || '@example.test', '{}' FROM unnest($1::uuid[]) AS id`,
        [ids],
      );
      for (const [id, handle] of Object.entries(made)) {
        await old.query(`UPDATE profiles SET handle = $2 WHERE id = $1`, [id, handle]);
      }
      await old.exec(up());
      const after = await old.query<{ id: string; handle: string }>(
        `SELECT id, handle FROM profiles WHERE id = ANY($1::uuid[]) ORDER BY id`,
        [ids],
      );
      const handle = new Map(after.rows.map((row) => [row.id, row.handle]));
      for (const id of ids.slice(0, 3)) expect(handle.get(id)).toMatch(/^reader-[a-z0-9]{8}$/);
      for (const id of ids.slice(3)) expect(handle.get(id)).toBe(made[id]);
      expect(new Set(handle.values()).size).toBe(ids.length);
    } finally {
      await old.close();
    }
  }, 60_000);
});

describe("the rollback", () => {
  it("puts back the previous search exactly, runs twice, and the migration applies again", async () => {
    const before = await migratedDb({ before: NAME });
    try {
      await db.exec(down());
      await db.exec(down());
      expect(await body(db)).toEqual(await body(before));
      expect(await definition(db)).toEqual(await definition(before));
    } finally {
      await before.close();
    }
    // The vulnerable behavior is back: "reader" lists the default handles, still not the
    // searcher or the blocked pair.
    const listed = await search(ME, "reader");
    expect(listed).toEqual(expect.arrayContaining([R1, R2, AVID]));
    expect(listed).not.toContain(ME);
    expect(listed).not.toContain(R3);

    await db.exec(up());
    expect(await search(ME, "reader")).toEqual([AVID]);
    expect(await search(ME, handles.get(R1)!)).toEqual([R1]);
  }, 60_000);
});
