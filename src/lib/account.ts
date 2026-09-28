import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { dayKey } from "./days";
import { useSessionUser } from "./companion-store";
import { getMyProfile } from "./profile.functions";
import { listAchievements } from "./achievements.functions";
import { listFriends, listNudges } from "./friends.functions";

export function useAccount() {
  const { userId, ready } = useSessionUser();
  const query = useQuery({
    queryKey: ["account", userId],
    queryFn: () => getMyProfile(),
    enabled: ready && Boolean(userId),
    staleTime: 30_000,
  });
  return { ...query, signedIn: Boolean(userId), sessionReady: ready };
}

export function useAchievements() {
  const { userId, ready } = useSessionUser();
  return useQuery({
    queryKey: ["achievements", userId],
    queryFn: () => listAchievements({ data: { today: dayKey() } }),
    enabled: ready && Boolean(userId),
    staleTime: 30_000,
  });
}

export function useFriends() {
  const { userId, ready } = useSessionUser();
  return useQuery({
    queryKey: ["friends", userId],
    queryFn: () => listFriends({ data: { today: dayKey() } }),
    enabled: ready && Boolean(userId),
    staleTime: 15_000,
  });
}

export function useIncomingNudges() {
  const { userId, ready } = useSessionUser();
  return useQuery({
    queryKey: ["nudges", userId],
    queryFn: () => listNudges(),
    enabled: ready && Boolean(userId),
    staleTime: 60_000,
  });
}

/** Refetches everything that depends on account state after a mutation. */
export function useRefreshAccount() {
  const client = useQueryClient();
  return useCallback(() => {
    void client.invalidateQueries({ queryKey: ["account"] });
    void client.invalidateQueries({ queryKey: ["friends"] });
    void client.invalidateQueries({ queryKey: ["achievements"] });
    void client.invalidateQueries({ queryKey: ["nudges"] });
  }, [client]);
}

export function displayNameFor(
  profile:
    | {
        displayName: string | null;
        handle: string;
        email: string | null;
      }
    | null
    | undefined,
) {
  if (!profile) return "Learner";
  if (profile.displayName && profile.displayName.trim()) return profile.displayName;
  if (profile.email) return profile.email.split("@")[0]!;
  return profile.handle;
}
