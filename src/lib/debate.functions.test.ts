import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAdmin, filteredTo } from "@/test/admin";

/**
 * Debates after the social safety hardening migration: the browser role can no longer read
 * answers, scores or tips, so listDebates, getDebate and submitDebateResponse read with the
 * service role. These check that every read is held to the caller's own debates and that the
 * other side stays hidden until both have answered. Run without a database or a model.
 */

vi.mock("@tanstack/react-start", async () => (await import("@/test/server-fn")).startMock);
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
const enforce = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rate-limit.server", () => ({ limiter: () => ({ enforce }) }));
const admin = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return admin.current;
  },
}));
const streamText = vi.hoisted(() => vi.fn());
vi.mock("ai", () => ({ streamText }));
vi.mock("@/lib/ai-gateway.server", () => ({ createAiProvider: () => (model: string) => model }));

const ME = "11111111-1111-1111-1111-111111111111";
const THEM = "22222222-2222-2222-2222-222222222222";
const STRANGER = "44444444-4444-4444-4444-444444444444";
const DEBATE = "33333333-3333-3333-3333-333333333333";

const GRADE = {
  scores: {
    claim: { score: 3, feedback: "The claim is clear." },
    evidence: { score: 3, feedback: "The support is relevant." },
    reasoning: { score: 3, feedback: "The links hold up." },
    counterargument: { score: 3, feedback: "The cost objection is answered." },
  },
  total: 12,
  tip: "MY TIP",
};

const row = (overrides: Record<string, unknown> = {}) => ({
  id: DEBATE,
  challenger_id: ME,
  opponent_id: THEM,
  topic: "Later school start",
  prompt: "Argue your side.",
  passage: "Should school start later?",
  challenger_side: "for",
  opponent_side: "against",
  challenger_answer: "MY ANSWER",
  opponent_answer: null,
  challenger_scores: GRADE.scores,
  opponent_scores: null,
  challenger_total: GRADE.total,
  opponent_total: null,
  challenger_tip: GRADE.tip,
  opponent_tip: null,
  max_score: 16,
  status: "open",
  challenger_seen_result: false,
  opponent_seen_result: false,
  created_at: "2026-10-19T12:00:00Z",
  ...overrides,
});

/** The other side, answered and graded. */
const theirs = {
  opponent_answer: "THEIR ANSWER",
  opponent_scores: GRADE.scores,
  opponent_total: 10,
  opponent_tip: "THEIR TIP",
};

const PROFILES = { rows: [{ id: THEM, handle: "reader-them1234", display_name: null }] };

type Fn = (i: unknown) => Promise<unknown>;
const call = async (name: string, data: unknown, supabase: unknown) => {
  const mod = (await import("@/lib/debate.functions")) as unknown as Record<string, Fn>;
  return mod[name]!({ data, context: { userId: ME, supabase, claims: null } });
};
const withAdmin = <T extends { client: unknown }>(fake: T): T => {
  admin.current = fake.client;
  return fake;
};
const debatesQuery = (fake: ReturnType<typeof fakeAdmin>) =>
  fake.calls.find((c) => c.table === "debates")!;
const PARTICIPANT = ["or", `challenger_id.eq.${ME},opponent_id.eq.${ME}`];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  enforce.mockResolvedValue({ ok: true });
  streamText.mockReturnValue({ text: Promise.resolve(JSON.stringify(GRADE)) });
  process.env["AI_API_KEY"] = "test-key";
});

afterEach(() => {
  delete process.env["AI_API_KEY"];
});

describe("listDebates", () => {
  it("reads with the server, only the caller's own debates", async () => {
    const fake = withAdmin(fakeAdmin({ debates: { rows: [row()] }, profiles: PROFILES }));
    const browser = fakeAdmin();
    const list = (await call("listDebates", undefined, browser.client)) as unknown[];
    expect(browser.calls).toEqual([]);
    expect(debatesQuery(fake).steps).toContainEqual(PARTICIPANT);
    expect(debatesQuery(fake).steps).toContainEqual(["limit", 30]);
    expect(list).toHaveLength(1);
  });

  it("drops any row the caller isn't in, whatever the query returned", async () => {
    withAdmin(
      fakeAdmin({
        debates: { rows: [row({ challenger_id: STRANGER }), row({ id: "other" })] },
        profiles: PROFILES,
      }),
    );
    const list = (await call("listDebates", undefined, fakeAdmin().client)) as { id: string }[];
    expect(list.map((d) => d.id)).toEqual(["other"]);
  });

  it("hides the other side's answer and grade until both have answered", async () => {
    withAdmin(
      fakeAdmin({
        debates: {
          rows: [
            row({ ...theirs, opponent_answer: null }),
            // Marked graded, but one answer is missing: still nothing of theirs is shown.
            row({ ...theirs, opponent_answer: null, status: "graded" }),
          ],
        },
        profiles: PROFILES,
      }),
    );
    const list = await call("listDebates", undefined, fakeAdmin().client);
    expect(JSON.stringify(list)).not.toMatch(/THEIR ANSWER|THEIR TIP/);
    for (const debate of list as Record<string, unknown>[]) {
      expect(debate).toMatchObject({ theirAnswer: null, theirGrade: null, winner: null });
      expect(debate["myAnswer"]).toBe("MY ANSWER");
    }
  });
});

describe("getDebate", () => {
  it("reads one debate with the server, filtered to the caller", async () => {
    const fake = withAdmin(fakeAdmin({ debates: { single: row() }, profiles: PROFILES }));
    const browser = fakeAdmin();
    const debate = await call("getDebate", { id: DEBATE }, browser.client);
    expect(browser.calls).toEqual([]);
    expect(filteredTo(debatesQuery(fake), "id", DEBATE)).toBe(true);
    expect(debatesQuery(fake).steps).toContainEqual(PARTICIPANT);
    expect(debate).toMatchObject({
      id: DEBATE,
      myAnswer: "MY ANSWER",
      theirAnswer: null,
      theirGrade: null,
      myTurn: false,
      status: "open",
      opponent: { id: THEM, handle: "reader-them1234" },
    });
  });

  it("returns nothing for a debate the caller isn't in", async () => {
    withAdmin(
      fakeAdmin({
        debates: { single: row({ challenger_id: STRANGER, ...theirs }) },
        profiles: PROFILES,
      }),
    );
    expect(await call("getDebate", { id: DEBATE }, fakeAdmin().client)).toBeNull();
  });

  it("shows the opponent only their own side while the debate is open", async () => {
    // The caller is the opponent here, and hasn't answered yet.
    withAdmin(
      fakeAdmin({
        debates: { single: row({ challenger_id: THEM, opponent_id: ME }) },
        profiles: PROFILES,
      }),
    );
    const debate = await call("getDebate", { id: DEBATE }, fakeAdmin().client);
    expect(JSON.stringify(debate)).not.toMatch(/MY ANSWER|MY TIP/);
    expect(debate).toMatchObject({ myAnswer: null, myGrade: null, myTurn: true, theirGrade: null });
  });

  it("shows both sides and the result once both have answered", async () => {
    withAdmin(
      fakeAdmin({
        debates: { single: row({ ...theirs, status: "graded" }) },
        profiles: PROFILES,
      }),
    );
    const debate = await call("getDebate", { id: DEBATE }, fakeAdmin().client);
    expect(debate).toMatchObject({
      status: "graded",
      theirAnswer: "THEIR ANSWER",
      theirGrade: { total: 10, tip: "THEIR TIP" },
      winner: "you",
      unseenResult: true,
    });
  });
});

describe("submitDebateResponse", () => {
  const ANSWER =
    "Schools should start later because teenagers sleep better and learn more when rested. " +
    "Some say buses would cost more, but districts that moved their schedules found ways to " +
    "share routes and keep costs about the same.";

  it("reads the debate with the server for the caller, and writes only their own side", async () => {
    const fake = withAdmin(fakeAdmin({ debates: { single: row({ challenger_answer: null }) } }));
    const browser = fakeAdmin();
    const result = await call(
      "submitDebateResponse",
      { id: DEBATE, answer: ANSWER },
      browser.client,
    );
    expect(browser.calls).toEqual([]);
    expect(debatesQuery(fake).steps).toContainEqual(PARTICIPANT);
    expect(result).toEqual({ ok: true, graded: false, total: 12, max: 16 });
    const [write] = fake.writes;
    expect(write).toMatchObject({ table: "debates", op: "update" });
    expect(Object.keys(write!.payload as object).sort()).toEqual([
      "challenger_answer",
      "challenger_scores",
      "challenger_tip",
      "challenger_total",
    ]);
  });

  it("closes the debate when the other side has already answered, without returning theirs", async () => {
    const fake = withAdmin(
      fakeAdmin({ debates: { single: row({ challenger_answer: null, ...theirs }) } }),
    );
    const result = await call("submitDebateResponse", { id: DEBATE, answer: ANSWER }, {});
    expect(result).toEqual({ ok: true, graded: true, total: 12, max: 16 });
    expect(JSON.stringify(result)).not.toMatch(/THEIR/);
    expect(fake.writes[0]!.payload).toMatchObject({ status: "graded" });
  });

  it("refuses a debate the caller isn't in before any grading", async () => {
    const fake = withAdmin(
      fakeAdmin({ debates: { single: row({ challenger_id: STRANGER, challenger_answer: null }) } }),
    );
    const result = await call("submitDebateResponse", { id: DEBATE, answer: ANSWER }, {});
    expect(result).toEqual({ ok: false, reason: "That debate no longer exists." });
    expect(enforce).not.toHaveBeenCalled();
    expect(streamText).not.toHaveBeenCalled();
    expect(fake.writes).toEqual([]);
  });

  it("won't replace an answer already made", async () => {
    const fake = withAdmin(fakeAdmin({ debates: { single: row() } }));
    const result = await call("submitDebateResponse", { id: DEBATE, answer: ANSWER }, {});
    expect(result).toEqual({ ok: false, reason: "You've already made your case." });
    expect(streamText).not.toHaveBeenCalled();
    expect(fake.writes).toEqual([]);
  });
});
