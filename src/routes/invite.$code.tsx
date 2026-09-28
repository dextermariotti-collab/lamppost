import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useAccount, useRefreshAccount } from "@/lib/account";
import { normalizeCompanion } from "@/lib/companions";
import { resolveInvite, sendFriendRequest } from "@/lib/friends.functions";

export const Route = createFileRoute("/invite/$code")({
  head: () => ({
    meta: [
      { title: "You're invited to learn on Lamppost" },
      {
        name: "description",
        content: "Accept a Lamppost invite, become friends and start a shared streak together.",
      },
      { property: "og:title", content: "You're invited to learn on Lamppost" },
      {
        property: "og:description",
        content: "Join a friend on Lamppost and keep each other's streak alive.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InviteScreen,
});

function InviteScreen() {
  const { code } = useParams({ from: "/invite/$code" });
  const { signedIn, sessionReady } = useAccount();
  const refresh = useRefreshAccount();
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  const { data, isLoading } = useQuery({
    queryKey: ["invite", code],
    queryFn: () => resolveInvite({ data: { code } }),
    enabled: signedIn,
  });

  return (
    <PhoneFrame>
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        {!sessionReady || (signedIn && isLoading) ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : !signedIn ? (
          <>
            <UserPlus className="h-7 w-7 text-primary-text" />
            <h1 className="mt-3 text-2xl">You&apos;ve been invited</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to accept the invite and start a shared streak.
            </p>
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="mt-5 rounded-2xl bg-hero-gradient px-6 py-3 text-sm font-bold text-primary-foreground shadow-card"
            >
              Sign in to continue
            </button>
          </>
        ) : !data ? (
          <>
            <h1 className="text-2xl">Invite not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This link has expired or points to your own account.
            </p>
            <button
              onClick={() => navigate({ to: "/friends" })}
              className="mt-5 rounded-2xl bg-card px-6 py-3 text-sm font-bold shadow-soft"
            >
              Go to friends
            </button>
          </>
        ) : (
          <>
            <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted">
              <CompanionAvatar companion={normalizeCompanion(data.companion)} size={78} />
            </span>
            <h1 className="mt-4 text-2xl">{data.displayName ?? data.handle} invited you</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              @{data.handle} · {data.currentStreak} day streak. Become friends and keep each
              other&apos;s streak alive.
            </p>
            {state === "sent" ? (
              <p className="mt-5 text-sm font-bold text-success">
                Request sent — they&apos;ll see it on their friends screen.
              </p>
            ) : (
              <button
                onClick={async () => {
                  setState("busy");
                  try {
                    await sendFriendRequest({ data: { userId: data.id } });
                    refresh();
                    setState("sent");
                  } catch {
                    setState("error");
                  }
                }}
                disabled={state === "busy"}
                className="mt-5 rounded-2xl bg-hero-gradient px-6 py-3 text-sm font-bold text-primary-foreground shadow-card disabled:opacity-60"
              >
                Accept invite
              </button>
            )}
            {state === "error" ? (
              <p className="mt-3 text-xs text-flame">That didn&apos;t work. Try again.</p>
            ) : null}
            <button
              onClick={() => navigate({ to: "/friends" })}
              className="mt-4 text-xs text-muted-foreground underline"
            >
              Go to friends
            </button>
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
