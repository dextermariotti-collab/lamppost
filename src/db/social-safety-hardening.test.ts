import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, attempt, migratedDb } from "@/test/db";

/**
 * The social safety hardening migration, against the real migrations: what one signed-in
 * stranger with nothing but the public key could do before it (each case below was reproduced
 * first), that it can't now, that the app's own paths still work, and that the documented
 * rollback undoes it and the migration can be applied again.
 */
const NAME = "20261019100000_social_safety_hardening";
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const up = () => read(`supabase/migrations/${NAME}.sql`);
const down = () => read(`docs/rollback/${NAME}.down.sql`);

const JANE = "00000000-0000-0000-0000-00000000000a"; // email sign-up
const BOB = "00000000-0000-0000-0000-00000000000b"; // Jane's friend
const MAL = "00000000-0000-0000-0000-00000000000d"; // a stranger
const ADA = "00000000-0000-0000-0000-00000000000e"; // Google sign-up

let db: PGlite;
const asUser = <T>(id: string, fn: () => Promise<T>) => as(db, "authenticated", id, fn);
const server = <T>(fn: () => Promise<T>) => as(db, "service_role", null, fn);
const denied = (r: { ok: boolean }) => expect(r.ok, JSON.stringify(r)).toBe(false);
const allowed = (r: { ok: boolean }) => expect(r.ok, JSON.stringify(r)).toBe(true);
const today = `(now() AT TIME ZONE 'utc')::date`;
const profileOf = async (id: string) =>
  (
    await db.query<{ handle: string; display_name: string | null }>(
      `SELECT handle, display_name FROM profiles WHERE id = $1`,
      [id],
    )
  ).rows[0]!;

beforeAll(async () => {
  db = await migratedDb();
  await db.query(
    `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
       ($1,'jane.smith.2011@school.example','{}'),
       ($2,'bob@example.test','{"display_name":"bob"}'),
       ($3,'m@example.test','{"display_name":"mal"}'),
       ($4,'ada@gmail.example','{"full_name":"Ada Quinlan"}')`,
    [JANE, BOB, MAL, ADA],
  );
  await db.query(
    `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'accepted')`,
    [JANE, BOB],
  );
}, 60_000);
afterAll(async () => {
  await db.close();
});

describe("handles and names at sign-up", () => {
  it("are a random handle and no name, whatever the email, Google or the metadata say", async () => {
    for (const id of [JANE, BOB, MAL, ADA]) {
      const p = await profileOf(id);
      expect(p.handle).toMatch(/^reader-[a-z0-9]{8}$/);
      expect(p.display_name).toBeNull();
    }
    expect(JSON.stringify(await profileOf(JANE))).not.toMatch(/jane|smith|2011/);
    expect(JSON.stringify(await profileOf(ADA))).not.toMatch(/ada|quinlan/i);
  });

  it("are replaced on existing accounts only where they came from the email or a full name", async () => {
    const old = await migratedDb({ before: NAME });
    try {
      await old.query(
        `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
           ($1,'jane.smith.2011@school.example','{}'),
           ($2,'b@example.test','{"display_name":"bobby"}'),
           ($3,'ada@gmail.example','{"full_name":"Ada Quinlan"}'),
           ($4,'m@example.test','{}')`,
        [JANE, BOB, ADA, MAL],
      );
      // Mal picked a handle of his own; Bob's browser stored a name no server would accept.
      await old.query(`UPDATE profiles SET handle = 'mal_reads' WHERE id = $1`, [MAL]);
      await old.query(`UPDATE profiles SET display_name = repeat('x', 9600) WHERE id = $1`, [BOB]);
      const before = (
        await old.query<{ id: string; handle: string; display_name: string | null }>(
          `SELECT id, handle, display_name FROM profiles ORDER BY id`,
        )
      ).rows;
      expect(before.map((r) => r.handle)).toEqual([
        "janesmith2011",
        "bobby",
        "mal_reads",
        "adaquinlan",
      ]);
      expect(before[3]!.display_name).toBe("Ada Quinlan");

      await old.exec(up());
      const after = (
        await old.query<{ id: string; handle: string; display_name: string | null }>(
          `SELECT id, handle, display_name FROM profiles ORDER BY id`,
        )
      ).rows;
      expect(after[0]!.handle).toMatch(/^reader-/); // from the email
      expect(after[1]!.handle).toBe("bobby"); // typed at sign-up
      expect(after[2]!.handle).toBe("mal_reads"); // chosen later
      expect(after[3]!.handle).toMatch(/^reader-/); // from Google's full name
      expect(after.map((r) => r.display_name)).toEqual([null, null, null, null]);
    } finally {
      await old.close();
    }
  }, 60_000);
});

describe("people search", () => {
  it("finds handles only, from three characters, and never the searcher or a blocked person", async () => {
    await server(() =>
      attempt(
        db,
        `UPDATE profiles SET handle = 'janes_notes', display_name = 'Jane Smith' WHERE id = $1`,
        [JANE],
      ),
    );
    const search = (viewer: string, q: string) =>
      server(() => attempt(db, `SELECT id FROM search_profiles($1, $2)`, [viewer, q]));
    const ids = (r: Awaited<ReturnType<typeof search>>) =>
      r.ok ? r.rows.map((x) => x["id"]) : null;

    expect(ids(await search(MAL, "janes"))).toEqual([JANE]);
    expect(ids(await search(MAL, "smith"))).toEqual([]); // a display name is not searchable
    expect(ids(await search(MAL, "ja"))).toEqual([]);
    expect(ids(await search(JANE, "janes"))).toEqual([]);
    await server(() => db.query(`SELECT public.block_user($1, $2)`, [JANE, MAL]));
    expect(ids(await search(MAL, "janes"))).toEqual([]);
    await server(() => db.query(`DELETE FROM user_blocks`));
  });

  it("can't be run from the browser, with either signature", async () => {
    denied(
      await asUser(MAL, () => attempt(db, `SELECT * FROM search_profiles($1, 'janes')`, [MAL])),
    );
    denied(await asUser(MAL, () => attempt(db, `SELECT * FROM search_profiles('janes')`)));
    denied(
      await as(db, "anon", null, () =>
        attempt(db, `SELECT * FROM search_profiles($1, 'janes')`, [MAL]),
      ),
    );
  });
});

describe("free text from strangers", () => {
  it("can't be written from the browser: names, handles and friend requests are the server's", async () => {
    const long = "add me on snap: mal_xyz ".repeat(400);
    denied(
      await asUser(MAL, () =>
        attempt(db, `UPDATE profiles SET display_name = $2 WHERE id = $1`, [MAL, long]),
      ),
    );
    denied(
      await asUser(MAL, () =>
        attempt(db, `UPDATE profiles SET handle = 'lamppost-team' WHERE id = $1`, [MAL]),
      ),
    );
    denied(
      await asUser(MAL, () =>
        attempt(
          db,
          `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'pending')`,
          [MAL, JANE],
        ),
      ),
    );
    expect(await profileOf(MAL)).toMatchObject({ display_name: null });
  });

  it("is bounded by the database whoever writes it", async () => {
    for (const set of [
      `display_name = repeat('x', 41)`,
      `display_name = '   '`,
      `display_name = ''`,
      `handle = 'Lamppost Team ✔'`,
      `handle = 'ab'`,
      `handle = repeat('a', 25)`,
      `daily_goal = 0`,
      `daily_goal = 11`,
    ]) {
      denied(await server(() => attempt(db, `UPDATE profiles SET ${set} WHERE id = $1`, [MAL])));
    }
    allowed(
      await server(() =>
        attempt(
          db,
          `UPDATE profiles SET display_name = 'Mal', handle = 'mal-reads_2', daily_goal = 10 WHERE id = $1`,
          [MAL],
        ),
      ),
    );
  });

  it("still lets the browser change settings and the companion", async () => {
    allowed(
      await asUser(MAL, () =>
        attempt(
          db,
          `UPDATE profiles SET companion_preset = 'owl', daily_goal = 2, onboarding_completed = true WHERE id = $1`,
          [MAL],
        ),
      ),
    );
  });
});

describe("the profile guard", () => {
  it("refuses every server-owned column from a browser role, even if a grant is widened", async () => {
    for (const [column, value] of [
      ["display_name", "'x'"],
      ["handle", "'zzz'"],
      ["profile_visibility", "'friends'"],
      ["done_lessons", "'{a}'"],
      ["age_band", "'18+'"],
      ["terms_version", "'t9'"],
      ["guardian_confirmed", "true"],
      ["created_at", "now()"],
    ] as const) {
      await db.exec(`GRANT UPDATE (${column}) ON public.profiles TO authenticated`);
      const r = await asUser(MAL, () =>
        attempt(db, `UPDATE profiles SET ${column} = ${value} WHERE id = $1`, [MAL]),
      );
      await db.exec(`REVOKE UPDATE (${column}) ON public.profiles FROM authenticated`);
      denied(r);
      expect(!r.ok && r.error, column).toMatch(/server only/);
    }
  });
});

describe("asking who is friends with whom", () => {
  it("answers a stranger nothing, and the two people the truth", async () => {
    const ask = (viewer: string, fn: string) =>
      asUser(viewer, () => attempt(db, `SELECT public.${fn}($1, $2) AS f`, [JANE, BOB]));
    for (const fn of ["are_friends", "shares_progress_with"]) {
      const stranger = await ask(MAL, fn);
      expect(stranger.ok && stranger.rows[0]?.["f"], fn).toBe(false);
    }
    const jane = await ask(JANE, "are_friends");
    expect(jane.ok && jane.rows[0]?.["f"]).toBe(true);
    const viaServer = await server(() =>
      attempt(db, `SELECT public.are_friends($1, $2) AS f`, [JANE, BOB]),
    );
    expect(viaServer.ok && viaServer.rows[0]?.["f"]).toBe(true);
  });

  it("drops the unused has_friend_link", async () => {
    denied(
      await asUser(MAL, () => attempt(db, `SELECT public.has_friend_link($1, $2)`, [JANE, BOB])),
    );
    const left = await db.query(`SELECT 1 FROM pg_proc WHERE proname = 'has_friend_link'`);
    expect(left.rows).toHaveLength(0);
  });

  it("keeps the policies built on them working: a friend who shares is readable", async () => {
    await server(() =>
      db.query(`UPDATE profiles SET profile_visibility = 'friends' WHERE id = $1`, [JANE]),
    );
    const friend = await asUser(BOB, () =>
      attempt(db, `SELECT total_xp FROM profiles WHERE id = $1`, [JANE]),
    );
    expect(friend.ok && friend.rows).toHaveLength(1);
    const stranger = await asUser(MAL, () =>
      attempt(db, `SELECT total_xp FROM profiles WHERE id = $1`, [JANE]),
    );
    expect(stranger.ok && stranger.rows).toHaveLength(0);
    await server(() =>
      db.query(`UPDATE profiles SET profile_visibility = 'minimal' WHERE id = $1`, [JANE]),
    );
  });
});

describe("nudges", () => {
  const nudge = (from: string, to: string, day: string, streak: string | null = null) =>
    asUser(from, () =>
      attempt(
        db,
        `INSERT INTO nudges (from_user_id, to_user_id, day, shared_streak_id) VALUES ($1, $2, ${day}, $3)`,
        [from, to, streak],
      ),
    );

  it("are for a friend, on a day within one of the server's", async () => {
    const burst = await asUser(JANE, () =>
      attempt(
        db,
        `INSERT INTO nudges (from_user_id, to_user_id, day)
         SELECT $1, $2, d::date FROM generate_series(current_date - 50, current_date - 2, '1 day') d`,
        [JANE, BOB],
      ),
    );
    denied(burst);
    denied(await nudge(JANE, BOB, `${today} + 2`));
    denied(await nudge(MAL, JANE, today));
    allowed(await nudge(JANE, BOB, today));
    allowed(await nudge(JANE, BOB, `${today} - 1`));
    allowed(await nudge(JANE, BOB, `${today} + 1`));
  });

  it("respect the recipient's setting", async () => {
    await asUser(BOB, () =>
      attempt(db, `UPDATE profiles SET notify_nudges_inapp = false WHERE id = $1`, [BOB]),
    );
    await server(() => db.query(`DELETE FROM nudges`));
    denied(await nudge(JANE, BOB, today));
    await asUser(BOB, () =>
      attempt(db, `UPDATE profiles SET notify_nudges_inapp = true WHERE id = $1`, [BOB]),
    );
    allowed(await nudge(JANE, BOB, today));
  });

  it("can only name the pair's own shared streak", async () => {
    await server(() => db.query(`DELETE FROM nudges`));
    await server(async () => {
      await db.query(
        `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'accepted')`,
        [MAL, ADA],
      );
      await db.query(
        `INSERT INTO shared_streaks (friendship_id, proposed_by, status)
         SELECT id, requester_id, 'active' FROM friendships`,
      );
    });
    const streakOf = async (a: string) =>
      (
        await db.query<{ id: string }>(
          `SELECT s.id FROM shared_streaks s JOIN friendships f ON f.id = s.friendship_id WHERE f.requester_id = $1`,
          [a],
        )
      ).rows[0]!.id;
    denied(await nudge(JANE, BOB, today, await streakOf(MAL)));
    allowed(await nudge(JANE, BOB, today, await streakOf(JANE)));
    // Nor can a stranger use the check to learn someone else's settings.
    const probe = await asUser(MAL, () =>
      attempt(db, `SELECT public.can_nudge($1, $2, NULL) AS ok`, [JANE, BOB]),
    );
    expect(probe.ok && probe.rows[0]?.["ok"]).toBe(false);
  });
});

describe("content reports", () => {
  it("are filed open and bounded", async () => {
    denied(
      await asUser(MAL, () =>
        attempt(
          db,
          `INSERT INTO content_reports (user_id, reason, details) VALUES ($1,'x',repeat('y', 200000))`,
          [MAL],
        ),
      ),
    );
    denied(
      await asUser(MAL, () =>
        attempt(
          db,
          `INSERT INTO content_reports (user_id, reason, status) VALUES ($1,'other','actioned')`,
          [MAL],
        ),
      ),
    );
    allowed(
      await asUser(MAL, () =>
        attempt(
          db,
          `INSERT INTO content_reports (user_id, reason, details, excerpt) VALUES ($1,'other','wrong', 'text')`,
          [MAL],
        ),
      ),
    );
    const filed = await db.query(`SELECT status FROM content_reports WHERE user_id = $1`, [MAL]);
    expect(filed.rows).toEqual([{ status: "open" }]);
  });
});

describe("debates", () => {
  it("never show the browser an answer or a score, so nobody can copy the other side", async () => {
    await server(() =>
      db.query(
        `INSERT INTO debates (challenger_id, opponent_id, topic, prompt, passage, challenger_side, opponent_side, challenger_answer, challenger_total)
         VALUES ($1,$2,'t','p','p','for','against','JANE ANSWER TEXT', 14)`,
        [JANE, BOB],
      ),
    );
    for (const column of [
      "challenger_answer",
      "challenger_total",
      "challenger_scores",
      "challenger_tip",
      "*",
    ]) {
      denied(await asUser(BOB, () => attempt(db, `SELECT ${column} FROM debates`)));
    }
    const listed = await asUser(BOB, () =>
      attempt(db, `SELECT id, topic, prompt, status, opponent_side FROM debates`),
    );
    expect(listed.ok && listed.rows).toHaveLength(1);
    allowed(
      await asUser(BOB, () =>
        attempt(db, `UPDATE debates SET opponent_seen_result = true WHERE opponent_id = $1`, [BOB]),
      ),
    );
  });
});

describe("reports about a person", () => {
  it("stay, unlinked, when the reported person deletes their account", async () => {
    const GONE = "00000000-0000-0000-0000-0000000000f1";
    await db.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1,'g@example.test','{}')`,
      [GONE],
    );
    await server(() =>
      db.query(
        `INSERT INTO user_reports (reporter_id, reported_user_id, reason, details) VALUES ($1,$2,'harassment','x')`,
        [JANE, GONE],
      ),
    );
    await db.query(`DELETE FROM auth.users WHERE id = $1`, [GONE]);
    const kept = await db.query(
      `SELECT reporter_id, reported_user_id, reason FROM user_reports WHERE details = 'x'`,
    );
    expect(kept.rows).toEqual([
      { reporter_id: JANE, reported_user_id: null, reason: "harassment" },
    ]);
  });
});

describe("job leases", () => {
  const lock = (key: string, holder: string | null) =>
    server(() => attempt(db, `SELECT acquire_lock($1, 60, $2) AS got`, [key, holder]));
  const release = (key: string, holder: string | null) =>
    server(() => attempt(db, `SELECT release_lock($1, $2)`, [key, holder]));
  const held = async (key: string) =>
    (
      await db.query<{ holder: string | null }>(`SELECT holder FROM server_locks WHERE key = $1`, [
        key,
      ])
    ).rows;

  it("can only be released by the worker holding them", async () => {
    const first = await lock("gen:x", "worker-a");
    expect(first.ok && first.rows[0]?.["got"]).toBe(true);
    await db.query(
      `UPDATE server_locks SET expires_at = now() - interval '1 second' WHERE key = 'gen:x'`,
    );
    const second = await lock("gen:x", "worker-b");
    expect(second.ok && second.rows[0]?.["got"]).toBe(true);

    // Worker A finishes late and releases: B's lease is untouched.
    allowed(await release("gen:x", "worker-a"));
    expect(await held("gen:x")).toEqual([{ holder: "worker-b" }]);
    allowed(await release("gen:x", null));
    expect(await held("gen:x")).toEqual([{ holder: "worker-b" }]);
    allowed(await release("gen:x", "worker-b"));
    expect(await held("gen:x")).toEqual([]);
  });

  it("still work for a caller that passes no holder", async () => {
    const got = await server(() => attempt(db, `SELECT acquire_lock('gen:y', 60) AS got`));
    expect(got.ok && got.rows[0]?.["got"]).toBe(true);
    allowed(await server(() => attempt(db, `SELECT release_lock('gen:y')`)));
    expect(await held("gen:y")).toEqual([]);
  });
});

describe("the seven-day shared streak badge", () => {
  it("is named for its rule", async () => {
    const { rows } = await db.query<{ name: string; criteria: string }>(
      `SELECT name, criteria FROM achievements WHERE code = 'shared_streak_7'`,
    );
    expect(rows).toEqual([
      { name: "Week-long flame", criteria: "Keep a shared streak alive for 7 days" },
    ]);
  });
});

describe("the project's rls_auto_enable()", () => {
  it("is taken away from the API roles when it exists, and the migration runs without it", async () => {
    const old = await migratedDb({ before: NAME });
    try {
      await old.exec(`
        CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
        LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN END $$;
        GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO anon, authenticated;
      `);
      await old.exec(up());
      for (const role of ["anon", "authenticated"]) {
        const r = await old.query<{ p: boolean }>(
          `SELECT has_function_privilege($1, 'public.rls_auto_enable()', 'EXECUTE') AS p`,
          [role],
        );
        expect(r.rows[0]!.p, role).toBe(false);
      }
    } finally {
      await old.close();
    }
  }, 60_000);
});

describe("the rollback", () => {
  it("restores the previous rules, runs twice, and the migration can be applied again", async () => {
    await db.exec(down());
    await db.exec(down());

    allowed(
      await asUser(MAL, () =>
        attempt(db, `UPDATE profiles SET display_name = 'Mal M' WHERE id = $1`, [MAL]),
      ),
    );
    allowed(
      await asUser(MAL, () =>
        attempt(
          db,
          `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'pending')`,
          [MAL, BOB],
        ),
      ),
    );
    const stranger = await asUser(MAL, () =>
      attempt(db, `SELECT public.are_friends($1, $2) AS f`, [JANE, BOB]),
    );
    expect(stranger.ok && stranger.rows[0]?.["f"]).toBe(true);
    allowed(
      await asUser(MAL, () => attempt(db, `SELECT public.has_friend_link($1, $2)`, [JANE, BOB])),
    );
    allowed(await asUser(BOB, () => attempt(db, `SELECT challenger_answer FROM debates`)));
    allowed(await asUser(MAL, () => attempt(db, `SELECT * FROM search_profiles('reader')`)));
    allowed(await server(() => attempt(db, `SELECT acquire_lock('gen:z', 5)`)));
    const badge = await db.query(`SELECT name FROM achievements WHERE code = 'shared_streak_7'`);
    expect(badge.rows).toEqual([{ name: "Two-week flame" }]);
    const fk = await db.query<{ action: string }>(
      `SELECT confdeltype AS action FROM pg_constraint WHERE conname = 'user_reports_reported_user_id_fkey'`,
    );
    expect(fk.rows).toEqual([{ action: "c" }]);

    await server(() => db.query(`DELETE FROM friendships WHERE requester_id = $1`, [MAL]));
    await db.exec(up());
    denied(
      await asUser(MAL, () =>
        attempt(db, `UPDATE profiles SET display_name = 'Mal' WHERE id = $1`, [MAL]),
      ),
    );
    const again = await asUser(MAL, () =>
      attempt(db, `SELECT public.are_friends($1, $2) AS f`, [JANE, BOB]),
    );
    expect(again.ok && again.rows[0]?.["f"]).toBe(false);
    denied(await asUser(BOB, () => attempt(db, `SELECT challenger_answer FROM debates`)));
    const lease = await server(() => attempt(db, `SELECT acquire_lock('gen:w', 5, 'me') AS got`));
    expect(lease.ok && lease.rows[0]?.["got"]).toBe(true);
    const renamed = await db.query(`SELECT name FROM achievements WHERE code = 'shared_streak_7'`);
    expect(renamed.rows).toEqual([{ name: "Week-long flame" }]);
  }, 60_000);
});
