import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LegalFooter } from "@/components/LegalFooter";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { ConsentFields, UnderAgeNotice } from "@/components/ConsentFields";
import { useConsentForm } from "@/lib/use-consent-form";
import { PhoneFrame } from "@/components/PhoneFrame";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { deleteMyAccount } from "@/lib/account-data.functions";
import { useCompanion } from "@/lib/companion-store";
import { clearPendingConsent, needsConsent } from "@/lib/consent";
import { recordConsent } from "@/lib/consent.functions";

export const Route = createFileRoute("/consent")({
  head: () => ({
    meta: [
      { title: "One more step — Lamppost" },
      {
        name: "description",
        content: "Confirm your age and agree to the Terms and Privacy Policy.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsentScreen,
});

function ConsentScreen() {
  const navigate = useNavigate();
  const { data: account, signedIn, sessionReady } = useAccount();
  const client = useQueryClient();
  const record = useServerFn(recordConsent);
  const remove = useServerFn(deleteMyAccount);
  const { companion } = useCompanion();
  const form = useConsentForm();
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Signed-out visitors, and accounts that are already up to date, have nothing to do here.
  useEffect(() => {
    if (!sessionReady) return;
    if (!signedIn) navigate({ to: "/auth", replace: true });
    else if (account && !needsConsent(account.consent)) navigate({ to: "/", replace: true });
  }, [sessionReady, signedIn, account, navigate]);

  const save = async () => {
    if (!form.claim || busy) return;
    setBusy("save");
    setError(null);
    try {
      const result = await record({ data: form.claim });
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      clearPendingConsent();
      await client.invalidateQueries({ queryKey: ["account"] });
      navigate({ to: "/", replace: true });
    } catch {
      setError("That couldn't be saved just now. Try again in a moment.");
    } finally {
      setBusy(null);
    }
  };

  const signOut = async () => {
    clearPendingConsent();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const deleteAccount = async () => {
    if (busy) return;
    setBusy("delete");
    setError(null);
    try {
      await remove({ data: { confirm: "DELETE" } });
      clearPendingConsent();
      await supabase.auth.signOut();
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
      setBusy(null);
    }
  };

  const returning = Boolean(account?.consent.termsVersion);

  return (
    <PhoneFrame showNav={false}>
      <div className="flex min-h-full flex-col px-6 pb-8">
        <div className="mt-6 flex flex-col items-center text-center">
          <CompanionAvatar companion={companion} size={64} />
          <h1 className="mt-3 text-2xl">One more step</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {returning
              ? "Our Terms or Privacy Policy changed. Please take a look and confirm."
              : "Before you use your account, please confirm a couple of things."}
          </p>
        </div>

        <div className="mt-6">
          {form.blocked ? (
            <UnderAgeNotice>
              <div className="mt-4 space-y-2">
                <Button
                  onClick={deleteAccount}
                  disabled={busy !== null}
                  variant="destructive"
                  className="h-11 w-full rounded-full font-semibold"
                >
                  {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Delete this account
                </Button>
                <Button
                  onClick={signOut}
                  disabled={busy !== null}
                  variant="secondary"
                  className="h-11 w-full rounded-full font-semibold"
                >
                  Sign out
                </Button>
              </div>
            </UnderAgeNotice>
          ) : (
            <>
              <ConsentFields form={form} />
              {error && (
                <p
                  role="alert"
                  className="mt-3 rounded-2xl bg-flame/10 p-3 text-xs font-bold text-flame"
                >
                  {error}
                </p>
              )}
              <Button
                onClick={save}
                disabled={!form.ready || busy !== null}
                aria-busy={busy === "save"}
                className="mt-4 h-12 w-full rounded-full bg-hero-gradient text-base font-semibold shadow-card"
              >
                {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Agree and continue
              </Button>
              <Button
                onClick={signOut}
                disabled={busy !== null}
                variant="ghost"
                className="mt-2 h-11 w-full rounded-full text-sm font-bold text-muted-foreground"
              >
                Sign out instead
              </Button>
            </>
          )}
        </div>
      </div>
      <LegalFooter />
    </PhoneFrame>
  );
}
