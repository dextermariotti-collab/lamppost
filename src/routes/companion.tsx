import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { useCompanion } from "@/lib/companion-store";
import { useProgress } from "@/lib/progress";
import { cosmeticById, isCosmetic } from "@/lib/rewards";
import {
  COMPANION_ACCESSORIES,
  COMPANION_EXPRESSIONS,
  COMPANION_PALETTES,
  COMPANION_PRESETS,
  companionFromPreset,
  paletteById,
  presetById,
  type Companion,
} from "@/lib/companions";
import { cn } from "@/lib/utils";

/**
 * Companion picking and styling, kept out of onboarding so a new learner
 * reaches their first lesson faster.
 */
export const Route = createFileRoute("/companion")({
  head: () => ({
    meta: [
      { title: "Your companion — Lamppost" },
      {
        name: "description",
        content:
          "Choose the companion who trains with you and set their colour, accessory and mood.",
      },
      { property: "og:title", content: "Your companion — Lamppost" },
      {
        property: "og:description",
        content: "Pick your Lamppost companion and make them yours.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/companion" }],
  }),
  component: CompanionScreen,
});

function CompanionScreen() {
  const navigate = useNavigate();
  const { companion, loaded, save } = useCompanion();
  const { state } = useProgress();
  /** Whether a colour or accessory can be worn: free ones always, unlockable ones once owned. */
  const wearable = (id: string) => !isCosmetic(id) || state.cosmetics.includes(id);
  const [draft, setDraft] = useState<Companion>(companion);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loaded) setDraft(companion);
  }, [loaded, companion]);

  const commit = async () => {
    setSaving(true);
    await save(draft);
    navigate({ to: "/profile" });
  };

  return (
    <PhoneFrame showNav={false}>
      <ScreenHeader backTo="/profile" />
      <div className="flex min-h-full flex-col px-6 pb-8">
        <h1 className="mt-2 text-2xl leading-tight">Your companion</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {presetById(draft.preset).name} — {presetById(draft.preset).blurb}
        </p>

        <div className="mt-4 flex flex-col items-center rounded-3xl bg-card p-4 shadow-soft">
          <CompanionAvatar companion={draft} size={140} animate />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {COMPANION_PRESETS.map((preset) => {
            const active = preset.id === draft.preset;
            return (
              <button
                key={preset.id}
                onClick={() =>
                  setDraft((prev) => ({ ...companionFromPreset(preset.id), palette: prev.palette }))
                }
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl p-2 pb-2.5 transition-all duration-200",
                  active
                    ? "-translate-y-0.5 bg-primary/10 shadow-soft ring-2 ring-primary"
                    : "bg-card shadow-soft hover:-translate-y-0.5",
                )}
              >
                <CompanionAvatar companion={companionFromPreset(preset.id)} size={64} />
                <span className="text-[11px] font-extrabold">{preset.name}</span>
              </button>
            );
          })}
        </div>

        <Row label="Colour">
          {COMPANION_PALETTES.map((p) => {
            const locked = !wearable(p.id);
            return (
              <button
                key={p.id}
                onClick={() => setDraft((prev) => ({ ...prev, palette: p.id }))}
                disabled={locked}
                aria-label={locked ? `${p.name}, locked, ${cosmeticById(p.id)?.cost} gems` : p.name}
                aria-pressed={draft.palette === p.id}
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-full transition-transform",
                  draft.palette === p.id
                    ? "scale-105 ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "hover:scale-105",
                  locked && "opacity-50",
                )}
                style={{ background: paletteById(p.id).base }}
              >
                {locked && <Lock aria-hidden className="h-4 w-4 text-white drop-shadow" />}
              </button>
            );
          })}
        </Row>

        <Row label="Accessory">
          {COMPANION_ACCESSORIES.map((a) => {
            const locked = !wearable(a.id);
            return (
              <Chip
                key={a.id}
                active={draft.accessory === a.id}
                disabled={locked}
                onClick={() => setDraft((prev) => ({ ...prev, accessory: a.id }))}
              >
                {locked && <Lock aria-hidden className="mr-1 inline h-3 w-3" />}
                {a.name}
                {locked && (
                  <span className="sr-only">, locked, {cosmeticById(a.id)?.cost} gems</span>
                )}
              </Chip>
            );
          })}
        </Row>
        {COMPANION_ACCESSORIES.some((a) => !wearable(a.id)) ||
        COMPANION_PALETTES.some((p) => !wearable(p.id)) ? (
          <p className="mt-3 text-[13px] text-muted-foreground">
            Locked ones can be unlocked with gems.{" "}
            <Link to="/rewards" className="font-semibold text-primary-text underline">
              See what's available
            </Link>
          </p>
        ) : null}

        <Row label="Mood">
          {COMPANION_EXPRESSIONS.map((e) => (
            <Chip
              key={e.id}
              active={draft.expression === e.id}
              onClick={() => setDraft((prev) => ({ ...prev, expression: e.id }))}
            >
              {e.name}
            </Chip>
          ))}
        </Row>

        <Button
          onClick={() => void commit()}
          disabled={saving}
          className="mt-8 h-14 w-full rounded-2xl bg-hero-gradient text-sm font-semibold shadow-card"
        >
          <Check className="h-4 w-4" /> Save my companion
        </Button>
      </div>
    </PhoneFrame>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  disabled = false,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "min-h-11 rounded-full px-4 py-2 text-xs font-semibold transition-all",
        active ? "bg-primary text-primary-foreground shadow-soft" : "bg-card shadow-soft",
        disabled && "opacity-50",
      )}
    >
      {children}
    </button>
  );
}
