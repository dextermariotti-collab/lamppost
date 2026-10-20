import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAdmin, filteredTo } from "@/test/admin";
import { utcDay } from "@/lib/days";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal-config";

/**
 * The server functions behind the social safety hardening migration: the browser can no longer
 * write names, handles or friend requests or run people search, so these are the checks that
 * now stand in front of those writes. Run without a database, with the service-role client and
 * the limiter replaced (the database side is in social-safety-hardening.test.ts).
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

const ME = "11111111-1111-1111-1111-111111111111";
const THEM = "22222222-2222-2222-2222-222222222222";
const STREAK = "33333333-3333-3333-3333-333333333333";
const TODAY = utcDay(new Date());
const CONSENTED = {
  terms_version: TERMS_VERSION,
  privacy_version: PRIVACY_VERSION,
  age_band: "13-17",
};

type Fn = (i: unknown) => Promise<unknown>;
const MODULES = {
  friends: () => import("@/lib/friends.functions"),
  profile: () => import("@/lib/profile.functions"),
  "account-data": () => import("@/lib/account-data.functions"),
};
const call = async (
  module: keyof typeof MODULES,
  name: string,
  data: unknown,
  supabase: unknown = {},
) => {
  const mod = (await MODULES[module]()) as unknown as Record<string, Fn>;
  return mod[name]!({ data, context: { userId: ME, supabase, claims: null } });
};
const withAdmin = <T extends { client: unknown }>(fake: T): T => {
  admin.current = fake.client;
  return fake;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  enforce.mockResolvedValue({ ok: true });
  withAdmin(fakeAdmin({ profiles: { single: CONSENTED } }));
});

describe("consent, checked on the server", () => {
  it("holds back someone who hasn't accepted the current terms", async () => {
    withAdmin(fakeAdmin({ profiles: { single: { ...CONSENTED, terms_version: "old" } } }));
    await expect(call("friends", "searchPeople", { query: "reader" })).rejects.toThrow(
      /Finish signing up/,
    );
    expect(enforce).not.toHaveBeenCalled();
  });

  it("fails closed when it can't be read, and enforces nothing on a database without the columns", async () => {
    const broken = withAdmin(fakeAdmin({ profiles: { error: { message: "boom" } } }));
    await expect(call("friends", "searchPeople", { query: "reader" })).rejects.toThrow(/Try again/);
    expect(broken.rpc).not.toHaveBeenCalled();

    const unmigrated = fakeAdmin({
      profiles: { error: { code: "42703", message: "column does not exist" } as never },
    });
    unmigrated.rpc.mockResolvedValue({ data: [], error: null });
    withAdmin(unmigrated);
    expect(await call("friends", "searchPeople", { query: "reader" })).toEqual([]);
    expect(unmigrated.rpc).toHaveBeenCalled();
  });

  it("never holds back declining a request", async () => {
    withAdmin(fakeAdmin({ profiles: { single: null } }));
    const user = fakeAdmin();
    await expect(
      call("friends", "respondToRequest", { friendshipId: STREAK, accept: false }, user.client),
    ).resolves.toEqual({ ok: true });
    await expect(
      call("friends", "respondToRequest", { friendshipId: STREAK, accept: true }, user.client),
    ).rejects.toThrow(/Finish signing up/);
  });
});

describe("people search", () => {
  it("runs on the server for the caller, by handle, under its own limit", async () => {
    const fake = withAdmin(fakeAdmin({ profiles: { single: CONSENTED } }));
    fake.rpc.mockResolvedValue({
      data: [
        {
          id: THEM,
          display_name: null,
          handle: "reader-abc12345",
          companion_preset: "fox",
          companion_palette: "amber",
          companion_accessory: "none",
          companion_expression: "happy",
        },
      ],
      error: null,
    });
    const people = (await call("friends", "searchPeople", { query: " @reader " })) as unknown[];
    expect(enforce).toHaveBeenCalledWith("profileSearch");
    expect(fake.rpc).toHaveBeenCalledWith("search_profiles", { _viewer: ME, _query: "reader" });
    expect(people).toEqual([
      expect.objectContaining({
        id: THEM,
        handle: "reader-abc12345",
        currentStreak: null,
        sharesProgress: false,
      }),
    ]);
  });

  it("needs three characters, and stops at the limit", async () => {
    const fake = withAdmin(fakeAdmin({ profiles: { single: CONSENTED } }));
    expect(await call("friends", "searchPeople", { query: "re" })).toEqual([]);
    enforce.mockResolvedValue({ ok: false, message: "Slow down." });
    await expect(call("friends", "searchPeople", { query: "reader" })).rejects.toThrow(
      "Slow down.",
    );
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("answers malformed input plainly", async () => {
    await expect(call("friends", "searchPeople", { query: 42 })).rejects.toThrow(
      /didn't look right/,
    );
    await expect(call("friends", "searchPeople", { query: "x".repeat(500) })).rejects.toThrow(
      /didn't look right/,
    );
  });

  it("gives an invite link a name and avatar, never a streak, and only after consent", async () => {
    const user = fakeAdmin();
    user.rpc.mockResolvedValue({
      data: [
        {
          id: THEM,
          display_name: null,
          handle: "reader-abc12345",
          companion_preset: "fox",
          companion_palette: "amber",
          companion_accessory: "none",
          companion_expression: "happy",
          current_streak: 40,
        },
      ],
      error: null,
    });
    const person = (await call("friends", "resolveInvite", { code: "abc" }, user.client)) as {
      currentStreak: number | null;
    };
    expect(person.currentStreak).toBeNull();
    withAdmin(fakeAdmin({ profiles: { single: null } }));
    await expect(call("friends", "resolveInvite", { code: "abc" }, user.client)).rejects.toThrow(
      /Finish signing up/,
    );
  });
});

/** A service-role client whose friendship lookups answer as given. */
const friendshipsAdmin = (opts: {
  link?: unknown;
  pending?: number;
  insertError?: { code: string; message: string } | null;
}) => {
  const fake = fakeAdmin({ profiles: { single: CONSENTED } });
  const inserted: unknown[] = [];
  const base = fake.client.from;
  const from = (table: string) => {
    if (table !== "friendships") return base(table);
    const chain: Record<string, unknown> = {};
    for (const m of ["select", "eq", "or"]) chain[m] = () => chain;
    chain["maybeSingle"] = async () => ({ data: opts.link ?? null, error: null });
    chain["then"] = (resolve: (v: unknown) => unknown) =>
      resolve({ count: opts.pending ?? 0, error: null });
    chain["insert"] = async (row: unknown) => {
      inserted.push(row);
      return { error: opts.insertError ?? null };
    };
    return chain;
  };
  admin.current = { ...fake.client, from };
  return { inserted };
};

describe("friend requests", () => {
  it("are written by the server for the caller, under the friend-request limit", async () => {
    const { inserted } = friendshipsAdmin({});
    expect(await call("friends", "sendFriendRequest", { userId: THEM })).toEqual({ ok: true });
    expect(enforce).toHaveBeenCalledWith("friendRequest");
    expect(inserted).toEqual([{ requester_id: ME, addressee_id: THEM, status: "pending" }]);
  });

  it("refuse yourself, a bad id, an existing link and a full outbox before writing anything", async () => {
    let state = friendshipsAdmin({});
    await expect(call("friends", "sendFriendRequest", { userId: ME })).rejects.toThrow(/yourself/);
    await expect(call("friends", "sendFriendRequest", { userId: "not-an-id" })).rejects.toThrow(
      /didn't look right/,
    );
    state = friendshipsAdmin({ link: { requester_id: ME, status: "pending" } });
    await expect(call("friends", "sendFriendRequest", { userId: THEM })).rejects.toThrow(
      /already asked/,
    );
    state = friendshipsAdmin({ link: { requester_id: THEM, status: "accepted" } });
    await expect(call("friends", "sendFriendRequest", { userId: THEM })).rejects.toThrow(
      /already friends/,
    );
    state = friendshipsAdmin({ pending: 20 });
    await expect(call("friends", "sendFriendRequest", { userId: THEM })).rejects.toThrow(
      /20 requests waiting/,
    );
    expect(state.inserted).toEqual([]);
  });

  it("stop at the limit", async () => {
    const { inserted } = friendshipsAdmin({});
    enforce.mockResolvedValue({ ok: false, message: "Slow down." });
    await expect(call("friends", "sendFriendRequest", { userId: THEM })).rejects.toThrow(
      "Slow down.",
    );
    expect(inserted).toEqual([]);
  });

  it("give a refusal (for example a block) the same vague message, never the database's", async () => {
    friendshipsAdmin({ insertError: { code: "42501", message: "blocked_between secret" } });
    const result = call("friends", "sendFriendRequest", { userId: THEM });
    await expect(result).rejects.toThrow("That request could not be sent.");
    await expect(result).rejects.not.toThrow(/secret/);
  });
});

describe("nudges", () => {
  const user = () => {
    const fake = fakeAdmin({ friendships: { single: { id: "f1" } } });
    return fake;
  };

  it("aren't sent to someone who turned them off, or about another pair's streak", async () => {
    withAdmin(fakeAdmin({ profiles: { single: { ...CONSENTED, notify_nudges_inapp: false } } }));
    const off = user();
    await expect(
      call("friends", "sendNudge", { toUserId: THEM, today: TODAY }, off.client),
    ).rejects.toThrow(/turned nudges off/);
    expect(off.writes).toEqual([]);

    withAdmin(
      fakeAdmin({
        profiles: { single: { ...CONSENTED, notify_nudges_inapp: true } },
        shared_streaks: { single: { friendship_id: "someone-else" } },
      }),
    );
    const other = user();
    await expect(
      call(
        "friends",
        "sendNudge",
        { toUserId: THEM, sharedStreakId: STREAK, today: TODAY },
        other.client,
      ),
    ).rejects.toThrow(/no longer available/);
    expect(other.writes).toEqual([]);
  });

  it("go to a friend who takes them, for the sender's day", async () => {
    withAdmin(
      fakeAdmin({
        profiles: { single: { ...CONSENTED, notify_nudges_inapp: true } },
        shared_streaks: { single: { friendship_id: "f1" } },
      }),
    );
    const sender = user();
    expect(
      await call(
        "friends",
        "sendNudge",
        { toUserId: THEM, sharedStreakId: STREAK, today: TODAY },
        sender.client,
      ),
    ).toEqual({ ok: true });
    expect(sender.writes).toEqual([
      {
        table: "nudges",
        op: "insert",
        payload: { from_user_id: ME, to_user_id: THEM, shared_streak_id: STREAK, day: TODAY },
      },
    ]);
  });
});

describe("plain errors", () => {
  it("never pass the database's own words to the browser", async () => {
    const user = fakeAdmin({
      friendships: { error: { message: "relation secret_table does not exist" } },
    });
    const result = call("friends", "listFriends", { today: TODAY }, user.client);
    await expect(result).rejects.toThrow(/Try again/);
    await expect(result).rejects.not.toThrow(/secret/);
  });
});

describe("changing your name and handle", () => {
  it("is written by the server, to your own row, after the checks", async () => {
    const fake = withAdmin(fakeAdmin({ profiles: { single: CONSENTED } }));
    const browser = fakeAdmin();
    expect(
      await call(
        "profile",
        "updateMyProfile",
        { displayName: "  Dex ​  M ", handle: "Reader-ABC12345" },
        browser.client,
      ),
    ).toEqual({ ok: true });
    expect(browser.writes).toEqual([]);
    const update = fake.calls.find((c) => c.steps.some(([op]) => op === "update"))!;
    expect(update.steps.find(([op]) => op === "update")).toEqual([
      "update",
      { display_name: "Dex M", handle: "reader-abc12345" },
    ]);
    expect(filteredTo(update, "id", ME)).toBe(true);
  });

  it("keeps a long name to 40 characters", async () => {
    const fake = withAdmin(fakeAdmin({ profiles: { single: CONSENTED } }));
    await call("profile", "updateMyProfile", {
      displayName: "add me on snap: mal_xyz ".repeat(10),
    });
    const update = fake.writes.find((w) => w.op === "update")!;
    expect((update.payload as { display_name: string }).display_name.length).toBeLessThanOrEqual(
      40,
    );
  });

  it("refuses a handle in the wrong shape, one passing for the app, and words the filter catches", async () => {
    const fake = withAdmin(fakeAdmin({ profiles: { single: CONSENTED } }));
    for (const [input, message] of [
      [{ handle: "Lamppost Team ✔" }, /Handles use/],
      [{ handle: "ab" }, /Handles use/],
      [{ handle: "lamppost_team" }, /can't be used/],
      [{ handle: "nsfw_pics" }, /can't be used/],
      [{ displayName: "Lamp Post Team" }, /can't be used/],
      [{ displayName: "nsfw" }, /can't be used/],
      [{ displayName: 5 }, /Check it/],
    ] as const) {
      await expect(
        call("profile", "updateMyProfile", input),
        JSON.stringify(input),
      ).rejects.toThrow(message);
    }
    expect(fake.writes).toEqual([]);
  });

  it("waits for consent, but settings don't", async () => {
    const fake = withAdmin(fakeAdmin({ profiles: { single: { ...CONSENTED, age_band: null } } }));
    await expect(call("profile", "updateMyProfile", { displayName: "Dex" })).rejects.toThrow(
      /Finish signing up/,
    );
    expect(fake.writes).toEqual([]);
    expect(await call("profile", "updateMyProfile", { dailyGoal: 4 })).toEqual({ ok: true });
    expect(fake.writes.map((w) => w.payload)).toEqual([{ daily_goal: 4 }]);
  });

  it("says a taken handle is taken, and anything else plainly", async () => {
    withAdmin(fakeAdmin({ profiles: { single: CONSENTED, error: null } }));
    const taken = fakeAdmin({ profiles: { single: CONSENTED } });
    const base = taken.client.from;
    admin.current = {
      ...taken.client,
      from: (table: string) => {
        const chain = base(table) as Record<string, unknown>;
        chain["update"] = () => ({
          eq: async () => ({ error: { code: "23505", message: "dup key secret" } }),
        });
        return chain;
      },
    };
    await expect(call("profile", "updateMyProfile", { handle: "reader-x1" })).rejects.toThrow(
      /already taken/,
    );
    admin.current = {
      ...taken.client,
      from: (table: string) => {
        const chain = base(table) as Record<string, unknown>;
        chain["update"] = () => ({
          eq: async () => ({ error: { code: "XX000", message: "internal secret" } }),
        });
        return chain;
      },
    };
    const other = call("profile", "updateMyProfile", { handle: "reader-x1" });
    await expect(other).rejects.toThrow(/Try again/);
    await expect(other).rejects.not.toThrow(/secret/);
  });
});

describe("syncing progress", () => {
  const syncAt = async (lastSyncedAt: Date, claim: Record<string, unknown> = {}) => {
    const fake = withAdmin(
      fakeAdmin({
        profiles: {
          single: {
            current_streak: 0,
            longest_streak: 0,
            total_xp: 1000,
            gems_earned: 0,
            gems_granted: 0,
            gems_spent: 0,
            hint_tokens: 0,
            last_active_day: null,
            day_key_version: 2,
            progress_synced_at: lastSyncedAt.toISOString(),
            done_lessons: [],
          },
        },
      }),
    );
    fake.rpc.mockResolvedValue({ data: null, error: null });
    await call("profile", "syncProgress", {
      totalXp: 9_999_999,
      history: {},
      today: TODAY,
      dayKeyVersion: 2,
      ...claim,
    });
    return fake.writes.find((w) => w.table === "profiles" && w.op === "update")!.payload as {
      total_xp: number;
      progress_synced_at: string;
    };
  };

  it("allows a minute's growth plus the burst a minute after the last sync, not two days'", async () => {
    const now = Date.now();
    const written = await syncAt(new Date(now - 60_000));
    expect(written.total_xp - 1000).toBeLessThan(4000 * 0.51);
    expect(written.total_xp - 1000).toBeGreaterThan(4000 * 0.49);
    // The burst is used up: the account is credited up to half a day ahead.
    expect(new Date(written.progress_synced_at).getTime()).toBeGreaterThan(now + 0.49 * 86_400_000);
  });

  it("refuses a history no device could have, and caps the freeze days", async () => {
    const huge = Object.fromEntries(Array.from({ length: 4000 }, (_, i) => [`k${i}`, 1]));
    await expect(syncAt(new Date(), { history: huge })).rejects.toThrow();
    await expect(syncAt(new Date(), { freezeLog: ["x".repeat(500)] })).rejects.toThrow();
  });
});

describe("exporting your data", () => {
  it("gives a debate's own side only, and the result once both answered", async () => {
    const row = (overrides: Record<string, unknown>) => ({
      id: "d1",
      challenger_id: ME,
      opponent_id: THEM,
      lesson_id: null,
      topic: "t",
      prompt: "p",
      passage: "p",
      challenger_side: "for",
      opponent_side: "against",
      challenger_answer: "MY ANSWER",
      opponent_answer: null,
      challenger_scores: { a: 1 },
      opponent_scores: null,
      challenger_total: 12,
      opponent_total: null,
      challenger_tip: "my tip",
      opponent_tip: null,
      max_score: 16,
      status: "open",
      created_at: "2026-10-01",
      ...overrides,
    });
    const { debateForExport } = await import("@/lib/account-data.functions");
    const open = debateForExport(row({}), ME);
    expect(open).toMatchObject({ answer: "MY ANSWER", total: 12, side: "for", result: null });
    const graded = debateForExport(
      row({
        opponent_answer: "THEIR ANSWER",
        opponent_total: 9,
        opponent_tip: "their tip",
        status: "graded",
      }),
      ME,
    );
    expect(graded.result).toEqual({ yourTotal: 12, theirTotal: 9, maxScore: 16 });
    expect(JSON.stringify(graded)).not.toMatch(/THEIR ANSWER|their tip/);
    const asOpponent = debateForExport(row({}), THEM);
    expect(JSON.stringify(asOpponent)).not.toMatch(/MY ANSWER|my tip/);
    expect(asOpponent.total).toBeNull();
  });

  it("reads debates with the server for the caller only", async () => {
    const fake = withAdmin(fakeAdmin({ debates: { rows: [] } }));
    const browser = fakeAdmin();
    await call("account-data", "exportMyData", undefined, browser.client);
    expect(browser.calls.find((c) => c.table === "debates")).toBeUndefined();
    const debates = fake.calls.find((c) => c.table === "debates")!;
    expect(debates.steps).toContainEqual(["or", `challenger_id.eq.${ME},opponent_id.eq.${ME}`]);
  });
});

describe("the account a device signs in to", () => {
  it("comes with its recent active days, read for the caller only", async () => {
    const fake = withAdmin(
      fakeAdmin({
        profiles: { single: { ...CONSENTED, id: ME, handle: "reader-abc12345", done_lessons: [] } },
        daily_activity: { rows: [{ day: "2026-10-19" }, { day: "2026-10-18" }, { day: "bad" }] },
      }),
    );
    const profile = (await call("profile", "getMyProfile", undefined)) as { activeDays: string[] };
    expect(profile.activeDays).toEqual(["2026-10-19", "2026-10-18"]);
    const query = fake.calls.find((c) => c.table === "daily_activity")!;
    expect(filteredTo(query, "user_id", ME)).toBe(true);
    expect(query.steps).toContainEqual(["gt", "lessons_completed", 0]);
    expect(query.steps).toContainEqual(["limit", 60]);
  });
});
