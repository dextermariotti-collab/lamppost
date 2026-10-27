import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, attempt, migratedDb } from "@/test/db";

/**
 * The counters and leases behind the AI rate limits, run in real Postgres as the
 * role that uses them (the service role), and checked to be out of reach of the
 * browser roles.
 */
let db: PGlite;

const check = (bucket: string, key: string, tier: string, seconds: number, max: number) => ({
  bucket,
  key,
  tier,
  window_seconds: seconds,
  max,
});

const call = async (checks: ReturnType<typeof check>[]) => {
  const r = await as(db, "service_role", null, () =>
    attempt(db, `SELECT * FROM check_rate_limits($1::jsonb)`, [JSON.stringify(checks)]),
  );
  if (!r.ok) throw new Error(r.error);
  return r.rows[0] as { allowed: boolean; retry_after: number; tier: string | null };
};

const hits = async (bucket: string, key: string) => {
  const r = await db.query<{ n: number }>(
    `SELECT coalesce(sum(hits),0)::int AS n FROM rate_limits WHERE bucket=$1 AND key=$2`,
    [bucket, key],
  );
  return r.rows[0]!.n;
};

beforeAll(async () => {
  db = await migratedDb();
}, 60_000);
afterAll(async () => {
  await db.close();
});

describe("check_rate_limits", () => {
  it("allows requests up to the limit, then refuses with a wait inside the window", async () => {
    const c = check("t1", "ip:a", "guest-hour", 3600, 3);
    for (let i = 0; i < 3; i++) expect((await call([c])).allowed).toBe(true);
    const refused = await call([c]);
    expect(refused.allowed).toBe(false);
    expect(refused.tier).toBe("guest-hour");
    expect(refused.retry_after).toBeGreaterThan(0);
    expect(refused.retry_after).toBeLessThanOrEqual(3600);
  });

  it("keeps callers and policies separate", async () => {
    const one = check("t2", "ip:one", "guest-hour", 3600, 1);
    const two = check("t2", "ip:two", "guest-hour", 3600, 1);
    const other = check("t2-other", "ip:one", "guest-hour", 3600, 1);
    expect((await call([one])).allowed).toBe(true);
    expect((await call([one])).allowed).toBe(false);
    expect((await call([two])).allowed).toBe(true);
    expect((await call([other])).allowed).toBe(true);
  });

  it("stops at the first refusal, so a refused caller can't drain the shared budget", async () => {
    const own = check("t3", "ip:x", "guest-hour", 3600, 1);
    const shared = check("t3", "all", "global-day", 86_400, 1000);
    expect((await call([own, shared])).allowed).toBe(true);
    for (let i = 0; i < 5; i++) expect((await call([own, shared])).allowed).toBe(false);
    // Only the first, allowed request reached the shared counter.
    expect(await hits("t3", "all")).toBe(1);
  });

  it("does not count a request against a longer window when a shorter one refuses it", async () => {
    const minute = check("t4", "ip:y", "guest-minute", 60, 1);
    const day = check("t4", "ip:y", "guest-day", 86_400, 100);
    expect((await call([minute, day])).allowed).toBe(true);
    expect((await call([minute, day])).allowed).toBe(false);
    const rows = await db.query<{ n: number }>(
      `SELECT hits AS n FROM rate_limits WHERE bucket='t4' AND key='ip:y' AND window_start = to_timestamp(floor(extract(epoch FROM now())/86400)*86400)`,
    );
    expect(rows.rows[0]?.n).toBe(1);
  });

  it("starts counting again in a new window", async () => {
    const c = check("t5", "ip:z", "guest-hour", 3600, 1);
    await db.query(
      `INSERT INTO rate_limits (bucket, key, window_start, hits) VALUES ('t5','ip:z', now() - interval '2 hours', 999)`,
    );
    expect((await call([c])).allowed).toBe(true);
    expect((await call([c])).allowed).toBe(false);
  });

  it("refuses malformed checks instead of guessing", async () => {
    for (const bad of [
      check("t6", "k", "x", 0, 1),
      check("t6", "k", "x", 999_999_999, 1),
      check("t6", "k", "x", 60, -1),
    ]) {
      await expect(call([bad])).rejects.toThrow(/invalid rate limit/);
    }
  });

  it("a limit of zero refuses everything", async () => {
    expect((await call([check("t7", "k", "user-day", 86_400, 0)])).allowed).toBe(false);
  });
});

describe("acquire_lock / release_lock", () => {
  const lock = async (key: string, ttl = 60) => {
    const r = await as(db, "service_role", null, () =>
      attempt(db, `SELECT acquire_lock($1, $2) AS got`, [key, ttl]),
    );
    if (!r.ok) throw new Error(r.error);
    return r.rows[0]!["got"] as boolean;
  };
  const release = (key: string) =>
    as(db, "service_role", null, () => attempt(db, `SELECT release_lock($1)`, [key]));

  it("lets one worker hold a piece of work at a time", async () => {
    expect(await lock("gen:a")).toBe(true);
    expect(await lock("gen:a")).toBe(false);
    expect(await lock("gen:b")).toBe(true);
    await release("gen:a");
    expect(await lock("gen:a")).toBe(true);
  });

  it("hands the work over once a lease has expired, so a crashed worker can't block it", async () => {
    expect(await lock("gen:crash")).toBe(true);
    await db.query(
      `UPDATE server_locks SET expires_at = now() - interval '1 second' WHERE key='gen:crash'`,
    );
    expect(await lock("gen:crash")).toBe(true);
  });

  it("gives out exactly one lease when many callers ask at once", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => lock("gen:race")));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

describe("browser roles cannot reach the limiter", () => {
  const USER = "00000000-0000-0000-0000-0000000000aa";

  it("cannot read, write or run any of it", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      const uid = role === "authenticated" ? USER : null;
      for (const sql of [
        `SELECT * FROM rate_limits`,
        `SELECT * FROM server_locks`,
        `DELETE FROM rate_limits`,
        `INSERT INTO server_locks (key, expires_at) VALUES ('x', now())`,
        `SELECT * FROM check_rate_limits('[]'::jsonb)`,
        `SELECT acquire_lock('x', 5)`,
        `SELECT release_lock('x')`,
      ]) {
        const r = await as(db, role, uid, () => attempt(db, sql));
        expect(r.ok, `${role}: ${sql}`).toBe(false);
      }
    }
  });
});
