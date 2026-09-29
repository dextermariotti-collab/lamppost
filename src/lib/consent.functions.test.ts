import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAdmin } from "@/test/admin";
import { PRIVACY_VERSION, TERMS_VERSION } from "./legal-config";

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
const record = async (data: unknown) => {
  const { recordConsent } = await import("./consent.functions");
  return (recordConsent as unknown as (i: unknown) => Promise<unknown>)({
    data,
    context: { userId: USER },
  });
};
const valid = {
  termsVersion: TERMS_VERSION,
  privacyVersion: PRIVACY_VERSION,
  ageBand: "18+",
  guardianConfirmed: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  enforce.mockResolvedValue({ ok: true });
  admin.current = fakeAdmin();
  admin.current.rpc.mockResolvedValue({ data: "2026-09-30T10:00:00.000Z", error: null });
});

describe("recording consent", () => {
  it("records the acceptance for the signed-in user, and returns the database's timestamp", async () => {
    expect(await record(valid)).toEqual({ ok: true, acceptedAt: "2026-09-30T10:00:00.000Z" });
    expect(admin.current!.rpc).toHaveBeenCalledWith("record_consent", {
      _user: USER,
      _terms: TERMS_VERSION,
      _privacy: PRIVACY_VERSION,
      _age_band: "18+",
      _guardian: false,
    });
  });

  it("has no way to be handed a time by the browser", async () => {
    await record({ ...valid, acceptedAt: "1999-01-01T00:00:00Z" });
    const args = admin.current!.rpc.mock.calls[0]![1] as Record<string, unknown>;
    expect(Object.keys(args)).not.toContain("_at");
    expect(JSON.stringify(args)).not.toContain("1999");
  });

  it("refuses a version that isn't the current text, and writes nothing", async () => {
    const result = (await record({ ...valid, termsVersion: "2020-01-01" })) as {
      ok: boolean;
      reason: string;
    };
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/changed/i);
    expect(admin.current!.rpc).not.toHaveBeenCalled();
  });

  it("refuses a teen without the guardian's permission", async () => {
    const result = (await record({ ...valid, ageBand: "13-17", guardianConfirmed: false })) as {
      ok: boolean;
    };
    expect(result.ok).toBe(false);
    expect(admin.current!.rpc).not.toHaveBeenCalled();
    expect(await record({ ...valid, ageBand: "13-17", guardianConfirmed: true })).toMatchObject({
      ok: true,
    });
  });

  it("accepts nothing but the two known age bands", async () => {
    await expect(record({ ...valid, ageBand: "12" })).rejects.toThrow();
    await expect(record({ ...valid, ageBand: "under-13" })).rejects.toThrow();
    await expect(record({ ...valid, ageBand: undefined })).rejects.toThrow();
  });

  it("is rate limited, and says so", async () => {
    enforce.mockResolvedValue({ ok: false, message: "Slow down.", retryAfterSeconds: 60 });
    expect(await record(valid)).toMatchObject({ ok: false, limited: true, retryAfterSeconds: 60 });
    expect(admin.current!.rpc).not.toHaveBeenCalled();
  });

  it("fails clearly, not silently, when the database says no", async () => {
    admin.current!.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await record(valid)).toMatchObject({ ok: false });
  });
});
