import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { useAccount } from "@/lib/account";
import { clearPendingConsent, needsConsent, readPendingConsent } from "@/lib/consent";
import { recordConsent } from "@/lib/consent.functions";

/** Screens a signed-in person can reach without having accepted the current text. */
const EXEMPT = ["/consent", "/legal", "/support", "/auth"];
const isExempt = (path: string) => EXEMPT.some((p) => path === p || path.startsWith(`${p}/`));

/**
 * Sends a signed-in account that hasn't accepted the current Terms and Privacy Policy
 * (or never gave an age band) to the consent screen. If they just signed up on this
 * device, the agreement they ticked on the form is recorded first, so they aren't asked
 * twice. Guests are never affected, and an unmigrated database (consent unknown) enforces
 * nothing.
 */
export function ConsentGate() {
  const { data: account, signedIn } = useAccount();
  const navigate = useNavigate();
  const client = useQueryClient();
  const record = useServerFn(recordConsent);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tried = useRef(false);

  useEffect(() => {
    if (!signedIn || !account || !needsConsent(account.consent) || isExempt(path)) return;
    const pending = tried.current ? null : readPendingConsent();
    tried.current = true;
    if (!pending) {
      navigate({ to: "/consent", replace: true });
      return;
    }
    void record({ data: pending })
      .then(async (result) => {
        if (!result.ok) throw new Error(result.reason);
        clearPendingConsent();
        await client.invalidateQueries({ queryKey: ["account"] });
      })
      .catch(() => {
        clearPendingConsent();
        navigate({ to: "/consent", replace: true });
      });
  }, [signedIn, account, path, navigate, client, record]);

  return null;
}
