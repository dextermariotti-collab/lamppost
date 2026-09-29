import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { Switch } from "@/components/ui/switch";
import type { Visibility } from "@/lib/safety";
import { setProfileVisibility } from "@/lib/safety.functions";

/**
 * The one control for what friends can see. Off (the default): a name and an avatar. On: also
 * streak, XP, badges and a place in the friends league.
 */
export function ShareProgressToggle({
  visibility,
  onChanged,
}: {
  visibility: Visibility;
  onChanged?: (next: Visibility) => void;
}) {
  const save = useServerFn(setProfileVisibility);
  const labelId = useId();
  const helpId = useId();
  const [value, setValue] = useState<Visibility>(visibility);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (on: boolean) => {
    const next: Visibility = on ? "friends" : "minimal";
    setBusy(true);
    setError(null);
    try {
      const result = await save({ data: { visibility: next } });
      if (result.ok) {
        setValue(next);
        onChanged?.(next);
      } else {
        setError(result.reason);
      }
    } catch {
      setError("That couldn't be saved just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p id={labelId} className="text-sm font-bold">
            Share my progress with friends
          </p>
          <p id={helpId} className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {value === "friends"
              ? "Your accepted friends can see your streak, XP and badges, and you appear in their weekly league."
              : "Friends see only your name and avatar. Turn this on to compare streaks and join the weekly league."}
          </p>
        </div>
        <Switch
          checked={value === "friends"}
          disabled={busy}
          onCheckedChange={(on) => void change(on)}
          aria-labelledby={labelId}
          aria-describedby={helpId}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
