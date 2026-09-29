import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAdmin } from "@/test/admin";

vi.mock("@tanstack/react-start", async () => (await import("@/test/server-fn")).startMock);
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

const enforce = vi.hoisted(() => vi.fn());
vi.mock("./rate-limit.server", () => ({ limiter: () => ({ enforce }) }));
const admin = vi.hoisted(() => ({ current: null as ReturnType<typeof fakeAdmin> | null }));
vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return admin.current!.client;
  },
}));

const ME = "11111111-1111-1111-1111-111111111111";
const THEM = "22222222-2222-2222-2222-222222222222";

type Fn = (i: unknown) => Promise<Record<string, unknown>>;
const call = async (name: string, data: unknown, supabase: unknown = {}) => {
  const mod = (await import("./safety.functions")) as unknown as Record<string, Fn>;
  return mod[name]!({ data, context: { userId: ME, supabase } });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  enforce.mockResolvedValue({ ok: true });
  admin.current = fakeAdmin();
  admin.current.rpc.mockResolvedValue({ data: null, error: null });
});

describe("blocking", () => {
  it("blocks through the one SQL function, as the caller and never as anyone else", async () => {
    expect(await call("blockUser", { userId: THEM })).toEqual({ ok: true });
    expect(admin.current!.rpc).toHaveBeenCalledWith("block_user", { _blocker: ME, _blocked: THEM });
  });

  it("refuses to block yourself, and anything that isn't a user id", async () => {
    expect(await call("blockUser", { userId: ME })).toEqual({
      ok: false,
      reason: "You can't block yourself.",
    });
    await expect(call("blockUser", { userId: "not-a-uuid" })).rejects.toThrow();
    expect(admin.current!.rpc).not.toHaveBeenCalled();
  });

  it("says so plainly if the database refuses, without leaking why", async () => {
    admin.current!.rpc.mockResolvedValue({ data: null, error: { message: "secret detail" } });
    const result = await call("blockUser", { userId: THEM });
    expect(result["ok"]).toBe(false);
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("stops when the safety-action limit is reached", async () => {
    enforce.mockResolvedValue({ ok: false, scope: "user", retryAfter: 60, message: "Slow down." });
    const result = await call("blockUser", { userId: THEM });
    expect(result["ok"]).toBe(false);
    expect(admin.current!.rpc).not.toHaveBeenCalled();
  });

  it("only lifts the caller's own block", async () => {
    await call("unblockUser", { userId: THEM });
    const steps = admin.current!.calls.find((c) => c.table === "user_blocks")!.steps;
    expect(steps).toContainEqual(["eq", "blocker_id", ME]);
    expect(steps).toContainEqual(["eq", "blocked_id", THEM]);
  });
});

describe("reporting", () => {
  it("records the report against the caller, with a known reason", async () => {
    expect(
      await call("reportUser", { userId: THEM, reason: "harassment", details: " rude " }),
    ).toEqual({
      ok: true,
    });
    const write = admin.current!.writes.find((w) => w.table === "user_reports")!;
    expect(write.payload).toEqual({
      reporter_id: ME,
      reported_user_id: THEM,
      reason: "harassment",
      details: "rude",
    });
  });

  it("rejects a reason it doesn't know, an oversized note and a self-report", async () => {
    await expect(call("reportUser", { userId: THEM, reason: "because" })).rejects.toThrow();
    await expect(
      call("reportUser", { userId: THEM, reason: "other", details: "x".repeat(1001) }),
    ).rejects.toThrow();
    expect((await call("reportUser", { userId: ME, reason: "other" }))["ok"]).toBe(false);
    expect(admin.current!.writes).toEqual([]);
  });
});

describe("profile visibility", () => {
  it("accepts only the two known values and saves for the caller alone", async () => {
    expect(await call("setProfileVisibility", { visibility: "friends" })).toEqual({
      ok: true,
      visibility: "friends",
    });
    const write = admin.current!.writes.find((w) => w.table === "profiles")!;
    expect(write.payload).toEqual({ profile_visibility: "friends" });
    const steps = admin.current!.calls.find((c) => c.table === "profiles")!.steps;
    expect(steps).toContainEqual(["eq", "id", ME]);
    await expect(call("setProfileVisibility", { visibility: "everyone" })).rejects.toThrow();
  });
});
