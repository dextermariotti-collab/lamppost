import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAdmin } from "@/test/admin";
import type { FriendsSnapshot, PersonCard, getFriendProfile } from "./friends.functions";

vi.mock("@tanstack/react-start", async () => (await import("@/test/server-fn")).startMock);
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
const admin = vi.hoisted(() => ({ current: null as ReturnType<typeof fakeAdmin> | null }));
vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return admin.current!.client;
  },
}));

const ME = "11111111-1111-1111-1111-111111111111";
const SHARER = "22222222-2222-2222-2222-222222222222";
const PRIVATE = "33333333-3333-3333-3333-333333333333";
const TODAY = new Date().toISOString().slice(0, 10);

const profile = (id: string, handle: string, visibility: string, streak: number, xp: number) => ({
  id,
  handle,
  display_name: handle.toUpperCase(),
  current_streak: streak,
  total_xp: xp,
  profile_visibility: visibility,
  companion_preset: "fox",
  companion_palette: "amber",
  companion_accessory: "none",
  companion_expression: "happy",
});

type Fn = (i: unknown) => Promise<unknown>;
type FriendProfile = Awaited<ReturnType<typeof getFriendProfile>>;
const call = async <T>(name: string, data: unknown, supabase: unknown): Promise<T> => {
  const mod = (await import("./friends.functions")) as unknown as Record<string, Fn>;
  return (await mod[name]!({ data, context: { userId: ME, supabase } })) as T;
};

beforeEach(() => {
  vi.clearAllMocks();
  admin.current = fakeAdmin({
    profiles: {
      single: { invite_code: "abc123", profile_visibility: "minimal" },
      rows: [
        profile(SHARER, "sharer", "friends", 5, 100),
        profile(PRIVATE, "private", "minimal", 9, 900),
      ],
    },
    daily_activity: {
      rows: [
        { user_id: SHARER, day: TODAY, lessons_completed: 1 },
        { user_id: PRIVATE, day: TODAY, lessons_completed: 2 },
      ],
    },
  });
});

describe("the friends list", () => {
  const listAsMe = () => {
    const user = fakeAdmin({
      friendships: {
        rows: [
          { id: "f1", requester_id: ME, addressee_id: SHARER, status: "accepted" },
          { id: "f2", requester_id: PRIVATE, addressee_id: ME, status: "accepted" },
        ],
      },
      shared_streaks: { rows: [] },
      nudges: { rows: [] },
    });
    return call<FriendsSnapshot>("listFriends", { today: TODAY }, user.client);
  };

  it("shows streak, XP and today's activity only for a friend who shares", async () => {
    const snapshot = await listAsMe();
    const sharer = snapshot.friends.find((f) => f.handle === "sharer");
    const hidden = snapshot.friends.find((f) => f.handle === "private");
    expect(sharer).toMatchObject({
      sharesProgress: true,
      currentStreak: 5,
      totalXp: 100,
      activeToday: true,
    });
    expect(hidden).toMatchObject({
      sharesProgress: false,
      currentStreak: null,
      activeToday: false,
    });
    expect(hidden).not.toHaveProperty("totalXp");
    expect(JSON.stringify(hidden)).not.toContain("900");
  });

  it("reports what the caller shares, defaulting to nothing", async () => {
    expect((await listAsMe()).myVisibility).toBe("minimal");
  });
});

describe("finding people", () => {
  it("never returns a streak for someone who isn't yet a friend", async () => {
    const user = fakeAdmin();
    user.rpc.mockResolvedValue({
      data: [{ ...profile(SHARER, "sharer", "friends", 5, 100), total_xp: undefined }],
      error: null,
    });
    const [person] = await call<PersonCard[]>("searchPeople", { query: "shar" }, user.client);
    expect(person).toMatchObject({ handle: "sharer", currentStreak: null, sharesProgress: false });
    expect(person).not.toHaveProperty("totalXp");
  });

  it("does the same for an invite link", async () => {
    const user = fakeAdmin();
    user.rpc.mockResolvedValue({
      data: [profile(SHARER, "sharer", "friends", 5, 100)],
      error: null,
    });
    const person = await call<PersonCard>("resolveInvite", { code: "abc" }, user.client);
    expect(person.currentStreak).toBeNull();
    expect(person.sharesProgress).toBe(false);
  });

  it("gives a refused friend request the same vague message as any other failure", async () => {
    const refusing = {
      from: () => ({
        insert: async () => ({
          error: { code: "42501", message: "That request could not be sent." },
        }),
      }),
    };
    await expect(call("sendFriendRequest", { userId: SHARER }, refusing)).rejects.toThrow(
      "That request could not be sent.",
    );
  });
});

describe("a friend's profile page", () => {
  const view = async (visibility: string, status: "accepted" | "pending" | null) => {
    admin.current = fakeAdmin({
      profiles: { single: profile(SHARER, "sharer", visibility, 5, 100) },
    });
    const user = fakeAdmin({
      friendships: { single: status ? { id: "f1", status } : null },
      user_achievements: { rows: [{ achievement_code: "streak_7", unlocked_at: "2026-09-01" }] },
    });
    return call<NonNullable<FriendProfile>>("getFriendProfile", { handle: "sharer" }, user.client);
  };

  it("hides progress, badges and join date unless they share", async () => {
    const hidden = await view("minimal", "accepted");
    expect(hidden.person.sharesProgress).toBe(false);
    expect(hidden.person.currentStreak).toBeNull();
    expect(hidden.badges).toEqual([]);
    expect(hidden.longestStreak).toBeNull();
    expect(hidden.joinedAt).toBeNull();
  });

  it("shows them when they do, and only to an accepted friend", async () => {
    const shown = await view("friends", "accepted");
    expect(shown.person).toMatchObject({ sharesProgress: true, currentStreak: 5, totalXp: 100 });
    expect(shown.badges).toHaveLength(1);
    const pending = await view("friends", "pending");
    expect(pending.person.sharesProgress).toBe(false);
    expect(pending.badges).toEqual([]);
  });

  it("is not available for someone the caller has no link to", async () => {
    expect(await view("friends", null)).toBeNull();
  });
});
