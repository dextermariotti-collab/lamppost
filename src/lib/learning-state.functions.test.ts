import { beforeEach, describe, expect, it, vi } from "vitest";
import { LESSONS } from "./curriculum";

vi.mock("@tanstack/react-start", async () => (await import("@/test/server-fn")).startMock);
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

type Row = { user_id: string; state: unknown; rev: number };
type Err = { message: string; code?: string } | null;

/**
 * An in-memory `learning_state` table. `between` runs after a read, so a test can play another
 * device writing in the gap; `readError` makes every read fail.
 */
const db = vi.hoisted(() => ({
  rows: new Map<string, Row>(),
  between: null as null | (() => void),
  readError: null as Err,
  filters: [] as [string, unknown][],
  updates: 0,
  limited: false,
  enforced: [] as string[],
}));

vi.mock("./rate-limit.server", () => ({
  limiter: () => ({
    enforce: async (policy: string) => {
      db.enforced.push(policy);
      return db.limited
        ? { ok: false, scope: "user", retryAfterSeconds: 60, message: "Too many syncs." }
        : { ok: true };
    },
  }),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from(table: string) {
      if (table !== "learning_state") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: (column: string, user: string) => {
            db.filters.push([column, user]);
            return {
              maybeSingle: async () => {
                if (db.readError) return { data: null, error: db.readError };
                const row = db.rows.get(user);
                const data = row ? { state: structuredClone(row.state), rev: row.rev } : null;
                const between = db.between;
                db.between = null;
                between?.();
                return { data, error: null };
              },
            };
          },
        }),
        insert: async (row: Row) => {
          if (db.rows.has(row.user_id))
            return { data: null, error: { message: "dup", code: "23505" } };
          db.rows.set(row.user_id, structuredClone(row));
          return { data: null, error: null };
        },
        update: (patch: { state: unknown; rev: number }) => ({
          eq: (_c: string, user: string) => ({
            eq: (_r: string, rev: number) => ({
              select: async () => {
                db.updates += 1;
                const row = db.rows.get(user);
                if (!row || row.rev !== rev) return { data: [], error: null };
                db.rows.set(user, { ...row, ...structuredClone(patch) });
                return { data: [{ rev: patch.rev }], error: null };
              },
            }),
          }),
        }),
      };
    },
  },
}));

import { syncLearningState } from "./learning-state.functions";

const ME = "11111111-1111-1111-1111-111111111111";
const A = LESSONS[0]!.id;
const B = LESSONS[1]!.id;
const sync = (state: unknown) =>
  (syncLearningState as unknown as (i: unknown) => Promise<{ state: Record<string, never> }>)({
    data: { state },
    context: { userId: ME },
  });
const rating = (value: number, lastAt = Date.now() - 1000) => ({
  rating: value,
  answered: 1,
  run: 1,
  lastAt,
  seen: [],
});

beforeEach(() => {
  db.rows.clear();
  db.between = null;
  db.readError = null;
  db.filters = [];
  db.updates = 0;
  db.limited = false;
  db.enforced = [];
});

describe("syncLearningState", () => {
  it("stores a first device's copy and hands it back", async () => {
    const reply = await sync({ ratings: { [A]: rating(1020) } });
    expect(reply.state).toMatchObject({ ratings: { [A]: { rating: 1020 } } });
    expect(db.rows.get(ME)).toMatchObject({
      rev: 1,
      state: { ratings: { [A]: { rating: 1020 } } },
    });
    expect(db.filters).toEqual([["user_id", ME]]);
  });

  it("merges a second device's copy in, so both end up with both", async () => {
    await sync({ ratings: { [A]: rating(1020) } });
    const reply = await sync({ ratings: { [B]: rating(990) } });
    expect(Object.keys(reply.state["ratings"]!).sort()).toEqual([A, B].sort());
    expect(db.rows.get(ME)!.rev).toBe(2);
  });

  it("writes nothing when the device brings nothing new", async () => {
    await sync({ ratings: { [A]: rating(1020) } });
    await sync({ ratings: { [A]: rating(1020, 0) } });
    expect(db.rows.get(ME)!.rev).toBe(1);
    expect(db.updates).toBe(0);
  });

  it("stores only what it believes", async () => {
    const reply = await sync({
      ratings: { "made-up-lesson": rating(1000), [A]: rating(99_999) },
      written: "lots",
    });
    expect(reply.state["ratings"]).toEqual({ [A]: expect.objectContaining({ rating: 1400 }) });
    expect(reply.state["written"]).toEqual([]);
  });

  it("merges again on top of a device that wrote in between, losing neither", async () => {
    await sync({ ratings: { [A]: rating(1020) } });
    db.between = () => {
      const row = db.rows.get(ME)!;
      const state = row.state as { ratings: Record<string, unknown> };
      db.rows.set(ME, {
        ...row,
        rev: row.rev + 1,
        state: { ...state, ratings: { ...state.ratings, [B]: rating(980) } },
      });
    };
    const reply = await sync({ ratings: { [LESSONS[2]!.id]: rating(1010) } });
    expect(Object.keys(reply.state["ratings"]!).sort()).toEqual([A, B, LESSONS[2]!.id].sort());
    expect(db.rows.get(ME)!.rev).toBe(3);
  });

  it("stores nothing, and says so, on a database without the table yet", async () => {
    db.readError = { message: 'relation "public.learning_state" does not exist', code: "42P01" };
    expect((await sync({ ratings: { [A]: rating(1020) } })).state).toBeNull();
  });

  it("fails on any other read error rather than overwriting", async () => {
    db.readError = { message: "timeout" };
    await expect(sync({})).rejects.toThrow("timeout");
    expect(db.rows.size).toBe(0);
  });

  it("counts every sync against the account's limit, and stores nothing once it is reached", async () => {
    await sync({ ratings: { [A]: rating(1020) } });
    expect(db.enforced).toEqual(["learningSync"]);
    db.limited = true;
    await expect(sync({ ratings: { [B]: rating(990) } })).rejects.toThrow("Too many syncs.");
    expect(Object.keys((db.rows.get(ME)!.state as { ratings: object }).ratings)).toEqual([A]);
  });

  it("refuses a request too large to be a real device's", async () => {
    const huge = { written: [{ note: "x".repeat(1_600_000) }] };
    await expect(sync(huge)).rejects.toThrow(/didn't sync/);
  });
});
