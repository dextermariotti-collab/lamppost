import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShareProgressToggle } from "@/components/ShareProgressToggle";
import { useAccount, useRefreshAccount } from "@/lib/account";
import { listBlockedPeople, unblockUser } from "@/lib/safety.functions";
import { DEFAULT_VISIBILITY } from "@/lib/safety";

/** Settings for signed-in people: what friends see, and who they have blocked. */
export function PrivacySafetySection() {
  const { data: account, signedIn } = useAccount();
  const refresh = useRefreshAccount();
  const client = useQueryClient();
  const unblock = useServerFn(unblockUser);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const blocked = useQuery({
    queryKey: ["blocked-people"],
    queryFn: () => listBlockedPeople(),
    enabled: signedIn,
  });

  if (!signedIn) return null;

  const lift = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      const result = await unblock({ data: { userId: id } });
      if (!result.ok) setError(result.reason);
      await client.invalidateQueries({ queryKey: ["blocked-people"] });
    } catch {
      setError("That couldn't be done just now. Try again in a moment.");
    } finally {
      setBusy(null);
    }
  };

  const people = blocked.data ?? [];

  return (
    <section className="mt-6" aria-labelledby="privacy-safety-heading">
      <h2
        id="privacy-safety-heading"
        className="px-1 font-sans text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
      >
        Privacy and safety
      </h2>
      <div className="mt-2 rounded-2xl border border-border p-4">
        <ShareProgressToggle
          key={account?.visibility ?? "loading"}
          visibility={account?.visibility ?? DEFAULT_VISIBILITY}
          onChanged={refresh}
        />
      </div>

      <div className="mt-3 rounded-2xl border border-border p-4">
        <h3 className="text-sm font-bold">Blocked people</h3>
        {blocked.isLoading ? (
          <p className="mt-1 text-xs text-muted-foreground">Loading…</p>
        ) : people.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            You haven&apos;t blocked anyone. You can block or report someone from their profile or
            from a friend request.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {people.map((person) => (
              <li key={person.id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {person.displayName ?? person.handle}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{person.handle}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void lift(person.id)}
                  disabled={busy === person.id}
                  className="min-h-11 rounded-full bg-muted px-4 text-xs font-bold disabled:opacity-60"
                >
                  Unblock
                  <span className="sr-only"> {person.displayName ?? person.handle}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs font-bold text-destructive">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
