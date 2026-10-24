import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAdmin, filteredTo, type FakeTable } from "@/test/admin";
import { dayKey, shiftDay } from "./days";

vi.mock("@tanstack/react-start", async () => (await import("@/test/server-fn")).startMock);
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
const admin = vi.hoisted(() => ({ current: null as ReturnType<typeof fakeAdmin> | null }));
vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return admin.current!.client;
  },
}));

const ME = "11111111-1111-1111-1111-111111111111";
const TODAY = dayKey();
const CODES = [
  "first_lesson",
  "streak_7",
  "xp_100",
  "perfect_week",
  "first_friend",
  "shared_streak_7",
];
const catalog = CODES.map((code, i) => ({
  code,
  name: code,
  description: "",
  icon: "star",
  criteria: "",
  sort_order: i,
}));

type Badges = { badges: { code: string; unlockedAt: string | null }[]; justUnlocked: string[] };

async function evaluate(
  account: { total_xp: number; longest_streak: number; current_streak: number; daily_goal: number },
  own: Record<string, FakeTable>,
  data: unknown = { today: TODAY },
) {
  admin.current = fakeAdmin({ profiles: { single: account } });
  const user = fakeAdmin({ achievements: { rows: catalog }, ...own });
  const { listAchievements } = await import("./achievements.functions");
  const call = listAchievements as unknown as (input: unknown) => Promise<Badges>;
  const result = await call({ data, context: { userId: ME, supabase: user.client } });
  return { result, user, server: admin.current };
}

const awarded = (server: ReturnType<typeof fakeAdmin>) =>
  server.writes
    .filter((w) => w.table === "user_achievements" && w.op === "upsert")
    .flatMap((w) => w.payload as { user_id: string; achievement_code: string }[])
    .map((row) => {
      expect(row.user_id).toBe(ME);
      return row.achievement_code;
    });

beforeEach(() => vi.clearAllMocks());

describe("listAchievements", () => {
  it("awards from the numbers the server holds, only what is earned and not yet held", async () => {
    const week = Array.from({ length: 7 }, (_, i) => ({
      day: shiftDay(TODAY, -i),
      lessons_completed: 2,
    }));
    const { result, server } = await evaluate(
      { total_xp: 150, longest_streak: 8, current_streak: 2, daily_goal: 2 },
      {
        daily_activity: { rows: week },
        user_achievements: {
          rows: [{ achievement_code: "first_lesson", unlocked_at: "2026-10-01T00:00:00.000Z" }],
        },
        friendships: { rows: [] },
        shared_streaks: { rows: [{ current_count: 3 }] },
      },
    );
    expect(awarded(server).sort()).toEqual(["perfect_week", "streak_7", "xp_100"]);
    expect(result.justUnlocked.sort()).toEqual(["perfect_week", "streak_7", "xp_100"]);
    const held = result.badges.filter((b) => b.unlockedAt).map((b) => b.code);
    expect(held.sort()).toEqual(["first_lesson", "perfect_week", "streak_7", "xp_100"]);
  });

  it("reads the caller's own profile and badges, never one named in the request", async () => {
    const { server, user } = await evaluate(
      { total_xp: 0, longest_streak: 0, current_streak: 0, daily_goal: 3 },
      { daily_activity: { rows: [] }, user_achievements: { rows: [] } },
      { today: TODAY, userId: "someone-else", totalXp: 99999, codes: ["xp_100"] },
    );
    const profile = server.calls.find((c) => c.table === "profiles")!;
    expect(filteredTo(profile, "id", ME)).toBe(true);
    const badges = user.calls.find((c) => c.table === "user_achievements")!;
    expect(filteredTo(badges, "user_id", ME)).toBe(true);
    expect(awarded(server)).toEqual([]);
  });

  it("writes nothing when everything earned is already held", async () => {
    const { server, result } = await evaluate(
      { total_xp: 120, longest_streak: 1, current_streak: 1, daily_goal: 3 },
      {
        daily_activity: { rows: [{ day: TODAY, lessons_completed: 1 }] },
        user_achievements: {
          rows: [
            { achievement_code: "first_lesson", unlocked_at: "2026-10-01T00:00:00.000Z" },
            { achievement_code: "xp_100", unlocked_at: "2026-10-02T00:00:00.000Z" },
          ],
        },
      },
    );
    expect(server.writes).toEqual([]);
    expect(result.justUnlocked).toEqual([]);
  });

  it("counts a perfect week against the account's goal, every one of the last seven days", async () => {
    const sixDays = Array.from({ length: 6 }, (_, i) => ({
      day: shiftDay(TODAY, -i),
      lessons_completed: 3,
    }));
    const short = await evaluate(
      { total_xp: 0, longest_streak: 0, current_streak: 0, daily_goal: 3 },
      {
        daily_activity: { rows: [...sixDays, { day: shiftDay(TODAY, -6), lessons_completed: 2 }] },
      },
    );
    expect(awarded(short.server)).not.toContain("perfect_week");
    const full = await evaluate(
      { total_xp: 0, longest_streak: 0, current_streak: 0, daily_goal: 3 },
      {
        daily_activity: { rows: [...sixDays, { day: shiftDay(TODAY, -6), lessons_completed: 3 }] },
      },
    );
    expect(awarded(full.server)).toContain("perfect_week");
  });
});
