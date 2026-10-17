import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { useCompanion } from "@/lib/companion-store";
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
          "Choose the companion who trains with you and set their color, accessory and mood.",
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
      <ScreenHeader
        title="Your companion"
        description={`${presetById(draft.preset).name} — ${presetById(draft.preset).blurb}`}
        backTo="/profile"
      />
      <div className="flex min-h-full flex-col px-5 pb-8">
        <div className="flex flex-col items-center rounded-3xl bg-card p-4 shadow-soft">
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

        <Row label="Color">
          {COMPANION_PALETTES.map((p) => (
            <button
              key={p.id}
              onClick={() => setDraft((prev) => ({ ...prev, palette: p.id }))}
              aria-label={p.name}
              aria-pressed={draft.palette === p.id}
              className={cn(
                "relative flex h-11 w-11 items-center justify-center rounded-full transition-transform",
                draft.palette === p.id
                  ? "scale-105 ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "hover:scale-105",
              )}
              style={{ background: paletteById(p.id).base }}
            />
          ))}
        </Row>

        <Row label="Accessory">
          {COMPANION_ACCESSORIES.map((a) => (
            <Chip
              key={a.id}
              active={draft.accessory === a.id}
              onClick={() => setDraft((prev) => ({ ...prev, accessory: a.id }))}
            >
              {a.name}
            </Chip>
          ))}
        </Row>

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
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-11 rounded-sm px-4 py-2 text-xs font-semibold transition-all",
        active ? "bg-primary text-primary-foreground shadow-soft" : "bg-card shadow-soft",
      )}
    >
      {children}
    </button>
  );
}
