import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAdmin, filteredTo } from "@/test/admin";

vi.mock("@tanstack/react-start", async () => (await import("@/test/server-fn")).startMock);
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

const state = vi.hoisted(() => ({
  admin: null as ReturnType<typeof import("@/test/admin").fakeAdmin> | null,
  deleteUser: vi.fn(),
  order: [] as string[],
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return { ...state.admin!.client, auth: { admin: { deleteUser: state.deleteUser } } };
  },
}));

const USER = "11111111-1111-1111-1111-111111111111";
const run = async (
  name: "deleteMyAccount" | "exportMyData",
  data?: unknown,
  supabase?: unknown,
) => {
  const mod = (await import("./account-data.functions")) as unknown as Record<
    string,
    (input: unknown) => Promise<unknown>
  >;
  return mod[name]!({
    data,
    context: { userId: USER, supabase, claims: { email: "a@example.test" } },
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  state.order = [];
  state.admin = fakeAdmin();
  state.deleteUser.mockImplementation(async () => {
    state.order.push("deleteUser");
    return { error: null };
  });
});

describe("deleting an account", () => {
  it("needs the word DELETE, exactly", async () => {
    await expect(run("deleteMyAccount", { confirm: "delete" })).rejects.toThrow(/DELETE/);
    await expect(run("deleteMyAccount", { confirm: "" })).rejects.toThrow(/DELETE/);
    await expect(run("deleteMyAccount", undefined)).rejects.toThrow(/DELETE/);
    expect(state.deleteUser).not.toHaveBeenCalled();
  });

  it("removes the sign-in identity of the caller, and only theirs, then clears their counters", async () => {
    expect(await run("deleteMyAccount", { confirm: "DELETE" })).toEqual({ ok: true });
    expect(state.deleteUser).toHaveBeenCalledWith(USER);
    expect(state.deleteUser).toHaveBeenCalledTimes(1);
    const cleanup = state.admin!.calls.find((c) => c.table === "rate_limits")!;
    expect(cleanup).toBeDefined();
    expect(filteredTo(cleanup, "key", `u:${USER}`)).toBe(true);
    expect(state.admin!.writes.map((w) => `${w.table}:${w.op}`)).toEqual(["rate_limits:delete"]);
  });

  it("does the irreversible step first, so a failure never leaves a half-deleted account", async () => {
    state.deleteUser.mockResolvedValue({ error: { message: "database is down" } });
    await expect(run("deleteMyAccount", { confirm: "DELETE" })).rejects.toThrow(
      /couldn't finish deleting/i,
    );
    expect(state.admin!.writes).toEqual([]);
  });

  it("still succeeds if only the counter cleanup fails", async () => {
    state.admin = fakeAdmin({ rate_limits: { error: { message: "nope" } } });
    expect(await run("deleteMyAccount", { confirm: "DELETE" })).toEqual({ ok: true });
  });
});

describe("exporting the data", () => {
  it("includes the acceptance history and the rewards, read for this user only", async () => {
    state.admin = fakeAdmin({
      profiles: { single: { id: USER, handle: "dex" } },
      consent_records: { rows: [{ terms_version: "2026-09-30", age_band: "18+" }] },
      reward_chests: { rows: [{ amount: 5 }] },
      user_reports: { rows: [{ id: "r1", reason: "spam" }] },
    });
    const userClient = fakeAdmin({ user_blocks: { rows: [{ blocked_id: "x" }] } }).client;
    const out = (await run("exportMyData", undefined, userClient)) as Record<string, unknown>;
    expect(out["consentRecords"]).toEqual([{ terms_version: "2026-09-30", age_band: "18+" }]);
    expect(out["rewardChests"]).toEqual([{ amount: 5 }]);
    expect(out["account"]).toEqual({ id: USER, email: "a@example.test" });
    expect(out["blockedPeople"]).toEqual([{ blocked_id: "x" }]);
    expect(out["reportsYouSent"]).toEqual([{ id: "r1", reason: "spam" }]);
    // Reports are only ever looked up by who SENT them, never by who they were about.
    const reports = state.admin!.calls.find((c) => c.table === "user_reports")!;
    expect(filteredTo(reports, "reporter_id", USER)).toBe(true);
    expect(filteredTo(reports, "reported_user_id", USER)).toBe(false);
    for (const table of [
      "consent_records",
      "reward_chests",
      "user_cosmetics",
      "xp_weekly",
      "league_results",
    ]) {
      const call = state.admin!.calls.find((c) => c.table === table)!;
      expect(filteredTo(call, "user_id", USER), table).toBe(true);
    }
  });
});
