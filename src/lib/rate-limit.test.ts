import { describe, expect, it } from "vitest";
import {
  POLICIES,
  checksFor,
  clientIp,
  formatWait,
  limitMessage,
  networkKey,
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
  it("caps lesson generation globally, per hour", () => {
    expect(POLICIES.lessonGeneration.global.some((t) => t.name === "hour")).toBe(true);
  });

  it("does not offer guests a policy for signed-in-only actions", () => {
    for (const name of [
      "leagueView",
      "practiceTurn",
      "consent",
      "safety",
      "friendRequest",
      "profileSearch",
    ] as const) {
      expect(POLICIES[name].guest, name).toEqual([]);
    }
  });
});

describe("the social policies", () => {
  it("limit friend requests and people searches per account, under a shared daily budget", () => {
    expect(POLICIES.friendRequest.user).toEqual([
      { name: "hour", seconds: 3600, max: 10 },
      { name: "day", seconds: 86_400, max: 30 },
    ]);
    expect(POLICIES.friendRequest.global).toEqual([{ name: "day", seconds: 86_400, max: 5000 }]);
    expect(POLICIES.profileSearch.user).toEqual([{ name: "hour", seconds: 3600, max: 60 }]);
    expect(POLICIES.profileSearch.global).toEqual([{ name: "day", seconds: 86_400, max: 20_000 }]);
  });
});

describe("clientIp", () => {
  const headers = (h: Record<string, string>) => ({
    get: (n: string) => h[n.toLowerCase()] ?? null,
  });

  it("reads only the header the host sets, never one a caller could type", () => {
    expect(
      clientIp(
        headers({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.1, 10.0.0.1" }),
      ),
    ).toBe("203.0.113.9");
    expect(clientIp(headers({ "x-real-ip": "203.0.113.10" }))).toBeNull();
    expect(clientIp(headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBeNull();
  });

  it("reads another header when the host is configured to, taking the entry the proxy added", () => {
    const sent = headers({ "cf-connecting-ip": "203.0.113.9", "x-real-ip": "203.0.113.10" });
    expect(clientIp(sent, "X-Real-IP")).toBe("203.0.113.10");
    expect(
      clientIp(headers({ "x-forwarded-for": "6.6.6.6, 198.51.100.1" }), "x-forwarded-for"),
    ).toBe("198.51.100.1");
    expect(clientIp(sent, " ")).toBe("203.0.113.9");
  });

  it("accepts IPv6 and rejects garbage", () => {
    expect(clientIp(headers({ "cf-connecting-ip": "2001:db8::1" }))).toBe("2001:db8::1");
    expect(clientIp(headers({ "cf-connecting-ip": "<script>alert(1)</script>" }))).toBeNull();
    expect(clientIp(headers({}))).toBeNull();
  });
});

describe("networkKey", () => {
  it("keys IPv6 by its /64, however the address is written", () => {
    const key = networkKey("2001:db8:aaaa:bbbb::1");
    expect(key).toBe("2001:db8:aaaa:bbbb::/64");
    for (const same of [
      "2001:db8:aaaa:bbbb:1234:5678:9abc:def0",
      "2001:0DB8:AAAA:BBBB:ffff:ffff:ffff:ffff",
      "2001:db8:aaaa:bbbb:0:0:0:2",
    ]) {
      expect(networkKey(same), same).toBe(key);
    }
    expect(networkKey("2001:db8:aaaa:bbbc::1")).not.toBe(key);
    expect(networkKey("::1")).toBe("0:0:0:0::/64");
    expect(networkKey("fe80::")).toBe("fe80:0:0:0::/64");
  });

  it("keeps IPv4 as it is, including IPv4 written as IPv6", () => {
    expect(networkKey("203.0.113.9")).toBe("203.0.113.9");
    expect(networkKey("::ffff:203.0.113.9")).toBe("203.0.113.9");
    expect(networkKey("::ffff:cb00:7109")).toBe("203.0.113.9");
  });

  it("leaves an address it can't read as its own key", () => {
    expect(networkKey("1:2:3:4:5:6:7:8:9")).toBe("1:2:3:4:5:6:7:8:9");
    expect(networkKey("1::2::3")).toBe("1::2::3");
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
