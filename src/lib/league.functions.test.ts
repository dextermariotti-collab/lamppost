import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAdmin, filteredTo, type FakeTable } from "@/test/admin";

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
const TODAY = new Date().toISOString().slice(0, 10);

const person = (id: string, weekly_xp: number, league_tier = 0) => ({
  id,
  display_name: id === ME ? "Me" : id,
  handle: id === ME ? "me" : id.slice(0, 5),
  companion_preset: "scout",
  companion_palette: "ember",
  companion_accessory: "none",
  companion_expression: "happy",
  league_tier,
  weekly_xp,
});

type League = (input?: unknown) => Promise<Record<string, unknown>>;
const getLeague = async () => {
  const { getLeague: fn } = await import("./league.functions");
  return (fn as unknown as League)({ data: { today: TODAY }, context: { userId: ME } });
};

/**
 * rpc answers by name: standings depend on the week asked about. Like the database, the first
 * apply_league_result for a week records it (so it reads back) and any later one does nothing;
 * `judgedFirst` is a record another request made in between.
 */
function setup(opts: {
  thisWeek: ReturnType<typeof person>[];
  lastWeek: ReturnType<typeof person>[];
  settled?: Record<string, unknown> | null;
  judgedFirst?: Record<string, unknown>;
}) {
  const results: FakeTable = { single: opts.settled ?? null };
  admin.current = fakeAdmin({ league_results: results });
  admin.current.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
    if (name === "league_standings") {
      const { previousWeekStart } = await import("./weeks");
      return {
        data: args["_week"] === previousWeekStart(TODAY) ? opts.lastWeek : opts.thisWeek,
        error: null,
      };
    }
    if (name === "apply_league_result") {
      results.single ??= opts.judgedFirst ?? null;
      if (results.single) return { data: false, error: null };
      results.single = {
        week_start: args["_week"],
        rank: args["_rank"],
        group_size: args["_group"],
        weekly_xp: args["_xp"],
        tier_before: args["_before"],
        tier_after: args["_after"],
      };
      return { data: true, error: null };
    }
    return { data: true, error: null };
  });
}
const applied = () =>
  admin
    .current!.rpc.mock.calls.filter(([name]) => name === "apply_league_result")
    .map(([, a]) => a);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  enforce.mockResolvedValue({ ok: true });
});

describe("the friends league", () => {
  it("lists you and your friends, best first, ranking only those who earned enough", async () => {
    setup({
      thisWeek: [person("bo", 300), person(ME, 120), person("cy", 0), person("di", 30)],
      lastWeek: [],
    });
    const view = (await getLeague()) as unknown as {
      members: { id: string; rank: number | null; isMe: boolean }[];
      taking: number;
      minXp: number;
    };
    expect(view.members.map((m) => [m.id, m.rank])).toEqual([
      ["bo", 1],
      [ME, 2],
      ["di", null],
      ["cy", null],
    ]);
    expect(view.members.find((m) => m.isMe)!.id).toBe(ME);
    expect(view.taking).toBe(2);
    expect(view.minXp).toBe(50);
  });

  it("asks only for the caller's own standings", async () => {
    setup({ thisWeek: [person(ME, 100)], lastWeek: [] });
    await getLeague();
    for (const [name, args] of admin.current!.rpc.mock.calls) {
      if (name === "league_standings") expect(args._user).toBe(ME);
    }
    const results = admin.current!.calls.find((c) => c.table === "league_results")!;
    expect(filteredTo(results, "user_id", ME)).toBe(true);
  });

  it("judges last week once, promoting the top third, and records why", async () => {
    setup({
      thisWeek: [person(ME, 10, 1)],
      lastWeek: [person(ME, 400, 1), person("bo", 200), person("cy", 100)],
    });
    const view = (await getLeague()) as unknown as {
      lastWeek: {
        change: string;
        rank: number;
        taking: number;
        tierBefore: number;
        tierAfter: number;
      };
    };
    expect(applied()).toEqual([
      {
        _user: ME,
        _week: expect.any(String),
        _rank: 1,
        _group: 3,
        _xp: 400,
        _before: 1,
        _after: 2,
      },
    ]);
    expect(view.lastWeek).toMatchObject({
      change: "promoted",
      rank: 1,
      taking: 3,
      tierBefore: 1,
      tierAfter: 2,
    });
  });

  it("demotes the bottom third", async () => {
    setup({
      thisWeek: [person(ME, 0, 2)],
      lastWeek: [person(ME, 60, 2), person("bo", 400), person("cy", 200)],
    });
    await getLeague();
    expect(applied()[0]).toMatchObject({ _rank: 3, _before: 2, _after: 1 });
  });

  it("leaves a learner who had a quiet week exactly where they were", async () => {
    setup({
      thisWeek: [person(ME, 0, 3)],
      lastWeek: [person(ME, 10, 3), person("bo", 400), person("cy", 200), person("di", 100)],
    });
    const view = (await getLeague()) as unknown as { lastWeek: { change: string; reason: string } };
    expect(applied()[0]).toMatchObject({ _before: 3, _after: 3 });
    expect(view.lastWeek.change).toBe("stayed");
    expect(view.lastWeek.reason).toMatch(/nothing is lost/i);
  });

  it("moves nobody when fewer than three took part", async () => {
    setup({ thisWeek: [person(ME, 0, 1)], lastWeek: [person(ME, 300, 1), person("bo", 200)] });
    await getLeague();
    expect(applied()[0]).toMatchObject({ _before: 1, _after: 1, _group: 2 });
  });

  it("doesn't judge a week twice: an already-settled week is only read back", async () => {
    setup({
      thisWeek: [person(ME, 10, 2)],
      lastWeek: [person(ME, 400, 1), person("bo", 200), person("cy", 100)],
      settled: {
        week_start: "2026-09-21",
        rank: 1,
        group_size: 3,
        weekly_xp: 400,
        tier_before: 1,
        tier_after: 2,
      },
    });
    const view = (await getLeague()) as unknown as {
      lastWeek: { change: string; tierAfter: number };
    };
    expect(applied()).toEqual([]);
    expect(view.lastWeek).toMatchObject({ change: "promoted", tierAfter: 2 });
    // It didn't even ask for last week's standings.
    const weeks = admin.current!.rpc.mock.calls.filter(([n]) => n === "league_standings");
    expect(weeks).toHaveLength(1);
  });

  describe("a tie", () => {
    type LastWeek = { lastWeek: { change: string; tierAfter: number; reason: string } };
    const level = (n: number) =>
      [person(ME, 100, 1), ...Array.from({ length: n - 1 }, (_, i) => person(`p${i}`, 100))] as [
        ReturnType<typeof person>,
        ...ReturnType<typeof person>[],
      ];

    it("moves nobody when everyone finished level, and says so", async () => {
      setup({ thisWeek: [person(ME, 0, 1)], lastWeek: level(3) });
      const view = (await getLeague()) as unknown as LastWeek;
      expect(applied()[0]).toMatchObject({ _rank: 1, _group: 3, _before: 1, _after: 1 });
      expect(view.lastWeek).toMatchObject({ change: "stayed", tierAfter: 1 });
      expect(view.lastWeek.reason).toMatch(/everyone finished level/i);
    });

    it("tells a big level group the same, from the tie it judged", async () => {
      setup({ thisWeek: [person(ME, 0, 1)], lastWeek: level(6) });
      const view = (await getLeague()) as unknown as LastWeek;
      expect(applied()[0]).toMatchObject({ _rank: 1, _group: 6, _after: 1 });
      expect(view.lastWeek.reason).toMatch(/everyone finished level/i);
    });

    it("keeps a tie from the top third into the bottom where it was", async () => {
      setup({
        thisWeek: [person(ME, 0, 1)],
        lastWeek: [...level(5), person("low", 60)],
      });
      const view = (await getLeague()) as unknown as LastWeek;
      expect(applied()[0]).toMatchObject({ _rank: 1, _group: 6, _after: 1 });
      expect(view.lastWeek.change).toBe("stayed");
      expect(view.lastWeek.reason).toMatch(/level with friends from the top third/i);
    });

    it("still explains a level week read back later, without the top-third line", async () => {
      setup({
        thisWeek: [person(ME, 0, 1)],
        lastWeek: [],
        settled: {
          week_start: "2026-09-21",
          rank: 1,
          group_size: 3,
          weekly_xp: 100,
          tier_before: 1,
          tier_after: 1,
        },
      });
      const view = (await getLeague()) as unknown as LastWeek;
      expect(applied()).toEqual([]);
      expect(view.lastWeek.change).toBe("stayed");
      expect(view.lastWeek.reason).toMatch(/everyone finished level/i);
      expect(view.lastWeek.reason).not.toMatch(/you finished in the top third/i);
    });

    it("reads a big level week back as true, if less exact", async () => {
      setup({
        thisWeek: [person(ME, 0, 1)],
        lastWeek: [],
        settled: {
          week_start: "2026-09-21",
          rank: 2,
          group_size: 6,
          weekly_xp: 100,
          tier_before: 1,
          tier_after: 1,
        },
      });
      const view = (await getLeague()) as unknown as LastWeek;
      expect(view.lastWeek.reason).toMatch(/level with friends from the top third/i);
    });

    it("explains a week another request judged first by its record, not this tie", async () => {
      setup({
        thisWeek: [person(ME, 0, 1)],
        lastWeek: level(6),
        judgedFirst: {
          week_start: "2026-09-21",
          rank: 1,
          group_size: 6,
          weekly_xp: 100,
          tier_before: 1,
          tier_after: 2,
        },
      });
      const view = (await getLeague()) as unknown as LastWeek;
      expect(view.lastWeek).toMatchObject({ change: "promoted", tierAfter: 2 });
      expect(view.lastWeek.reason).toBe("You finished in the top third.");
    });

    it("still promotes the top third when the tie stays inside it", async () => {
      setup({
        thisWeek: [person(ME, 0, 1)],
        lastWeek: [...level(2), person("c", 80), person("d", 70), person("e", 60), person("f", 55)],
      });
      const view = (await getLeague()) as unknown as LastWeek;
      expect(applied()[0]).toMatchObject({ _rank: 1, _group: 6, _after: 2 });
      expect(view.lastWeek.change).toBe("promoted");
    });
  });

  it("shows nothing but tier, weekly XP, handle and companion about a friend", async () => {
    setup({ thisWeek: [person(ME, 100), person("bo", 200)], lastWeek: [] });
    const view = (await getLeague()) as unknown as { members: Record<string, unknown>[] };
    expect(Object.keys(view.members[0]!).sort()).toEqual(
      ["companion", "displayName", "handle", "id", "isMe", "rank", "tier", "weeklyXp"].sort(),
    );
  });

  it("is limited before it touches the database", async () => {
    enforce.mockResolvedValue({
      ok: false,
      scope: "user",
      retryAfterSeconds: 60,
      message: "A lot of league views. Try again in about a minute.",
    });
    setup({ thisWeek: [], lastWeek: [] });
    expect(await getLeague()).toMatchObject({ ok: false, limited: true });
    expect(enforce).toHaveBeenCalledWith("leagueView");
    expect(admin.current!.rpc).not.toHaveBeenCalled();
  });

  it("reports a plain failure, never a stack trace, if the database errors", async () => {
    setup({ thisWeek: [], lastWeek: [] });
    admin.current!.rpc.mockResolvedValue({
      data: null,
      error: { message: "connection refused to 10.0.0.5" },
    });
    const result = await getLeague();
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toMatch(/10\.0\.0\.5|connection refused/);
  });
});
