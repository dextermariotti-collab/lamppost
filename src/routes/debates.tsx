import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2, Swords } from "lucide-react";
import { useEffect } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/lib/account";
import { listDebates } from "@/lib/debate.functions";

export const Route = createFileRoute("/debates")({
  head: () => ({
    meta: [
      { title: "Debates — Lamppost" },
      {
        name: "description",
        content:
          "Your async debates with friends: the same motion, opposite sides, both cases graded on one rubric.",
      },
      { property: "og:title", content: "Debates — Lamppost" },
      { property: "og:description", content: "Track whose turn it is and how each case scored." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DebatesScreen,
});

function DebatesScreen() {
  const navigate = useNavigate();
  const { signedIn, sessionReady } = useAccount();

  useEffect(() => {
    if (sessionReady && !signedIn) navigate({ to: "/auth", replace: true });
  }, [sessionReady, signedIn, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["debates"],
    queryFn: () => listDebates(),
    enabled: signedIn,
  });

  const debates = data ?? [];

  return (
    <PhoneFrame>
      <ScreenHeader backTo="/friends" />
      <main className="px-5 pb-10">
        <div className="flex items-center gap-2 text-primary-text">
          <Swords aria-hidden className="h-4 w-4" />
          <p className="text-xs font-bold">Debates</p>
        </div>
        <h1 className="mt-2 text-3xl leading-tight">Make your case</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Same motion, opposite sides, one rubric. Nobody sees the other case until both are in.
        </p>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && debates.length === 0 && (
          <div className="mt-8 rounded-3xl border border-border p-5 text-center">
            <p className="text-sm font-bold">No debates yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open a friend's profile and challenge them to a debate.
            </p>
            <Button asChild className="mt-4 h-11 w-full rounded-full font-semibold">
              <Link to="/friends">Find a friend</Link>
            </Button>
          </div>
        )}

        <ul className="mt-4">
          {debates.map((debate) => {
            const name = debate.opponent.displayName ?? `@${debate.opponent.handle}`;
            const status =
              debate.status === "graded"
                ? debate.winner === "you"
                  ? "You won"
                  : debate.winner === "them"
                    ? `${name} won`
                    : "Tied"
                : debate.myTurn
                  ? "Your turn"
                  : "Waiting on them";
            return (
              <li key={debate.id} className="border-b border-border/80">
                <Link
                  to="/debate/$id"
                  params={{ id: debate.id }}
                  className="flex items-center justify-between gap-3 py-3.5"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-snug">{debate.topic}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      vs {name} · you argue {debate.mySide}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {(debate.myTurn || debate.unseenResult) && (
                      <span
                        aria-label="Needs your attention"
                        className="h-2 w-2 rounded-full bg-primary"
                      />
                    )}
                    <span className="text-[11px] font-bold text-muted-foreground">{status}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </PhoneFrame>
  );
}
