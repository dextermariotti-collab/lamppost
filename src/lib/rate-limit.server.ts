import { getRequest } from "@tanstack/react-start/server";
import {
  checksFor,
  clientIp,
  limitMessage,
  scopeOf,
  type Identity,
  type LimitScope,
  type PolicyName,
} from "./rate-limit";

/**
 * Enforcement for the limits in rate-limit.ts: identifies the caller, asks the
 * database to count the request, and — for expensive work — takes a short lease
 * so a burst of identical requests starts one job instead of many.
 *
 * It fails CLOSED. If the counters can't be reached the request is refused with
 * a "temporarily unavailable" message: an outage of the limiter must not turn
 * into an unbounded AI bill. Cached content never goes through here, so
 * learners keep working from the cache.
 */

export type LimitResult =
  { ok: true } | { ok: false; scope: LimitScope; retryAfterSeconds: number; message: string };

type Rpc = (
  fn: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

export type Limiter = {
  /** Counts this request against `policy` and says whether it may go ahead. */
  enforce(policy: PolicyName): Promise<LimitResult>;
  /** Takes the lease for `key`; false if someone else holds it (or on any error). */
  acquireLock(key: string, ttlSeconds: number): Promise<boolean>;
  releaseLock(key: string): Promise<void>;
};

/** A keyed hash, so the database holds a stable opaque key and never a network address. */
export async function keyedHash(secret: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return Array.from(signature.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The key network addresses are hashed with: RATE_LIMIT_SECRET if it is set,
 * otherwise a value derived from the service-role key, so the feature works
 * without configuring anything new.
 */
export async function hashingSecret(env: Record<string, string | undefined>): Promise<string> {
  if (env["RATE_LIMIT_SECRET"]) return env["RATE_LIMIT_SECRET"];
  const base = env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!base) throw new Error("No secret available to key rate limits");
  return await keyedHash("lamppost-rate-limit-v1", base);
}

export function createLimiter(deps: { rpc: Rpc; identity: () => Promise<Identity> }): Limiter {
  return {
    async enforce(policy) {
      try {
        const identity = await deps.identity();
        const checks = checksFor(policy, identity);
        if (checks.length === 0) return { ok: true };
        const { data, error } = await deps.rpc("check_rate_limits", { _checks: checks });
        if (error) throw new Error(error.message);
        const row = (Array.isArray(data) ? data[0] : data) as
          { allowed: boolean; retry_after: number; tier: string | null } | undefined;
        if (!row) throw new Error("The rate limiter gave no answer");
        if (row.allowed) return { ok: true };
        const scope = scopeOf(row.tier);
        return {
          ok: false,
          scope,
          retryAfterSeconds: row.retry_after,
          message: limitMessage(policy, scope, row.retry_after),
        };
      } catch (error) {
        console.error(`[rate-limit] ${policy}: limiter unavailable, refusing (fail closed)`, error);
        return {
          ok: false,
          scope: "unavailable",
          retryAfterSeconds: 30,
          message: limitMessage(policy, "unavailable", 30),
        };
      }
    },

    async acquireLock(key, ttlSeconds) {
      try {
        const { data, error } = await deps.rpc("acquire_lock", {
          _key: key,
          _ttl_seconds: ttlSeconds,
        });
        return !error && data === true;
      } catch {
        return false;
      }
    },

    async releaseLock(key) {
      try {
        await deps.rpc("release_lock", { _key: key });
      } catch {
        /* the lease expires by itself */
      }
    },
  };
}

/** Who is calling: the account (if signed in) and a keyed hash of their network address. */
async function requestIdentity(): Promise<Identity> {
  const { optionalUserId } = await import("./optional-auth.server");
  const userId = await optionalUserId();
  const ip = clientIp(getRequest().headers);
  const secret = await hashingSecret(process.env);
  // Callers with no readable address share one strict bucket rather than escaping the limit.
  const ipKey = `ip:${await keyedHash(secret, ip ?? "unknown")}`;
  return { userId, ipKey };
}

let shared: Limiter | undefined;

/** The limiter the server functions use: counters and leases in the database. */
export function limiter(): Limiter {
  shared ??= createLimiter({
    identity: requestIdentity,
    rpc: async (fn, args) => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      return await (supabaseAdmin.rpc as unknown as Rpc)(fn, args);
    },
  });
  return shared;
}

/* ---------------------------- guarded generation ---------------------------- */

export type Guarded<T> =
  | { status: "ran"; value: T }
  | { status: "limited"; scope: LimitScope; retryAfterSeconds: number; message: string }
  | { status: "busy" };

/**
 * Runs an expensive generation only if nobody else is already doing the same
 * job, and only within the caller's limits. Call it on a CACHE MISS only:
 * cached content is served without touching the limiter.
 *
 * Order matters: the lease is taken first, so a request that would just wait on
 * someone else's generation is not counted against the caller.
 */
export async function guardedGeneration<T>(
  opts: {
    policy: PolicyName;
    lockKey: string;
    lockTtlSeconds: number;
    run: () => Promise<T>;
  },
  using: Limiter = limiter(),
): Promise<Guarded<T>> {
  if (!(await using.acquireLock(opts.lockKey, opts.lockTtlSeconds))) return { status: "busy" };
  try {
    const verdict = await using.enforce(opts.policy);
    if (!verdict.ok) {
      return {
        status: "limited",
        scope: verdict.scope,
        retryAfterSeconds: verdict.retryAfterSeconds,
        message: verdict.message,
      };
    }
    return { status: "ran", value: await opts.run() };
  } finally {
    await using.releaseLock(opts.lockKey);
  }
}
