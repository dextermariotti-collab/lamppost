import { describe, expect, it } from "vitest";
import {
  POLICIES,
  checksFor,
  clientIp,
  formatWait,
  limitMessage,
  scopeOf,
  type LimitPolicy,
  type PolicyName,
} from "./rate-limit";

const guest = { userId: null, ipKey: "ip:abc" };
const member = { userId: "11111111-1111-1111-1111-111111111111", ipKey: "ip:abc" };

describe("checksFor", () => {
  it("limits a guest by network key, then applies the shared budget last", () => {
    const checks = checksFor("grading", guest);
    expect(checks.every((c) => c.bucket === "grading")).toBe(true);
    expect(checks.at(-1)).toMatchObject({ key: "all", tier: expect.stringMatching(/^global-/) });
    const own = checks.slice(0, -1);
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((c) => c.key === "ip:abc" && c.tier.startsWith("guest-"))).toBe(true);
  });

  it("limits a signed-in user by account first, with a looser network backstop", () => {
    const checks = checksFor("grading", member);
    expect(checks[0]).toMatchObject({
      key: `u:${member.userId}`,
      tier: expect.stringMatching(/^user-/),
    });
    const ip = checks.filter((c) => c.tier.startsWith("ip-"));
    expect(ip.length).toBeGreaterThan(0);
    expect(ip.every((c) => c.key === "ip:abc")).toBe(true);
    expect(checks.at(-1)?.key).toBe("all");
    // Order matters to the database: caller limits before the shared one.
    const firstGlobal = checks.findIndex((c) => c.tier.startsWith("global-"));
    expect(checks.slice(firstGlobal).every((c) => c.tier.startsWith("global-"))).toBe(true);
  });

  it("gives signed-in users more room than guests on the same window", () => {
    for (const name of Object.keys(POLICIES) as PolicyName[]) {
      const policy: LimitPolicy = POLICIES[name];
      if (policy.user.length === 0 || policy.guest.length === 0) continue;
      const day = (tiers: readonly { name: string; max: number }[]) =>
        tiers.find((t) => t.name === "day")?.max ?? 0;
      expect(day(policy.user), name).toBeGreaterThanOrEqual(day(policy.guest));
    }
  });

  it("keeps every window inside what the database accepts", () => {
    for (const name of Object.keys(POLICIES) as PolicyName[]) {
      for (const identity of [guest, member]) {
        for (const c of checksFor(name, identity)) {
          expect(c.window_seconds).toBeGreaterThanOrEqual(1);
          expect(c.window_seconds).toBeLessThanOrEqual(604_800);
          expect(c.max).toBeGreaterThanOrEqual(0);
          expect(c.key.length).toBeLessThanOrEqual(96);
        }
      }
    }
  });
});

describe("policies protect the expensive paths", () => {
  it("has a tight cap on the unused topic-generation endpoints", () => {
    const day = POLICIES.topicGeneration.guest.find((t) => t.name === "day")!;
    expect(day.max).toBeLessThanOrEqual(5);
  });

  it("caps lesson generation globally, per hour", () => {
    expect(POLICIES.lessonGeneration.global.some((t) => t.name === "hour")).toBe(true);
  });

  it("does not offer guests a policy for signed-in-only actions", () => {
    expect(POLICIES.buyFreeze.guest).toEqual([]);
    expect(POLICIES.practiceTurn.guest).toEqual([]);
  });
});

describe("clientIp", () => {
  const headers = (h: Record<string, string>) => ({
    get: (n: string) => h[n.toLowerCase()] ?? null,
  });

  it("prefers the platform-set address over one a caller could type into a header", () => {
    expect(
      clientIp(
        headers({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.1, 10.0.0.1" }),
      ),
    ).toBe("203.0.113.9");
    expect(clientIp(headers({ "x-real-ip": "203.0.113.10" }))).toBe("203.0.113.10");
    expect(clientIp(headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe("198.51.100.1");
  });

  it("accepts IPv6 and rejects garbage", () => {
    expect(clientIp(headers({ "cf-connecting-ip": "2001:db8::1" }))).toBe("2001:db8::1");
    expect(clientIp(headers({ "cf-connecting-ip": "<script>alert(1)</script>" }))).toBeNull();
    expect(clientIp(headers({}))).toBeNull();
  });
});

describe("messages", () => {
  it("says how long to wait in plain words", () => {
    expect(formatWait(5)).toBe("a few seconds");
    expect(formatWait(30)).toBe("less than a minute");
    expect(formatWait(75)).toBe("about a minute");
    expect(formatWait(12 * 60)).toBe("about 12 minutes");
    expect(formatWait(80 * 60)).toBe("about an hour");
    expect(formatWait(5 * 3600)).toBe("about 5 hours");
    expect(formatWait(30 * 3600)).toBe("tomorrow");
  });

  it("blames the caller for their own limit, but not for a busy service", () => {
    const own = limitMessage("grading", "user", 600);
    expect(own).toMatch(/try again in about 10 minutes/i);
    expect(own).toMatch(/grading/i);
    const shared = limitMessage("grading", "global", 600);
    expect(shared).toMatch(/busy/i);
    expect(shared).not.toMatch(/you've used/i);
    expect(limitMessage("grading", "unavailable", 30)).toMatch(/temporarily unavailable/i);
  });

  it("reads the scope from a tier name", () => {
    expect(scopeOf("user-hour")).toBe("user");
    expect(scopeOf("guest-day")).toBe("guest");
    expect(scopeOf("ip-hour")).toBe("ip");
    expect(scopeOf("global-day")).toBe("global");
    expect(scopeOf(null)).toBe("ip");
  });
});
