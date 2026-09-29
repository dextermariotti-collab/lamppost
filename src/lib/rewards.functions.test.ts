import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAdmin, filteredTo } from "@/test/admin";
import {
  CHEST_PRIZES,
  HINT_COST,
  HINT_OVERFLOW_GEMS,
  MAX_HINT_TOKENS,
  cosmeticById,
} from "./rewards";

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

const USER = "11111111-1111-1111-1111-111111111111";
const TODAY = "2026-09-28";
const SYNCED = new Date().toISOString().slice(0, 10);

type Call = (input?: unknown) => Promise<unknown>;
const call = async (name: string, data?: unknown) => {
  const mod = (await import("./rewards.functions")) as unknown as Record<string, Call>;
  return mod[name]!({ data, context: { userId: USER } } as never);
};

const tables = (activity: number, snapshot: Partial<Record<string, unknown>> = {}) => ({
  daily_activity: { single: { lessons_completed: activity } },
  profiles: { single: { gems_spent: 0, gems_granted: 0, hint_tokens: 0, ...snapshot } },
  user_cosmetics: { rows: [] },
  reward_chests: { rows: [], count: 0 },
});
const granted = (over: Record<string, unknown> = {}) => ({
  data: [
    {
      ok: true,
      reason: null,
      kind: "gems",
      amount: 10,
      converted: false,
      opened_today: 1,
      balance: 10,
      hint_tokens: 0,
      ...over,
    },
  ],
  error: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  enforce.mockResolvedValue({ ok: true });
  admin.current = fakeAdmin(tables(2));
});

describe("openChest", () => {
  it("rolls a prize from the published odds and asks the database to grant it", async () => {
    admin.current!.rpc.mockResolvedValue(granted());
    const result = await call("openChest", { today: SYNCED, source: "lesson" });
    expect(result).toMatchObject({
      ok: true,
      record: { kind: "gems", amount: 10, source: "lesson" },
    });
    const [name, args] = admin.current!.rpc.mock.calls[0]!;
    expect(name).toBe("grant_chest");
    expect(args).toMatchObject({
      _user: USER,
      _source: "lesson",
      _max_tokens: MAX_HINT_TOKENS,
      _fallback_gems: HINT_OVERFLOW_GEMS,
    });
    // Whatever was rolled is one of the advertised prizes.
    expect(CHEST_PRIZES.some((p) => p.kind === args._kind && p.amount === args._amount)).toBe(true);
  });

  it("limits the day's chests to what was done today: two things done, two chests", async () => {
    admin.current = fakeAdmin(tables(2));
    admin.current.rpc.mockResolvedValue(granted());
    await call("openChest", { today: SYNCED, source: "review" });
    expect(admin.current.rpc.mock.calls[0]![1]._cap).toBe(2);

    admin.current = fakeAdmin(tables(40));
    admin.current.rpc.mockResolvedValue(granted());
    await call("openChest", { today: SYNCED, source: "review" });
    expect(admin.current.rpc.mock.calls[0]![1]._cap).toBe(3);
  });

  it("gives nothing, and doesn't roll, when nothing has been done today", async () => {
    admin.current = fakeAdmin(tables(0));
    const result = await call("openChest", { today: SYNCED, source: "lesson" });
    expect(result).toMatchObject({ ok: false, reason: "daily-limit" });
    expect(admin.current.rpc).not.toHaveBeenCalled();
  });

  it("reports the database's refusal in plain words, without giving anything", async () => {
    admin.current!.rpc.mockResolvedValue({
      data: [
        {
          ok: false,
          reason: "daily-limit",
          kind: null,
          amount: 0,
          converted: false,
          opened_today: 3,
          balance: 0,
          hint_tokens: 0,
        },
      ],
      error: null,
    });
    const result = (await call("openChest", { today: SYNCED, source: "lesson" })) as {
      ok: boolean;
      message: string;
    };
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/all the chests for today/i);
  });

  it("says a hint token became gems when the pouch was full", async () => {
    admin.current!.rpc.mockResolvedValue(
      granted({ kind: "gems", amount: HINT_OVERFLOW_GEMS, converted: true }),
    );
    const result = (await call("openChest", { today: SYNCED, source: "lesson" })) as {
      record: { converted: boolean; kind: string };
    };
    expect(result.record).toMatchObject({ converted: true, kind: "gems" });
  });

  it("reads the caller's own activity and returns the account's snapshot", async () => {
    admin.current!.rpc.mockResolvedValue(granted());
    const result = (await call("openChest", { today: SYNCED, source: "lesson" })) as {
      snapshot: { chests: { day: string } };
    };
    expect(result.snapshot.chests.day).toBe(SYNCED);
    const activity = admin.current!.calls.find((c) => c.table === "daily_activity")!;
    expect(filteredTo(activity, "user_id", USER)).toBe(true);
    for (const table of ["profiles", "user_cosmetics", "reward_chests"]) {
      const c = admin.current!.calls.find((x) => x.table === table)!;
      expect(filteredTo(c, table === "profiles" ? "id" : "user_id", USER), table).toBe(true);
    }
  });

  it("is limited before it touches the database", async () => {
    enforce.mockResolvedValue({
      ok: false,
      scope: "user",
      retryAfterSeconds: 120,
      message: "Slow down a little. Try again in about 2 minutes.",
    });
    expect(await call("openChest", { today: SYNCED, source: "lesson" })).toMatchObject({
      ok: false,
      limited: true,
    });
    expect(enforce).toHaveBeenCalledWith("openChest");
    expect(admin.current!.rpc).not.toHaveBeenCalled();
  });

  it("fails without taking anything if the database errors", async () => {
    admin.current!.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const result = (await call("openChest", { today: SYNCED, source: "lesson" })) as {
      ok: boolean;
      message: string;
    };
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/nothing was spent/i);
  });

  it("only accepts a lesson, review or challenge as the source", async () => {
    await expect(call("openChest", { today: SYNCED, source: "casino" })).rejects.toThrow();
    await expect(call("openChest", { source: "lesson", extra: 1 })).resolves.toBeTruthy();
  });

  it("takes no price, prize or amount from the caller", async () => {
    admin.current!.rpc.mockResolvedValue(granted({ amount: 5 }));
    await call("openChest", {
      today: SYNCED,
      source: "lesson",
      amount: 9999,
      kind: "gems",
      cap: 99,
    });
    const args = admin.current!.rpc.mock.calls[0]![1];
    expect(args._amount).not.toBe(9999);
    expect(args._cap).toBeLessThanOrEqual(3);
  });
});

describe("buyHintToken", () => {
  it("charges the server-held price", async () => {
    admin.current!.rpc.mockResolvedValue({
      data: [{ ok: true, reason: null, balance: 40, spent: 20, granted: 0, hint_tokens: 1 }],
      error: null,
    });
    const result = await call("buyHintToken", { today: SYNCED });
    expect(result).toMatchObject({ ok: true });
    expect(admin.current!.rpc).toHaveBeenCalledWith("buy_hint_token", {
      _user: USER,
      _cost: HINT_COST,
      _max: MAX_HINT_TOKENS,
    });
  });

  it("explains a refusal and hands back the account's numbers", async () => {
    admin.current = fakeAdmin(tables(1, { gems_spent: 90, gems_granted: 5, hint_tokens: 5 }));
    admin.current.rpc.mockResolvedValue({
      data: [
        { ok: false, reason: "pouch-full", balance: 30, spent: 90, granted: 5, hint_tokens: 5 },
      ],
      error: null,
    });
    const result = (await call("buyHintToken", { today: SYNCED })) as {
      ok: boolean;
      message: string;
      snapshot: { spent: number; hintTokens: number };
    };
    expect(result).toMatchObject({ ok: false, message: "Your hint pouch is full." });
    expect(result.snapshot).toMatchObject({ spent: 90, hintTokens: 5 });
  });

  it("is limited before it reaches the database", async () => {
    enforce.mockResolvedValue({
      ok: false,
      scope: "user",
      retryAfterSeconds: 30,
      message: "Easy on the purchases. Try again in less than a minute.",
    });
    expect(await call("buyHintToken", {})).toMatchObject({ limited: true });
    expect(enforce).toHaveBeenCalledWith("shop");
    expect(admin.current!.rpc).not.toHaveBeenCalled();
  });
});

describe("unlockCosmetic", () => {
  it("charges the catalogue price, never one from the request", async () => {
    admin.current!.rpc.mockResolvedValue({
      data: [{ ok: true, reason: null, balance: 20, spent: 80, granted: 0 }],
      error: null,
    });
    await call("unlockCosmetic", { today: SYNCED, id: "headphones", cost: 1 });
    expect(admin.current!.rpc).toHaveBeenCalledWith("unlock_cosmetic", {
      _user: USER,
      _item: "headphones",
      _cost: cosmeticById("headphones")!.cost,
    });
  });

  it("refuses something that isn't in the catalogue, and something already free", async () => {
    for (const id of ["not-a-thing", "hat", "none"]) {
      const result = await call("unlockCosmetic", { id });
      expect(result, id).toMatchObject({ ok: false });
    }
    expect(admin.current!.rpc).not.toHaveBeenCalled();
  });

  it("says when it is already owned", async () => {
    admin.current!.rpc.mockResolvedValue({
      data: [{ ok: false, reason: "owned", balance: 100, spent: 80, granted: 0 }],
      error: null,
    });
    expect(await call("unlockCosmetic", { id: "bow" })).toMatchObject({
      ok: false,
      message: "You already have that.",
    });
  });
});

describe("spendHintToken and getRewards", () => {
  it("uses one token for the caller only", async () => {
    admin.current!.rpc.mockResolvedValue({ data: [{ ok: true, hint_tokens: 2 }], error: null });
    expect(await call("spendHintToken")).toEqual({ ok: true, hintTokens: 2 });
    expect(admin.current!.rpc).toHaveBeenCalledWith("use_hint_token", { _user: USER });
  });

  it("reports a failure as 'no token used' rather than pretending", async () => {
    admin.current!.rpc.mockResolvedValue({ data: null, error: { message: "down" } });
    expect(await call("spendHintToken")).toEqual({ ok: false, hintTokens: 0 });
  });

  it("returns the account's rewards for the day asked about", async () => {
    admin.current = fakeAdmin({
      ...tables(1, { gems_spent: 60, gems_granted: 15, hint_tokens: 3 }),
      user_cosmetics: { rows: [{ item: "bow" }] },
      reward_chests: {
        rows: [{ opened_on: TODAY, source: "review", kind: "gems", amount: 10, converted: false }],
        count: 2,
      },
    });
    expect(await call("getRewards", { today: SYNCED })).toEqual({
      spent: 60,
      granted: 15,
      hintTokens: 3,
      cosmetics: ["bow"],
      chests: { day: SYNCED, opened: 2 },
      history: [{ day: TODAY, source: "review", kind: "gems", amount: 10, converted: false }],
    });
  });
});
