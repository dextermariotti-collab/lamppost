import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { shiftDay } from "./days";
import { TodayInput, resolveToday } from "./client-day";
import { MAX_SHARED_STREAKS, evaluateSharedStreak } from "./shared-streak";
import { isVisibility, DEFAULT_VISIBILITY, type Visibility } from "./safety";
import { socialConsentProblem } from "./safety.functions";

export type PersonCard = {
  id: string;
  displayName: string | null;
  handle: string;
  /** Null unless this is a friend who has chosen to share progress with friends. */
  currentStreak: number | null;
  totalXp?: number;
  /** Whether streak, XP and activity are shown for this person. */
  sharesProgress: boolean;
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
  /** What the caller currently shares with friends. */
  myVisibility: Visibility;
  activeSharedStreaks: number;
  bestSharedStreak: number;
};

const PROFILE_COLUMNS =
  "id, display_name, handle, current_streak, total_xp, profile_visibility, companion_preset, companion_palette, companion_accessory, companion_expression";

type ProfileRow = {
  id: string;
  display_name: string | null;
  handle: string;
  current_streak: number | null;
  total_xp: number;
  profile_visibility?: string;
  companion_preset: string;
  companion_palette: string;
  companion_accessory: string;
  companion_expression: string;
};

/**
 * What another person is allowed to see. Anyone sees a name, handle and avatar. Streak and XP
 * are included only for an accepted friend who has chosen to share them (`asFriend`).
 */
const toCard = (row: ProfileRow, asFriend = false): PersonCard => {
  const shares = asFriend && row.profile_visibility === "friends";
  return {
    id: row.id,
    displayName: row.display_name,
    handle: row.handle,
    currentStreak: shares ? row.current_streak : null,
    ...(shares ? { totalXp: row.total_xp } : {}),
    sharesProgress: shares,
    companion: {
      preset: row.companion_preset,
      palette: row.companion_palette,
      accessory: row.companion_accessory,
      expression: row.companion_expression,
    },
  };
};

/** Most friend requests a person can have waiting for an answer at once. */
export const MAX_PENDING_REQUESTS = 20;
/** People search matches handles from this many characters (the database refuses fewer). */
export const MIN_SEARCH_CHARS = 3;

const Id = z.string().uuid();
const PersonInput = z.object({ userId: Id });
const FriendshipInput = z.object({ friendshipId: Id });
const RequestAnswer = z.object({ friendshipId: Id, accept: z.boolean() });
const StreakAnswer = z.object({ sharedStreakId: Id, accept: z.boolean() });
const NudgeInput = z.object({
  toUserId: Id,
  sharedStreakId: Id.optional(),
  today: z.string().max(10).optional(),
});
const SearchInput = z.object({ query: z.string().max(100) });
const InviteInput = z.object({ code: z.string().max(40) });
const HandleInput = z.object({ handle: z.string().max(40) });

/** Checks input at run time; anything malformed gets one plain message instead of a stack. */
function parsed<S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error("That request didn't look right. Refresh and try again.");
  return result.data;
}

/** Logs what went wrong for us and tells the person plainly, never with the database's words. */
function failed(what: string, error: unknown): never {
  console.error(`[friends] ${what}`, error);
  throw new Error("That couldn't be done just now. Try again in a moment.");
}

/** Stops here if the caller hasn't accepted the current terms (see socialConsentProblem). */
async function requireConsent(userId: string) {
  const problem = await socialConsentProblem(userId);
  if (problem) throw new Error(problem);
}

async function requireLimit(policy: "friendRequest" | "profileSearch") {
  const { limiter } = await import("./rate-limit.server");
  const verdict = await limiter().enforce(policy);
  if (!verdict.ok) throw new Error(verdict.message);
}

/** RPCs added after the generated client types (search_profiles takes a viewer now). */
type UntypedRpc = (
  fn: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;

type SearchRow = Omit<ProfileRow, "current_streak" | "total_xp" | "profile_visibility">;

export const listFriends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => parsed(TodayInput, input))
  .handler(async ({ data, context }): Promise<FriendsSnapshot> => {
    const { supabase, userId } = context;
    const today = resolveToday(data);
    const yesterday = shiftDay(today, -1);

    // The invite code is a private column and pending requesters' profiles are not
    // readable through the browser grant, so both are read server-side. The ids come
    // from the caller's own (RLS-filtered) friendships, so only people they are
    // linked to are ever returned, and only public columns.
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const [{ data: me }, { data: links, error: linkError }] = await Promise.all([
      admin
        .from("profiles")
        .select("invite_code, profile_visibility")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("friendships").select("id, requester_id, addressee_id, status"),
    ]);
    if (linkError) failed("Listing friendships", linkError);

    const rows = links ?? [];
    const otherId = (row: { requester_id: string; addressee_id: string }) =>
      row.requester_id === userId ? row.addressee_id : row.requester_id;
    const ids = rows.map(otherId);

    const profiles = ids.length
      ? ((await admin.from("profiles").select(PROFILE_COLUMNS).in("id", ids)).data ?? [])
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

    // A shared streak needs both people's activity, so it is read with the service role for the
    // caller and their accepted friends only. Whether a friend's activity is SHOWN still
    // depends on them sharing (below).
    const activityIds = [userId, ...accepted.map(otherId)];
    const activity =
      (
        await admin
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
          await admin
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
      const card = toCard(profile, true);
      return [
        {
          ...card,
          friendshipId: link.id,
          // Accepting a shared streak means sharing whether you practiced today with that friend.
          activeToday:
            (card.sharesProgress || streak?.status === "active") && activeToday.has(profile.id),
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
      myVisibility: isVisibility(me?.profile_visibility)
        ? me.profile_visibility
        : DEFAULT_VISIBILITY,
      activeSharedStreaks: friends.filter((f) => f.sharedStreak?.status === "active").length,
      bestSharedStreak: friends.reduce((max, f) => Math.max(max, f.sharedStreak?.count ?? 0), 0),
    };
  });

export const searchPeople = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { query: string }) => parsed(SearchInput, input))
  .handler(async ({ data, context }): Promise<PersonCard[]> => {
    const query = data.query.trim().replace(/^@/, "");
    if (query.length < MIN_SEARCH_CHARS) return [];
    await requireConsent(context.userId);
    await requireLimit("profileSearch");
    // Search is server-only: it matches handles (never names), skips blocked pairs and the
    // caller, and is counted against the caller's limit above.
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: results, error } = await (admin.rpc as unknown as UntypedRpc)("search_profiles", {
      _viewer: context.userId,
      _query: query,
    });
    if (error) failed("Searching people", error);
    return ((results ?? []) as SearchRow[]).map((row) =>
      toCard({ ...row, current_streak: null, total_xp: 0 }),
    );
  });

export const sendFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { userId: string }) => parsed(PersonInput, input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (data.userId === userId) throw new Error("You can't add yourself.");
    await requireConsent(userId);
    await requireLimit("friendRequest");

    // The browser can't insert friendships (see the social_safety_hardening migration), so the
    // request is checked and written here. The database still refuses one between a blocked pair.
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: link, error: linkError } = await admin
      .from("friendships")
      .select("requester_id, status")
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${data.userId}),and(requester_id.eq.${data.userId},addressee_id.eq.${userId})`,
      )
      .maybeSingle();
    if (linkError) failed("Checking an existing friendship", linkError);
    if (link) {
      if (link.status === "accepted") throw new Error("You're already friends.");
      throw new Error(
        link.requester_id === userId
          ? "You've already asked them. They'll see it next time they visit."
          : "They've already asked you. Accept their request instead.",
      );
    }

    const { count, error: countError } = await admin
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("requester_id", userId)
      .eq("status", "pending");
    if (countError) failed("Counting waiting requests", countError);
    if ((count ?? 0) >= MAX_PENDING_REQUESTS) {
      throw new Error(
        `You have ${MAX_PENDING_REQUESTS} requests waiting for an answer. Send more once some are answered.`,
      );
    }

    const { error } = await admin.from("friendships").insert({
      requester_id: userId,
      addressee_id: data.userId,
      status: "pending",
    });
    if (error) {
      // A refused request (for example, between people where one has blocked the other) gets
      // the same plain message as any other failure, so it never reveals a block.
      if (error.code === "23505") throw new Error("You're already connected with them.");
      console.error("[friends] Sending a request", error);
      throw new Error("That request could not be sent.");
    }
    return { ok: true };
  });

export const respondToRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { friendshipId: string; accept: boolean }) => parsed(RequestAnswer, input))
  .handler(async ({ data, context }) => {
    if (!data.accept) {
      const { error } = await context.supabase
        .from("friendships")
        .delete()
        .eq("id", data.friendshipId);
      if (error) failed("Declining a request", error);
      return { ok: true };
    }
    await requireConsent(context.userId);
    const { error } = await context.supabase
      .from("friendships")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", data.friendshipId)
      .eq("addressee_id", context.userId);
    if (error) failed("Accepting a request", error);
    return { ok: true };
  });

export const removeFriend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { friendshipId: string }) => parsed(FriendshipInput, input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("friendships")
      .delete()
      .eq("id", data.friendshipId);
    if (error) failed("Removing a friend", error);
    return { ok: true };
  });

export const proposeSharedStreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { friendshipId: string }) => parsed(FriendshipInput, input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireConsent(userId);
    // Shared streaks are written by the server, so membership is checked here:
    // the friendship must be one of the caller's own (RLS) and already accepted.
    const { data: friendship } = await supabase
      .from("friendships")
      .select("id")
      .eq("id", data.friendshipId)
      .eq("status", "accepted")
      .maybeSingle();
    if (!friendship) throw new Error("You can only start a shared streak with a friend.");
    const { count } = await supabase
      .from("shared_streaks")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    if ((count ?? 0) >= MAX_SHARED_STREAKS) {
      throw new Error(
        `You can keep ${MAX_SHARED_STREAKS} shared streaks going at once. End one to start another.`,
      );
    }
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { error } = await admin.from("shared_streaks").insert({
      friendship_id: data.friendshipId,
      proposed_by: userId,
      status: "pending",
    });
    if (error) {
      if (error.code === "23505") throw new Error("A shared streak already exists with them.");
      failed("Starting a shared streak", error);
    }
    return { ok: true };
  });

export const respondToSharedStreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { sharedStreakId: string; accept: boolean }) => parsed(StreakAnswer, input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: streak, error: readError } = await supabase
      .from("shared_streaks")
      .select("id, proposed_by, status")
      .eq("id", data.sharedStreakId)
      .maybeSingle();
    if (readError) failed("Reading a shared streak", readError);
    if (!streak) throw new Error("That shared streak is no longer available.");
    if (streak.proposed_by === userId && data.accept) {
      throw new Error("Your friend still needs to accept this one.");
    }
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    if (!data.accept) {
      const { error } = await admin.from("shared_streaks").delete().eq("id", streak.id);
      if (error) failed("Ending a shared streak", error);
      return { ok: true };
    }
    await requireConsent(userId);
    // Accepting an already-running streak must not restart its count.
    if (streak.status !== "pending") return { ok: true };
    const { error } = await admin
      .from("shared_streaks")
      .update({ status: "active", started_at: new Date().toISOString(), current_count: 0 })
      .eq("id", streak.id);
    if (error) failed("Accepting a shared streak", error);
    return { ok: true };
  });

export const sendNudge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { toUserId: string; sharedStreakId?: string; today?: string }) =>
    parsed(NudgeInput, input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireConsent(userId);
    const { data: link } = await supabase
      .from("friendships")
      .select("id")
      .eq("status", "accepted")
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${data.toUserId}),and(requester_id.eq.${data.toUserId},addressee_id.eq.${userId})`,
      )
      .maybeSingle();
    if (!link) throw new Error("You can only nudge a friend.");

    // The database checks all of this again for the browser role; asking first means the
    // person is told plainly why a nudge didn't go.
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: recipient } = await admin
      .from("profiles")
      .select("notify_nudges_inapp")
      .eq("id", data.toUserId)
      .maybeSingle();
    if (!recipient?.notify_nudges_inapp) throw new Error("They've turned nudges off.");
    if (data.sharedStreakId) {
      const { data: streak } = await admin
        .from("shared_streaks")
        .select("friendship_id")
        .eq("id", data.sharedStreakId)
        .maybeSingle();
      if (streak?.friendship_id !== link.id) {
        throw new Error("That shared streak is no longer available.");
      }
    }

    // "One nudge per friend per day" is counted on the sender's local day, the
    // same day listFriends uses to say whether they've already nudged today.
    const { error } = await supabase.from("nudges").insert({
      from_user_id: userId,
      to_user_id: data.toUserId,
      shared_streak_id: data.sharedStreakId ?? null,
      day: resolveToday(data),
    });
    if (error) {
      if (error.code === "23505") throw new Error("You already nudged them today.");
      failed("Sending a nudge", error);
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
    if (error) failed("Listing nudges", error);
    const senders = (data ?? []).map((n) => n.from_user_id);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const profiles = senders.length
      ? ((await admin.from("profiles").select("id, display_name, handle").in("id", senders)).data ??
        [])
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
    if (error) failed("Marking nudges read", error);
    return { ok: true };
  });

export const resolveInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { code: string }) => parsed(InviteInput, input))
  .handler(async ({ data, context }): Promise<PersonCard | null> => {
    await requireConsent(context.userId);
    const { data: rows, error } = await context.supabase.rpc("profile_by_invite", {
      _code: data.code,
    });
    if (error) failed("Looking up an invite", error);
    const row = (rows ?? [])[0];
    if (!row || row.id === context.userId) return null;
    return toCard({ ...row, total_xp: 0 } as ProfileRow);
  });

/** The owner always sees their own numbers, whatever they share with others. */
const ownProgress = (profile: { current_streak: number; total_xp: number }) => ({
  currentStreak: profile.current_streak,
  totalXp: profile.total_xp,
  sharesProgress: true,
});

export const getFriendProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { handle: string }) => parsed(HandleInput, input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Only accepted friends' rows are readable through the browser grant, but this
    // page also shows people with a pending request. Look the person up with the
    // service role, and return them only if the caller is linked to them (or it is
    // themselves) — and only public columns.
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await admin
      .from("profiles")
      .select(`${PROFILE_COLUMNS}, longest_streak, created_at`)
      .ilike(
        "handle",
        data.handle.replace(/[\\%_]/g, (c) => `\\${c}`),
      )
      .maybeSingle();
    if (error) failed("Looking up a profile", error);
    if (!profile) return null;

    const { data: link } = await supabase
      .from("friendships")
      .select("id, status")
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${userId})`,
      )
      .maybeSingle();
    if (profile.id !== userId && !link) return null;

    const { data: badges } = await supabase
      .from("user_achievements")
      .select("achievement_code, unlocked_at")
      .eq("user_id", profile.id);

    const isSelf = profile.id === userId;
    const card = toCard(profile as ProfileRow, link?.status === "accepted");
    const visible = isSelf || card.sharesProgress;
    return {
      person: isSelf ? { ...toCard(profile as ProfileRow, true), ...ownProgress(profile) } : card,
      longestStreak: visible ? profile.longest_streak : null,
      joinedAt: visible ? profile.created_at : null,
      badges: visible
        ? (badges ?? []).map((b) => ({ code: b.achievement_code, unlockedAt: b.unlocked_at }))
        : [],
      isSelf,
      friendshipId: link?.id ?? null,
      friendshipStatus: (link?.status as "pending" | "accepted" | undefined) ?? null,
    };
  });
