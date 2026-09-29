import type { PGlite } from "@electric-sql/pglite";

export const ALICE = "00000000-0000-0000-0000-00000000000a";
export const BOB = "00000000-0000-0000-0000-00000000000b";
export const CAROL = "00000000-0000-0000-0000-00000000000c";

/** Creates sign-in identities (the signup trigger makes each a profile). */
export async function createUsers(db: PGlite, ids: readonly string[]) {
  for (const id of ids) {
    await db.query(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, '{}')`, [
      id,
      `${id.slice(-1)}@example.test`,
    ]);
  }
}

/**
 * Gives `person` a row in every table that holds a person's data, linked to `friend` where the
 * table is about a pair. The server writes all of these in the real app, so it is done as the
 * service role.
 */
export async function seedPersonData(db: PGlite, person: string, friend: string) {
  await db.exec(`SET ROLE service_role`);
  try {
    await db.query(
      `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'accepted')`,
      [person, friend],
    );
    await db.query(
      `INSERT INTO shared_streaks (friendship_id, proposed_by, status) SELECT id, $1, 'active' FROM friendships WHERE requester_id=$1 AND addressee_id=$2`,
      [person, friend],
    );
    await db.query(
      `INSERT INTO nudges (from_user_id, to_user_id, day) VALUES ($1,$2,'2026-09-23')`,
      [person, friend],
    );
    await db.query(
      `INSERT INTO daily_activity (user_id, day, lessons_completed) VALUES ($1,'2026-09-23',2)`,
      [person],
    );
    await db.query(
      `INSERT INTO user_achievements (user_id, achievement_code) VALUES ($1,'streak_7')`,
      [person],
    );
    await db.query(
      `INSERT INTO argument_attempts (user_id, lesson_id, lesson_title, answer, total) VALUES ($1,'l','t','a',16)`,
      [person],
    );
    await db.query(
      `INSERT INTO practice_sessions (user_id, course_slug, course_topic, lesson_index, lesson_title, verdict) VALUES ($1,'s','t',1,'t','solid')`,
      [person],
    );
    await db.query(`INSERT INTO subscriptions (user_id, status) VALUES ($1,'active')`, [person]);
    await db.query(
      `INSERT INTO debates (challenger_id, opponent_id, topic, prompt, passage, challenger_side, opponent_side) VALUES ($1,$2,'t','p','p','for','against')`,
      [person, friend],
    );
    await db.query(
      `INSERT INTO reward_chests (user_id, opened_on, source, kind, amount) VALUES ($1,'2026-09-23','lesson','gems',5)`,
      [person],
    );
    await db.query(`INSERT INTO user_cosmetics (user_id, item) VALUES ($1,'bow')`, [person]);
    await db.query(`INSERT INTO xp_weekly (user_id, week_start, xp) VALUES ($1,'2026-09-21',100)`, [
      person,
    ]);
    await db.query(
      `INSERT INTO league_results (user_id, week_start, rank, group_size, weekly_xp, tier_before, tier_after) VALUES ($1,'2026-09-14',1,3,120,0,1)`,
      [person],
    );
    await db.query(`SELECT public.record_consent($1, 't', 'p', '18+', false)`, [person]);
    await db.query(`INSERT INTO content_reports (user_id, reason) VALUES ($1,'other')`, [person]);
    await db.query(`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1,$2)`, [
      person,
      friend,
    ]);
    await db.query(
      `INSERT INTO user_reports (reporter_id, reported_user_id, reason) VALUES ($1,$2,'other')`,
      [person, friend],
    );
    await db.query(
      `INSERT INTO moderation_blocks (user_id, topic, category, stage) VALUES ($1,'x','other','input')`,
      [person],
    );
    await db.query(
      `INSERT INTO rate_limits (bucket, key, window_start, hits) VALUES ('grading','u:${person}', now(), 1)`,
    );
  } finally {
    await db.exec(`RESET ROLE`);
  }
}
