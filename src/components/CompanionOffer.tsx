import { useEffect, useState } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  hasBeenOfferedCompanion,
  markCompanionOffered,
  readDraft,
  useSessionUser,
  writeDraft,
} from "@/lib/companion-store";
import { COMPANION_PRESETS, companionFromPreset, presetById } from "@/lib/companions";

/**
 * After the first lesson, once: a small invitation to pick who practises alongside. Someone who
 * already chose one (an account, or a pick saved on this device) is never asked, and "Not now"
 * is final. The companion can always be changed from Profile.
 */
export function CompanionOffer({ lessonsDone }: { lessonsDone: number }) {
  const { userId, ready } = useSessionUser();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(COMPANION_PRESETS[0]!.id);

  useEffect(() => {
    const sync = () =>
      setOpen(
        ready && !userId && lessonsDone >= 1 && readDraft() === null && !hasBeenOfferedCompanion(),
      );
    sync();
    window.addEventListener("lamppost-companion-change", sync);
    return () => window.removeEventListener("lamppost-companion-change", sync);
  }, [ready, userId, lessonsDone]);

  if (!open) return null;

  const preset = presetById(selected);
  return (
    <section
      aria-labelledby="companion-offer-heading"
      className="mt-3 animate-rise-in rounded-2xl border border-border bg-card p-4"
    >
      <h2 id="companion-offer-heading" className="text-lg leading-tight">
        Pick who practises with you
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Optional. You can change it any time in Profile.
      </p>
      <RadioGroup
        value={selected}
        onValueChange={setSelected}
        aria-label="Companion"
        className="mt-3 grid grid-cols-3 gap-2"
      >
        {COMPANION_PRESETS.map((option) => (
          <label
            key={option.id}
            className={`flex min-h-11 cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2 ${
              selected === option.id ? "border-primary bg-primary-soft" : "border-border"
            }`}
          >
            <RadioGroupItem value={option.id} className="sr-only" aria-label={option.name} />
            <CompanionAvatar companion={companionFromPreset(option.id)} size={48} />
            <span className="text-[11px] font-bold">{option.name}</span>
          </label>
        ))}
      </RadioGroup>
      <Button
        type="button"
        onClick={() => {
          writeDraft(companionFromPreset(selected));
          markCompanionOffered();
        }}
        className="mt-3 h-11 w-full rounded-full text-sm font-semibold"
      >
        Choose {preset.name}
      </Button>
      <button
        type="button"
        onClick={markCompanionOffered}
        className="mt-1 flex min-h-11 w-full items-center justify-center text-[13px] font-bold text-muted-foreground"
      >
        Not now
      </button>
    </section>
  );
}
