import { beforeEach, describe, expect, it, vi } from "vitest";
import { FREEZE_COST } from "./streak";

vi.mock("@tanstack/react-start", async () => (await import("@/test/server-fn")).startMock);
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

const enforce = vi.hoisted(() => vi.fn());
vi.mock("./rate-limit.server", () => ({ limiter: () => ({ enforce }) }));
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc } }));

const USER = "11111111-1111-1111-1111-111111111111";
const buy = async () => {
  const { buyStreakFreeze } = await import("./wallet.functions");
  return (buyStreakFreeze as unknown as (a: unknown) => Promise<unknown>)({
    context: { userId: USER },
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  enforce.mockResolvedValue({ ok: true });
});

describe("buyStreakFreeze", () => {
  it("spends the server-held price from the caller's own account", async () => {
    rpc.mockResolvedValue({ data: [{ ok: true, balance: 40, spent: 60 }], error: null });
    expect(await buy()).toEqual({ ok: true, balance: 40, spent: 60 });
    expect(rpc).toHaveBeenCalledWith("spend_gems", { _user: USER, _cost: FREEZE_COST });
  });

  it("says so, with the account's real numbers, when there aren't enough gems", async () => {
    rpc.mockResolvedValue({ data: [{ ok: false, balance: 20, spent: 100 }], error: null });
    expect(await buy()).toEqual({
      ok: false,
      reason: "not-enough-gems",
      message: "You don't have enough gems for that yet.",
      balance: 20,
      spent: 100,
    });
  });

  it("is limited before it reaches the wallet", async () => {
    enforce.mockResolvedValue({
      ok: false,
      scope: "user",
      retryAfterSeconds: 300,
      message: "That's a lot of purchases. Try again in about 5 minutes.",
    });
    expect(await buy()).toMatchObject({ ok: false, limited: true, retryAfterSeconds: 300 });
    expect(enforce).toHaveBeenCalledWith("buyFreeze");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not take gems when the wallet can't be reached", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "connection refused" } });
    const result = await buy();
    expect(result).toMatchObject({ ok: false, reason: "error" });
    expect(JSON.stringify(result)).toMatch(/gems were not spent/i);
  });

  it("takes no input, so the browser can't name the price or the account", async () => {
    rpc.mockResolvedValue({ data: [{ ok: true, balance: 0, spent: 60 }], error: null });
    const { buyStreakFreeze } = await import("./wallet.functions");
    await (buyStreakFreeze as unknown as (a: unknown) => Promise<unknown>)({
      data: { cost: 1, userId: "someone-else" },
      context: { userId: USER },
    });
    expect(rpc).toHaveBeenCalledWith("spend_gems", { _user: USER, _cost: FREEZE_COST });
  });
});
