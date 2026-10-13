import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * An in-memory Postgres with the app's real migrations applied, plus the small
 * part of Supabase they rely on (the auth schema, auth.uid() and the three API
 * roles, with Supabase's permissive default privileges). It exists so the row-
 * level-security rules can be tested as the roles that use them, not just read.
 */

const ROOT = process.cwd();

/**
 * `before` stops at a migration: only the ones sorted ahead of that file are
 * applied, which is the database as it was when that migration is about to run.
 */
export async function migratedDb(opts: { before?: string } = {}): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, raw_user_meta_data jsonb);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
  `);
  const migrations = readdirSync(join(ROOT, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql") && (opts.before === undefined || f < opts.before))
    .sort();
  for (const f of migrations)
    await db.exec(readFileSync(join(ROOT, "supabase/migrations", f), "utf8"));
  return db;
}

export type Role = "anon" | "authenticated" | "service_role";

/** Runs `fn` as a database role, the way PostgREST does for an API request. */
export async function as<T>(db: PGlite, role: Role, userId: string | null, fn: () => Promise<T>) {
  await db.exec(`SET ROLE ${role}`);
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [userId ?? ""]);
  try {
    return await fn();
  } finally {
    await db.exec(`RESET ROLE`);
    await db.query(`SELECT set_config('request.jwt.claim.sub', '', false)`);
  }
}

/** Runs one statement and reports whether it was allowed, without throwing. */
export async function attempt(db: PGlite, sql: string, params: unknown[] = []) {
  try {
    const result = await db.query(sql, params);
    return { ok: true as const, rows: result.rows as Record<string, unknown>[] };
  } catch (error) {
    return { ok: false as const, error: String((error as Error).message).split("\n")[0]! };
  }
}
