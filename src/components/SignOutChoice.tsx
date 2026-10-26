import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearDeviceData } from "@/lib/device-data";

const button =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-sm py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60";

/**
 * Signing out keeps the progress on this device so it is there when the person signs back in. On
 * a shared device they can clear it instead, so the next person starts fresh and sees nothing of
 * theirs (a different account signing in would clear it anyway: DeviceOwnerGuard).
 */
export function SignOutChoice() {
  const navigate = useNavigate();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  const signOut = async (clear: boolean) => {
    setBusy(true);
    await supabase.auth.signOut();
    if (clear) {
      clearDeviceData();
      // A full reload, so no screen still open can save the old numbers back.
      window.location.replace("/");
      return;
    }
    navigate({ to: "/auth", replace: true });
  };

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="mt-8 flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </button>
    );
  }

  return (
    <section aria-labelledby="sign-out-heading" className="sign mt-8 bg-card p-4">
      <h2 id="sign-out-heading" className="text-sm font-bold">
        Sign out
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Your progress stays on this device, so it is here when you sign back in. On a shared device,
        clear it so the next person starts fresh.
      </p>
      <div className="mt-3 grid gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void signOut(false)}
          className={`${button} bg-primary text-primary-foreground`}
        >
          Sign out
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void signOut(true)}
          className={`${button} border border-border bg-card text-destructive`}
        >
          Sign out and clear this device
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setAsking(false)}
          className={`${button} text-muted-foreground`}
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
