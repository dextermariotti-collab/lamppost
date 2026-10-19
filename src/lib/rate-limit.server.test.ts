import { describe, expect, it, vi } from "vitest";
import {
  createLimiter,
  guardedGeneration,
  hashingSecret,
  keyedHash,
  networkKeyFor,
  type Limiter,
} from "./rate-limit.server";

vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => ({ headers: new Headers() }) }));

const member = { userId: "11111111-1111-1111-1111-111111111111", ipKey: "ip:abc" };
const guest = { userId: null, ipKey: "ip:abc" };

const ok = { data: [{ allowed: true, retry_after: 0, tier: null }], error: null };

describe("createLimiter.enforce", () => {
  it("asks the database to count the request with the caller's checks in order", async () => {
    const rpc = vi.fn().mockResolvedValue(ok);
    const result = await createLimiter({ rpc, identity: async () => member }).enforce("grading");
    expect(result).toEqual({ ok: true });
    const [fn, args] = rpc.mock.calls[0]!;
    expect(fn).toBe("check_rate_limits");
    const checks = (args as { _checks: { key: string; tier: string }[] })._checks;
    expect(checks[0]).toMatchObject({ key: `u:${member.userId}` });
    expect(checks.at(-1)).toMatchObject({ key: "all" });
  });

  it("turns a refusal into a friendly message with the wait", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ allowed: false, retry_after: 720, tier: "guest-hour" }],
      error: null,
    });
    const result = await createLimiter({ rpc, identity: async () => guest }).enforce("grading");
    expect(result).toMatchObject({ ok: false, scope: "guest", retryAfterSeconds: 720 });
    expect(result.ok === false && result.message).toMatch(/try again in about 12 minutes/i);
  });

  it("does not blame the caller when the shared budget is spent", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ allowed: false, retry_after: 3000, tier: "global-day" }],
      error: null,
    });
    const result = await createLimiter({ rpc, identity: async () => member }).enforce("socratic");
    expect(result.ok === false && result.scope).toBe("global");
    expect(result.ok === false && result.message).toMatch(/very busy/i);
  });

  it("fails CLOSED when the counters can't be reached", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    for (const rpc of [
      vi.fn().mockResolvedValue({ data: null, error: { message: "connection refused" } }),
      vi.fn().mockRejectedValue(new Error("network")),
      vi.fn().mockResolvedValue({ data: [], error: null }),
    ]) {
      const result = await createLimiter({ rpc, identity: async () => guest }).enforce("grading");
      expect(result).toMatchObject({ ok: false, scope: "unavailable" });
      expect(result.ok === false && result.message).toMatch(/temporarily unavailable/i);
    }
    spy.mockRestore();
  });

  it("fails closed when the caller can't even be identified", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const rpc = vi.fn();
    const result = await createLimiter({
      rpc,
      identity: async () => {
        throw new Error("no secret");
      },
    }).enforce("grading");
    expect(result).toMatchObject({ ok: false, scope: "unavailable" });
    expect(rpc).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("leases", () => {
  it("reports whether the lease was taken, and treats any error as not taken", async () => {
    const taken = createLimiter({
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      identity: async () => guest,
    });
    expect(await taken.acquireLock("gen:lesson-1", 60)).toBe(true);
    const held = createLimiter({
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
      identity: async () => guest,
    });
    expect(await held.acquireLock("gen:lesson-1", 60)).toBe(false);
    const broken = createLimiter({
      rpc: vi.fn().mockRejectedValue(new Error("down")),
      identity: async () => guest,
    });
    expect(await broken.acquireLock("gen:lesson-1", 60)).toBe(false);
    await expect(broken.releaseLock("gen:lesson-1")).resolves.toBeUndefined();
  });
});

describe("network address hashing", () => {
  it("is stable, keyed, and never contains the address", async () => {
    const a = await keyedHash("secret-one", "203.0.113.9");
    expect(await keyedHash("secret-one", "203.0.113.9")).toBe(a);
    expect(await keyedHash("secret-two", "203.0.113.9")).not.toBe(a);
    expect(await keyedHash("secret-one", "203.0.113.10")).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toContain("203");
  });

  it("uses RATE_LIMIT_SECRET when set, else derives one from the service key, else refuses", async () => {
    expect(await hashingSecret({ RATE_LIMIT_SECRET: "explicit" })).toBe("explicit");
    const derived = await hashingSecret({ SUPABASE_SERVICE_ROLE_KEY: "service-key" });
    expect(derived).toMatch(/^[0-9a-f]{32}$/);
    expect(derived).not.toContain("service-key");
    await expect(hashingSecret({})).rejects.toThrow();
  });
});

describe("networkKeyFor", () => {
  const env = { RATE_LIMIT_SECRET: "secret" };
  const from = (h: Record<string, string>) => new Headers(h);

  it("gives every address in one IPv6 /64 the same key, and another /64 its own", async () => {
    const one = await networkKeyFor(from({ "cf-connecting-ip": "2001:db8:1:2::1" }), env);
    expect(await networkKeyFor(from({ "cf-connecting-ip": "2001:db8:1:2:ffff::9" }), env)).toBe(
      one,
    );
    expect(await networkKeyFor(from({ "cf-connecting-ip": "2001:db8:1:3::1" }), env)).not.toBe(one);
    expect(one).toMatch(/^ip:[0-9a-f]{32}$/);
  });

  it("ignores headers a caller can set, unless the host is configured to trust one", async () => {
    const unknown = await networkKeyFor(from({}), env);
    const forged = from({ "x-forwarded-for": "198.51.100.7", "x-real-ip": "198.51.100.8" });
    expect(await networkKeyFor(forged, env)).toBe(unknown);
    expect(await networkKeyFor(forged, { ...env, CLIENT_IP_HEADER: "x-real-ip" })).toBe(
      await networkKeyFor(from({ "cf-connecting-ip": "198.51.100.8" }), env),
    );
    expect(await networkKeyFor(forged, { ...env, CLIENT_IP_HEADER: "" })).toBe(unknown);
  });
});

describe("guardedGeneration", () => {
  const fake = (over: Partial<Limiter> = {}): Limiter & { calls: string[] } => {
    const calls: string[] = [];
    return {
      calls,
      enforce: vi.fn(async () => {
        calls.push("enforce");
        return { ok: true } as const;
      }),
      acquireLock: vi.fn(async () => {
        calls.push("acquire");
        return true;
      }),
      releaseLock: vi.fn(async () => {
        calls.push("release");
      }),
      ...over,
    };
  };
  const opts = (run: () => Promise<string>) => ({
    policy: "lessonGeneration" as const,
    lockKey: "gen:lesson:evidence-types",
    lockTtlSeconds: 120,
    run,
  });

  it("takes the lease, checks the limit, runs once, and releases", async () => {
    const limiter = fake();
    const run = vi.fn(async () => "lesson");
    const result = await guardedGeneration(opts(run), limiter);
    expect(result).toEqual({ status: "ran", value: "lesson" });
    expect(run).toHaveBeenCalledTimes(1);
    expect(limiter.calls).toEqual(["acquire", "enforce", "release"]);
  });

  it("does nothing when someone else is already generating it — and doesn't count against the caller", async () => {
    const limiter = fake({ acquireLock: vi.fn(async () => false) });
    const run = vi.fn(async () => "lesson");
    expect(await guardedGeneration(opts(run), limiter)).toEqual({ status: "busy" });
    expect(run).not.toHaveBeenCalled();
    expect(limiter.enforce).not.toHaveBeenCalled();
  });

  it("does not generate when the caller is over their limit, and gives the lease back", async () => {
    const limiter = fake({
      enforce: vi.fn(async () => ({
        ok: false as const,
        scope: "guest" as const,
        retryAfterSeconds: 600,
        message: "slow down",
      })),
    });
    const run = vi.fn(async () => "lesson");
    const result = await guardedGeneration(opts(run), limiter);
    expect(result).toMatchObject({
      status: "limited",
      message: "slow down",
      retryAfterSeconds: 600,
    });
    expect(run).not.toHaveBeenCalled();
    expect(limiter.releaseLock).toHaveBeenCalledTimes(1);
  });

  it("releases the lease even when the generation throws", async () => {
    const limiter = fake();
    await expect(
      guardedGeneration(
        opts(async () => Promise.reject(new Error("model down"))),
        limiter,
      ),
    ).rejects.toThrow("model down");
    expect(limiter.releaseLock).toHaveBeenCalledTimes(1);
  });
});
