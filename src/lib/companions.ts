/**
 * Companion character system.
 *
 * Presets, palettes, accessories and expressions are plain data so new options
 * (including future unlockables) can be added without touching the renderer,
 * the onboarding UI, or the saved shape in the database.
 */

export type CompanionSpecies = "fox" | "cat" | "owl" | "bear" | "bunny" | "bot";

export type CompanionPreset = {
  id: string;
  name: string;
  blurb: string;
  species: CompanionSpecies;
  /** Palette used when the preset is first picked. */
  defaultPalette: string;
  defaultAccessory: string;
  defaultExpression: string;
};

export type CompanionPalette = {
  id: string;
  name: string;
  /** Main body colour. */
  base: string;
  /** Belly / muzzle / inner-ear colour. */
  soft: string;
  /** Accent used for accessories and details. */
  accent: string;
};

export type CompanionAccessory = { id: string; name: string };
export type CompanionExpression = { id: string; name: string };

export const COMPANION_PRESETS: CompanionPreset[] = [
  {
    id: "scout",
    name: "Scout",
    blurb: "Curious and a little chaotic.",
    species: "fox",
    defaultPalette: "ember",
    defaultAccessory: "none",
    defaultExpression: "happy",
  },
  {
    id: "sage",
    name: "Sage",
    blurb: "Patient, asks the deeper question.",
    species: "owl",
    defaultPalette: "plum",
    defaultAccessory: "glasses",
    defaultExpression: "calm",
  },
  {
    id: "pip",
    name: "Pip",
    blurb: "Small, fast, relentlessly cheerful.",
    species: "bunny",
    defaultPalette: "mint",
    defaultAccessory: "none",
    defaultExpression: "excited",
  },
  {
    id: "nimbus",
    name: "Nimbus",
    blurb: "Quiet observer with sharp instincts.",
    species: "cat",
    defaultPalette: "sky",
    defaultAccessory: "scarf",
    defaultExpression: "calm",
  },
  {
    id: "moss",
    name: "Moss",
    blurb: "Steady, warm, never in a rush.",
    species: "bear",
    defaultPalette: "sun",
    defaultAccessory: "hat",
    defaultExpression: "happy",
  },
  {
    id: "byte",
    name: "Byte",
    blurb: "Over-prepared and proud of it.",
    species: "bot",
    defaultPalette: "lavender",
    defaultAccessory: "none",
    defaultExpression: "excited",
  },
];

export const COMPANION_PALETTES: CompanionPalette[] = [
  { id: "lavender", name: "Lavender", base: "#8b7bf0", soft: "#ece7ff", accent: "#f5b53d" },
  { id: "ember", name: "Ember", base: "#f08a4b", soft: "#fff0e2", accent: "#7a5cf0" },
  { id: "mint", name: "Mint", base: "#4fc4a1", soft: "#e6fbf4", accent: "#f0715f" },
  { id: "sky", name: "Sky", base: "#5aa9f0", soft: "#e7f2ff", accent: "#f5b53d" },
  { id: "plum", name: "Plum", base: "#a05ac2", soft: "#f6e9fb", accent: "#63d2b4" },
  { id: "sun", name: "Sunbeam", base: "#f0b93d", soft: "#fff6e0", accent: "#7a5cf0" },
  { id: "ocean", name: "Ocean", base: "#3b7fd9", soft: "#e3eefc", accent: "#f5b53d" },
  { id: "rose", name: "Rose", base: "#d9557f", soft: "#fde7ee", accent: "#4fc4a1" },
];

export const COMPANION_ACCESSORIES: CompanionAccessory[] = [
  { id: "none", name: "No accessory" },
  { id: "hat", name: "Little hat" },
  { id: "glasses", name: "Round glasses" },
  { id: "scarf", name: "Cosy scarf" },
  { id: "headphones", name: "Headphones" },
  { id: "bow", name: "Bow" },
  { id: "crown", name: "Little crown" },
];

export const COMPANION_EXPRESSIONS: CompanionExpression[] = [
  { id: "happy", name: "Happy" },
  { id: "excited", name: "Excited" },
  { id: "calm", name: "Calm" },
  { id: "wink", name: "Wink" },
];

/** Saved shape — one field per decision so it stays readable and extensible. */
export type Companion = {
  preset: string;
  palette: string;
  accessory: string;
  expression: string;
};

export const DEFAULT_COMPANION: Companion = {
  preset: "scout",
  palette: "ember",
  accessory: "none",
  expression: "happy",
};

export const presetById = (id: string) =>
  COMPANION_PRESETS.find((p) => p.id === id) ?? COMPANION_PRESETS[0]!;

export const paletteById = (id: string) =>
  COMPANION_PALETTES.find((p) => p.id === id) ?? COMPANION_PALETTES[0]!;

/** Keeps unknown / future values from breaking the renderer. */
type CompanionInput = { [K in keyof Companion]?: string | null | undefined };

export function normalizeCompanion(input: CompanionInput | null | undefined): Companion {
  const preset = COMPANION_PRESETS.find((p) => p.id === input?.preset);
  if (!preset) return DEFAULT_COMPANION;
  return {
    preset: preset.id,
    palette: COMPANION_PALETTES.some((p) => p.id === input?.palette)
      ? input!.palette!
      : preset.defaultPalette,
    accessory: COMPANION_ACCESSORIES.some((a) => a.id === input?.accessory)
      ? input!.accessory!
      : preset.defaultAccessory,
    expression: COMPANION_EXPRESSIONS.some((e) => e.id === input?.expression)
      ? input!.expression!
      : preset.defaultExpression,
  };
}

export const companionFromPreset = (presetId: string): Companion => {
  const p = presetById(presetId);
  return {
    preset: p.id,
    palette: p.defaultPalette,
    accessory: p.defaultAccessory,
    expression: p.defaultExpression,
  };
};

export const companionName = (companion: Companion) => presetById(companion.preset).name;
