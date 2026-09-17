import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { shiftUtcDay, utcDay } from "./days";
import { MAX_SHARED_STREAKS, evaluateSharedStreak } from "./shared-streak";

export type PersonCard = {
  id: string;
  displayName: string | null;
  handle: string;
  currentStreak: number;
  totalXp?: number;
  companion: { preset: string; palette: string; accessory: string; expression: string };
};

export type FriendRow = PersonCard & {
  friendshipId: string;
  sharedStreak: {
    id: string;
    status: "pending" | "active";
    count: number;
    proposedByMe: boolean;
    extendedToday: boolean;
  } | null;
  activeToday: boolean;
  nudgedToday: boolean;
};

export type FriendsSnapshot = {
  friends: FriendRow[];
  incoming: (PersonCard & { friendshipId: string })[];
  outgoing: (PersonCard & { friendshipId: string })[];
  inviteCode: string;
  activeSharedStreaks: number;
  bestSharedStreak: number;
};

const PROFILE_COLUMNS =
  "id, display_name, handle, current_streak, total_xp, companion_preset, companion_palette, companion_accessory, companion_expression";

type ProfileRow = {
  id: string;
  display_name: string | null;
  handle: string;
  current_streak: number;
  total_xp: number;
  companion_preset: string;
  companion_palette: string;
  companion_accessory: string;
  companion_expression: string;
};

const toCard = (row: ProfileRow): PersonCard => ({
  id: row.id,
  displayName: row.display_name,
  handle: row.handle,
  currentStreak: row.current_streak,
  totalXp: row.total_xp,
  companion: {
    preset: row.companion_preset,
    palette: row.companion_palette,
    accessory: row.companion_accessory,
    expression: row.companion_expression,
  },
});

export const listFriends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FriendsSnapshot> => {
    const { supabase, userId } = context;
    const today = utcDay();
    const yesterday = shiftUtcDay(today, -1);

    const [{ data: me }, { data: links, error: linkError }] = await Promise.all([
      supabase.from("profiles").select("invite_code").eq("id", userId).maybeSingle(),
      supabase.from("friendships").select("id, requester_id, addressee_id, status"),
    ]);
    if (linkError) throw new Error(linkError.message);

    const rows = links ?? [];
    const otherId = (row: { requester_id: string; addressee_id: string }) =>
      row.requester_id === userId ? row.addressee_id : row.requester_id;
    const ids = rows.map(otherId);

    const profiles = ids.length
      ? ((await supabase.from("profiles").select(PROFILE_COLUMNS).in("id", ids)).data ?? [])
      : [];
    const byId = new Map(profiles.map((p) => [p.id, p as ProfileRow]));

    const accepted = rows.filter((r) => r.status === "accepted");
    const streaks = accepted.length
      ? ((
          await supabase
            .from("shared_streaks")
            .select("id, friendship_id, status, current_count, last_extended_day, proposed_by")
            .in(
              "friendship_id",
              accepted.map((r) => r.id),
            )
        ).data ?? [])
      : [];

    const activityIds = [userId, ...accepted.map(otherId)];
    const activity =
      (
        await supabase
          .from("daily_activity")
          .select("user_id, day, lessons_completed")
          .in("user_id", activityIds)
          .eq("day", today)
      ).data ?? [];
    const activeToday = new Set(
      activity.filter((a) => a.lessons_completed > 0).map((a) => a.user_id),
    );

    const nudges =
      (
        await supabase
          .from("nudges")
          .select("to_user_id")
          .eq("from_user_id", userId)
          .eq("day", today)
      ).data ?? [];
    const nudgedToday = new Set(nudges.map((n) => n.to_user_id));

    // Lazy evaluation: extend or reset shared streaks on read.
    const streakByFriendship = new Map<string, (typeof streaks)[number]>();
    for (const streak of streaks) {
      let record = streak;
      if (streak.status === "active") {
        const link = accepted.find((r) => r.id === streak.friendship_id);
        const bothActiveToday = Boolean(
          link && activeToday.has(userId) && activeToday.has(otherId(link)),
        );
        const next = evaluateSharedStreak({
          count: streak.current_count,
          lastExtendedDay: streak.last_extended_day,
          bothActiveToday,
          today,
          yesterday,
        });
        if (next.changed) {
          await supabase
            .from("shared_streaks")
            .update({ current_count: next.count, last_extended_day: next.lastExtendedDay })
            .eq("id", streak.id);
          record = {
            ...streak,
            current_count: next.count,
            last_extended_day: next.lastExtendedDay,
          };
        }
      }
      streakByFriendship.set(streak.friendship_id, record);
    }

    const friends: FriendRow[] = accepted.flatMap((link) => {
      const profile = byId.get(otherId(link));
      if (!profile) return [];
      const streak = streakByFriendship.get(link.id);
      return [
        {
          ...toCard(profile),
          friendshipId: link.id,
          activeToday: activeToday.has(profile.id),
          nudgedToday: nudgedToday.has(profile.id),
          sharedStreak: streak
            ? {
                id: streak.id,
                status: streak.status as "pending" | "active",
                count: streak.current_count,
                proposedByMe: streak.proposed_by === userId,
                extendedToday: streak.last_extended_day === today,
              }
            : null,
        },
      ];
    });

    const pending = (direction: "incoming" | "outgoing") =>
      rows
        .filter(
          (r) =>
            r.status === "pending" &&
            (direction === "incoming" ? r.addressee_id === userId : r.requester_id === userId),
        )
        .flatMap((r) => {
          const profile = byId.get(otherId(r));
          return profile ? [{ ...toCard(profile), friendshipId: r.id }] : [];
        });

    return {
      friends: friends.sort(
        (a, b) => (b.sharedStreak?.count ?? -1) - (a.sharedStreak?.count ?? -1),
      ),
      incoming: pending("incoming"),
      outgoing: pending("outgoing"),
      inviteCode: me?.invite_code ?? "",
      activeSharedStreaks: friends.filter((f) => f.sharedStreak?.status === "active").length,
      bestSharedStreak: friends.reduce((max, f) => Math.max(max, f.sharedStreak?.count ?? 0), 0),
    };
  });

export const searchPeople = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ data, context }): Promise<PersonCard[]> => {
    const query = data.query.trim();
    if (query.length < 2) return [];
    const { data: results, error } = await context.supabase.rpc("search_profiles", {
      _query: query,
    });
    if (error) throw new Error(error.message);
    return (results ?? []).map((row) => toCard({ ...row, total_xp: 0 } as ProfileRow));
  });

export const sendFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("You can't add yourself.");
    const { error } = await context.supabase.from("friendships").insert({
      requester_id: context.userId,
      addressee_id: data.userId,
      status: "pending",
    });
    if (error) {
      throw new Error(
        error.code === "23505" ? "You're already connected with them." : error.message,
      );
    }
    return { ok: true };
  });

export const respondToRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { friendshipId: string; accept: boolean }) => input)
  .handler(async ({ data, context }) => {
    if (!data.accept) {
      const { error } = await context.supabase
        .from("friendships")
        .delete()
        .eq("id", data.friendshipId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await context.supabase
      .from("friendships")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", data.friendshipId)
      .eq("addressee_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFriend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { friendshipId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("friendships")
      .delete()
      .eq("id", data.friendshipId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const proposeSharedStreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { friendshipId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase
      .from("shared_streaks")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    if ((count ?? 0) >= MAX_SHARED_STREAKS) {
      throw new Error(
        `You can keep ${MAX_SHARED_STREAKS} shared streaks going at once. End one to start another.`,
      );
    }
    const { error } = await supabase.from("shared_streaks").insert({
      friendship_id: data.friendshipId,
      proposed_by: userId,
      status: "pending",
    });
    if (error) {
      throw new Error(
        error.code === "23505" ? "A shared streak already exists with them." : error.message,
      );
    }
    return { ok: true };
  });

export const respondToSharedStreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sharedStreakId: string; accept: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: streak, error: readError } = await supabase
      .from("shared_streaks")
      .select("id, proposed_by, status")
      .eq("id", data.sharedStreakId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!streak) throw new Error("That shared streak is no longer available.");
    if (streak.proposed_by === userId && data.accept) {
      throw new Error("Your friend still needs to accept this one.");
    }
    if (!data.accept) {
      const { error } = await supabase.from("shared_streaks").delete().eq("id", streak.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await supabase
      .from("shared_streaks")
      .update({ status: "active", started_at: new Date().toISOString(), current_count: 0 })
      .eq("id", streak.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendNudge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { toUserId: string; sharedStreakId?: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("nudges").insert({
      from_user_id: context.userId,
      to_user_id: data.toUserId,
      shared_streak_id: data.sharedStreakId ?? null,
    });
    if (error) {
      throw new Error(error.code === "23505" ? "You already nudged them today." : error.message);
    }
    return { ok: true };
  });

export const listNudges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("nudges")
      .select("id, from_user_id, day, sent_at")
      .eq("to_user_id", userId)
      .is("read_at", null)
      .order("sent_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    const senders = (data ?? []).map((n) => n.from_user_id);
    const profiles = senders.length
      ? ((await supabase.from("profiles").select("id, display_name, handle").in("id", senders))
          .data ?? [])
      : [];
    const byId = new Map(profiles.map((p) => [p.id, p]));
    return (data ?? []).map((n) => ({
      id: n.id,
      sentAt: n.sent_at,
      from:
        byId.get(n.from_user_id)?.display_name ?? byId.get(n.from_user_id)?.handle ?? "A friend",
    }));
  });

export const markNudgesRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("nudges")
      .update({ read_at: new Date().toISOString() })
      .eq("to_user_id", context.userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resolveInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data, context }): Promise<PersonCard | null> => {
    const { data: rows, error } = await context.supabase.rpc("profile_by_invite", {
      _code: data.code,
    });
    if (error) throw new Error(error.message);
    const row = (rows ?? [])[0];
    if (!row || row.id === context.userId) return null;
    return toCard({ ...row, total_xp: 0 } as ProfileRow);
  });

export const getFriendProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { handle: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(`${PROFILE_COLUMNS}, longest_streak, created_at`)
      .ilike("handle", data.handle)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) return null;

    const [{ data: badges }, { data: link }] = await Promise.all([
      supabase
        .from("user_achievements")
        .select("achievement_code, unlocked_at")
        .eq("user_id", profile.id),
      supabase
        .from("friendships")
        .select("id, status")
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${userId})`,
        )
        .maybeSingle(),
    ]);

    return {
      person: toCard(profile as ProfileRow),
      longestStreak: profile.longest_streak,
      joinedAt: profile.created_at,
      badges: (badges ?? []).map((b) => ({ code: b.achievement_code, unlockedAt: b.unlocked_at })),
      friendshipId: link?.id ?? null,
      friendshipStatus: (link?.status as "pending" | "accepted" | undefined) ?? null,
    };
  });
