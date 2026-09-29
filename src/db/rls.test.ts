import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, attempt, migratedDb } from "@/test/db";

/**
 * Row-level security, exercised as the roles that really use it, against the
 * app's real migrations. The point of the lock_server_owned_writes migration is
 * that a signed-in user with nothing but the public key cannot write their own
 * XP, streaks, activity, badges, shared streaks, debate scores, graded attempts or
 * practice sessions — those are written by server functions with the service role.
 */
const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";
const CAROL = "00000000-0000-0000-0000-00000000000c";

let db: PGlite;

const asUser = <T>(id: string, fn: () => Promise<T>) => as(db, "authenticated", id, fn);
const asServer = <T>(fn: () => Promise<T>) => as(db, "service_role", null, fn);
const denied = (r: { ok: boolean }) => expect(r.ok, JSON.stringify(r)).toBe(false);
const allowed = (r: { ok: boolean }) => expect(r.ok, JSON.stringify(r)).toBe(true);

beforeAll(async () => {
  db = await migratedDb();
  for (const [id, name] of [
    [ALICE, "alice"],
    [BOB, "bob"],
    [CAROL, "carol"],
  ] as const) {
    await db.query(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)`, [
      id,
      `${name}@example.test`,
      JSON.stringify({ display_name: name }),
    ]);
  }
  // alice + bob are friends; carol only sent alice a request (she knows alice's id).
  await db.query(
    `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'accepted'), ($3,$1,'pending')`,
    [ALICE, BOB, CAROL],
  );
  await db.query(
    `INSERT INTO shared_streaks (friendship_id, proposed_by, status)
     SELECT id, $1, 'pending' FROM friendships WHERE requester_id=$1 AND addressee_id=$2`,
    [ALICE, BOB],
  );
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("a signed-in user cannot write server-owned data", () => {
  it("cannot set their own XP, gems or streaks", async () => {
    for (const set of [
      "total_xp = 999999",
      "gems = 999999",
      "current_streak = 500",
      "longest_streak = 500",
      "last_active_day = current_date",
      "invite_code = 'hijacked'",
      "day_key_version = 2",
      "progress_synced_at = now()",
    ]) {
      denied(
        await asUser(ALICE, () => attempt(db, `UPDATE profiles SET ${set} WHERE id = $1`, [ALICE])),
      );
    }
    const row = await asServer(() =>
      attempt(db, `SELECT total_xp, gems, current_streak FROM profiles WHERE id=$1`, [ALICE]),
    );
    expect(row.ok && row.rows[0]).toEqual({ total_xp: 0, gems: 0, current_streak: 0 });
  });

  it("cannot get around the column grant through the guard trigger either", async () => {
    // Even the service role's own broader grant is fine, but a browser role hitting the
    // trigger directly is refused (defence in depth if a grant were widened later).
    await db.exec(`GRANT UPDATE (total_xp) ON public.profiles TO authenticated`);
    const r = await asUser(ALICE, () =>
      attempt(db, `UPDATE profiles SET total_xp = 5 WHERE id = $1`, [ALICE]),
    );
    await db.exec(`REVOKE UPDATE (total_xp) ON public.profiles FROM authenticated`);
    denied(r);
    expect(r.ok === false && r.error).toMatch(/server only/);
  });

  it("cannot create a profile row", async () => {
    denied(
      await asUser(ALICE, () =>
        attempt(
          db,
          `INSERT INTO profiles (id, handle, invite_code, total_xp) VALUES (gen_random_uuid(), 'zz', 'zzcode', 5)`,
        ),
      ),
    );
  });

  it("cannot forge activity, badges, shared streaks, debates, attempts or practice sessions", async () => {
    const forgeries: [string, string, unknown[]][] = [
      [
        "daily_activity",
        `INSERT INTO daily_activity (user_id, day, lessons_completed) SELECT $1, (current_date - g)::date, 99 FROM generate_series(0,59) g`,
        [ALICE],
      ],
      [
        "user_achievements",
        `INSERT INTO user_achievements (user_id, achievement_code) VALUES ($1,'streak_7')`,
        [ALICE],
      ],
      [
        "shared_streaks update",
        `UPDATE shared_streaks SET status='active', current_count=999 WHERE proposed_by=$1`,
        [ALICE],
      ],
      [
        "shared_streaks insert",
        `INSERT INTO shared_streaks (friendship_id, proposed_by, status, current_count) SELECT id, $1, 'active', 365 FROM friendships LIMIT 1`,
        [ALICE],
      ],
      [
        "debates",
        `INSERT INTO debates (challenger_id, opponent_id, topic, prompt, passage, challenger_side, opponent_side, status, challenger_total, opponent_total) VALUES ($1,$2,'t','p','p','for','against','graded',16,0)`,
        [ALICE, BOB],
      ],
      [
        "argument_attempts",
        `INSERT INTO argument_attempts (user_id, lesson_id, lesson_title, answer, total) VALUES ($1,'l','t','a',16)`,
        [ALICE],
      ],
      [
        "practice_sessions insert",
        `INSERT INTO practice_sessions (user_id, course_slug, course_topic, lesson_index, lesson_title, verdict) VALUES ($1,'s','t',1,'t','solid')`,
        [ALICE],
      ],
      ["practice_sessions delete", `DELETE FROM practice_sessions WHERE user_id=$1`, [ALICE]],
      [
        "subscriptions",
        `INSERT INTO subscriptions (user_id, status) VALUES ($1,'active')`,
        [ALICE],
      ],
    ];
    for (const [label, sql, params] of forgeries) {
      const r = await asUser(ALICE, () => attempt(db, sql, params));
      expect(r.ok, `${label} should be denied`).toBe(false);
    }
  });

  it("cannot rewrite other people's nudges or friend requests", async () => {
    await asServer(() =>
      attempt(db, `INSERT INTO nudges (from_user_id, to_user_id) VALUES ($1,$2)`, [ALICE, BOB]),
    );
    denied(
      await asUser(BOB, () =>
        attempt(db, `UPDATE nudges SET from_user_id=$1 WHERE to_user_id=$2`, [CAROL, BOB]),
      ),
    );
    denied(await asUser(BOB, () => attempt(db, `DELETE FROM nudges WHERE to_user_id=$1`, [BOB])));
    denied(
      await asUser(ALICE, () =>
        attempt(db, `UPDATE friendships SET requester_id=$1 WHERE addressee_id=$2`, [CAROL, ALICE]),
      ),
    );
  });
});

describe("everything the app still does from the browser keeps working", () => {
  it("lets a user edit their own settings and companion", async () => {
    allowed(
      await asUser(ALICE, () =>
        attempt(
          db,
          `UPDATE profiles SET display_name='Alice', handle='alice_l', daily_goal=4, goal='think better',
             notify_nudges_inapp=false, notify_nudges_email=false, onboarding_completed=true,
             companion_preset='scout', companion_palette='default', companion_accessory='none', companion_expression='happy'
           WHERE id=$1`,
          [ALICE],
        ),
      ),
    );
  });

  it("lets a user read their own row and the public columns of a friend who shares", async () => {
    await db.query(`UPDATE profiles SET profile_visibility = 'friends' WHERE id = $1`, [BOB]);
    const own = await asUser(ALICE, () =>
      attempt(db, `SELECT handle, total_xp, companion_preset FROM profiles WHERE id=$1`, [ALICE]),
    );
    allowed(own);
    const friend = await asUser(ALICE, () =>
      attempt(
        db,
        `SELECT display_name, handle, current_streak, total_xp, companion_preset FROM profiles WHERE id=$1`,
        [BOB],
      ),
    );
    expect(friend.ok && friend.rows).toHaveLength(1);
    await db.query(`UPDATE profiles SET profile_visibility = 'minimal' WHERE id = $1`, [BOB]);
  });

  it("handles friend requests, acceptance and nudges", async () => {
    allowed(
      await asUser(BOB, () =>
        attempt(
          db,
          `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'pending')`,
          [BOB, CAROL],
        ),
      ),
    );
    denied(
      await asUser(BOB, () =>
        attempt(
          db,
          `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'accepted')`,
          [BOB, ALICE],
        ),
      ),
    );
    allowed(
      await asUser(ALICE, () =>
        attempt(
          db,
          `UPDATE friendships SET status='accepted', accepted_at=now() WHERE requester_id=$1 AND addressee_id=$2`,
          [CAROL, ALICE],
        ),
      ),
    );
    denied(
      await asUser(CAROL, () =>
        attempt(db, `UPDATE friendships SET status='pending' WHERE addressee_id=$1`, [CAROL]),
      ),
    );
    allowed(
      await asUser(ALICE, () =>
        attempt(
          db,
          `INSERT INTO nudges (from_user_id, to_user_id, day) VALUES ($1,$2,'2026-09-23')`,
          [ALICE, BOB],
        ),
      ),
    );
    denied(
      await asUser(ALICE, () =>
        attempt(
          db,
          `INSERT INTO nudges (from_user_id, to_user_id, day) VALUES ($1,$2,'2026-09-23')`,
          [ALICE, gen()],
        ),
      ),
    );
    allowed(
      await asUser(BOB, () =>
        attempt(db, `UPDATE nudges SET read_at=now() WHERE to_user_id=$1`, [BOB]),
      ),
    );
    allowed(
      await asUser(ALICE, () =>
        attempt(db, `DELETE FROM friendships WHERE requester_id=$1 AND addressee_id=$2`, [
          CAROL,
          ALICE,
        ]),
      ),
    );
  });

  it("lets a user file a content report and read their own records", async () => {
    allowed(
      await asUser(ALICE, () =>
        attempt(db, `INSERT INTO content_reports (user_id, reason) VALUES ($1,'other')`, [ALICE]),
      ),
    );
    denied(
      await asUser(ALICE, () =>
        attempt(db, `INSERT INTO content_reports (user_id, reason) VALUES ($1,'other')`, [BOB]),
      ),
    );
    for (const table of [
      "daily_activity",
      "user_achievements",
      "practice_sessions",
      "shared_streaks",
      "argument_attempts",
      "debates",
      "subscriptions",
      "nudges",
      "friendships",
    ]) {
      allowed(await asUser(ALICE, () => attempt(db, `SELECT count(*) FROM ${table}`)));
    }
  });

  it("lets a debate participant mark a result seen", async () => {
    await asServer(() =>
      attempt(
        db,
        `INSERT INTO debates (challenger_id, opponent_id, topic, prompt, passage, challenger_side, opponent_side) VALUES ($1,$2,'t','p','p','for','against')`,
        [ALICE, BOB],
      ),
    );
    allowed(
      await asUser(BOB, () =>
        attempt(db, `UPDATE debates SET opponent_seen_result=true WHERE opponent_id=$1`, [BOB]),
      ),
    );
    denied(
      await asUser(BOB, () =>
        attempt(db, `UPDATE debates SET opponent_total=16 WHERE opponent_id=$1`, [BOB]),
      ),
    );
  });

  it("still lets the server (service role) write everything a server function needs to", async () => {
    const writes: [string, unknown[]][] = [
      [
        `UPDATE profiles SET total_xp=379, gems=40, current_streak=2, longest_streak=2, last_active_day='2026-09-23', progress_synced_at=now(), day_key_version=2 WHERE id=$1`,
        [ALICE],
      ],
      [
        `INSERT INTO daily_activity (user_id, day, lessons_completed) VALUES ($1,'2026-09-23',2) ON CONFLICT (user_id, day) DO UPDATE SET lessons_completed=2`,
        [ALICE],
      ],
      [`DELETE FROM daily_activity WHERE user_id=$1 AND day='2026-09-22'`, [ALICE]],
      [
        `INSERT INTO user_achievements (user_id, achievement_code) VALUES ($1,'first_lesson')`,
        [ALICE],
      ],
      [
        `UPDATE shared_streaks SET status='active', current_count=1, last_extended_day='2026-09-23' WHERE proposed_by=$1`,
        [ALICE],
      ],
      [
        `INSERT INTO argument_attempts (user_id, lesson_id, lesson_title, answer, total) VALUES ($1,'l','t','a',8)`,
        [ALICE],
      ],
      [
        `INSERT INTO practice_sessions (user_id, course_slug, course_topic, lesson_index, lesson_title) VALUES ($1,'s','t',1,'t')`,
        [ALICE],
      ],
      [
        `UPDATE debates SET status='graded', challenger_total=9, opponent_total=7 WHERE challenger_id=$1`,
        [ALICE],
      ],
    ];
    for (const [sql, params] of writes) allowed(await asServer(() => attempt(db, sql, params)));
    const owner = await asServer(() =>
      attempt(
        db,
        `SELECT invite_code, goal, daily_goal, notify_nudges_email FROM profiles WHERE id=$1`,
        [ALICE],
      ),
    );
    expect(owner.ok && owner.rows[0]?.["goal"]).toBe("think better");
  });
});

describe("what other people can see of you", () => {
  it("keeps invite code, goal and settings private, even from friends", async () => {
    for (const column of [
      "invite_code",
      "goal",
      "daily_goal",
      "notify_nudges_email",
      "notify_nudges_inapp",
      "onboarding_completed",
      "gems",
      "day_key_version",
      "progress_synced_at",
    ]) {
      denied(
        await asUser(BOB, () => attempt(db, `SELECT ${column} FROM profiles WHERE id=$1`, [ALICE])),
      );
      denied(
        await asUser(ALICE, () =>
          attempt(db, `SELECT ${column} FROM profiles WHERE id=$1`, [ALICE]),
        ),
      );
    }
    denied(await asUser(ALICE, () => attempt(db, `SELECT * FROM profiles WHERE id=$1`, [ALICE])));
  });

  it("hides a profile from someone who has only sent a friend request", async () => {
    await asServer(() =>
      attempt(db, `DELETE FROM friendships WHERE requester_id=$1 AND addressee_id=$2`, [
        CAROL,
        ALICE,
      ]),
    );
    await asServer(() =>
      attempt(
        db,
        `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'pending')`,
        [CAROL, ALICE],
      ),
    );
    const seen = await asUser(CAROL, () =>
      attempt(db, `SELECT handle FROM profiles WHERE id=$1`, [ALICE]),
    );
    expect(seen.ok && seen.rows).toEqual([]);
  });

  it("treats % and _ in a people search as ordinary characters", async () => {
    const all = await asUser(BOB, () =>
      attempt(db, `SELECT count(*)::int AS n FROM search_profiles('%%')`),
    );
    expect(all.ok && all.rows[0]?.["n"]).toBe(0);
    const real = await asUser(BOB, () =>
      attempt(db, `SELECT count(*)::int AS n FROM search_profiles('alice')`),
    );
    expect(real.ok && real.rows[0]?.["n"]).toBe(1);
  });
});

describe("guests (signed out)", () => {
  it("can read only the public catalogues, and nothing that belongs to a user", async () => {
    for (const table of ["achievements", "curriculum_lessons", "drill_variants"]) {
      allowed(await as(db, "anon", null, () => attempt(db, `SELECT count(*) FROM ${table}`)));
    }
    for (const table of [
      "profiles",
      "daily_activity",
      "user_achievements",
      "friendships",
      "nudges",
      "shared_streaks",
      "debates",
      "practice_sessions",
      "argument_attempts",
      "subscriptions",
      "content_reports",
      "moderation_blocks",
    ]) {
      denied(await as(db, "anon", null, () => attempt(db, `SELECT count(*) FROM ${table}`)));
    }
    denied(
      await as(db, "anon", null, () =>
        attempt(db, `INSERT INTO daily_activity (user_id, day) VALUES ($1,'2026-09-23')`, [ALICE]),
      ),
    );
  });

  it("cannot write the shared lesson caches", async () => {
    denied(
      await as(db, "anon", null, () =>
        attempt(
          db,
          `INSERT INTO drill_variants (lesson_id, kind, variant, content) VALUES ('x','judge',1,'{}')`,
        ),
      ),
    );
    denied(await asUser(ALICE, () => attempt(db, `DELETE FROM curriculum_lessons`)));
  });
});

describe("no other write path has quietly opened up", () => {
  it("limits the browser role to exactly the writes above", async () => {
    const tables = await db.query<{ table_name: string; privilege_type: string }>(
      `SELECT table_name, privilege_type FROM information_schema.table_privileges
       WHERE grantee='authenticated' AND table_schema='public' AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE')
       ORDER BY table_name, privilege_type`,
    );
    const columns = await db.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.column_privileges
       WHERE grantee='authenticated' AND table_schema='public' AND privilege_type='UPDATE'
       ORDER BY table_name, column_name`,
    );
    const tableWrites = tables.rows.map((r) => `${r.table_name}:${r.privilege_type}`);
    expect(tableWrites).toEqual([
      "content_reports:INSERT",
      "friendships:DELETE",
      "friendships:INSERT",
      "nudges:INSERT",
    ]);

    const byTable: Record<string, string[]> = {};
    for (const r of columns.rows) (byTable[r.table_name] ??= []).push(r.column_name);
    // (Table-level UPDATE would list every column; only the granted ones may appear.)
    expect(byTable["debates"]).toEqual(["challenger_seen_result", "opponent_seen_result"]);
    expect(byTable["friendships"]).toEqual(["accepted_at", "status"]);
    expect(byTable["nudges"]).toEqual(["read_at"]);
    expect(byTable["profiles"]).toEqual(
      [
        "companion_accessory",
        "companion_expression",
        "companion_palette",
        "companion_preset",
        "daily_goal",
        "display_name",
        "goal",
        "handle",
        "notify_nudges_email",
        "notify_nudges_inapp",
        "onboarding_completed",
      ].sort(),
    );
    expect(Object.keys(byTable).sort()).toEqual(["debates", "friendships", "nudges", "profiles"]);
  });
});

function gen() {
  return "00000000-0000-0000-0000-0000000000ff";
}
