import { z } from "zod";

/**
 * The data behind an interactive lesson step. Every component in
 * `components/steps` takes one of these and nothing else, so a lesson is content, not code.
 *
 * Words matter: the instruction on a step is kept to about 40 words so a screen reads in
 * seconds, and the explanation comes AFTER the learner has tried (`why`), never before.
 */

/** Words in a piece of text, the way the length limits count them. */
export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** The instruction on a step: what to try. */
export const MAX_PROMPT_WORDS = 40;

const id = z.string().min(1).max(40);
const text = (max = 400) => z.string().trim().min(1).max(max);

/** Fields every interactive step carries. */
const base = {
  id,
  /** What to try, in at most 40 words. */
  prompt: text(300),
  /** A nudge for a harder step. Using it costs half the XP. */
  hint: text(240).optional(),
  /** One or two sentences, shown once the learner has it right (or has given up). */
  why: text(320),
};

/** An answer option. `whyNot` names the specific mistake that choosing it reveals. */
const option = z.object({ text: text(200), whyNot: text(280).optional() });
export type StepOption = z.infer<typeof option>;

export const ARGUMENT_ROLES = ["conclusion", "premise", "evidence"] as const;
export type ArgumentRole = (typeof ARGUMENT_ROLES)[number];

/** 1. Tap the phrase that contains the flaw. */
export const flawStep = z.object({
  ...base,
  kind: z.literal("flaw"),
  /** The passage in reading order. Only `tappable` phrases can be chosen. */
  passage: z
    .array(
      z.object({
        text: text(200),
        tappable: z.boolean().optional(),
        flaw: z.boolean().optional(),
        /** Why THIS phrase isn't the flaw. */
        whyNot: text(280).optional(),
      }),
    )
    .min(2)
    .max(24),
  /** The name of the mistake, shown on the reveal. */
  fallacy: text(60),
});

/** 2. Build the argument map: put premises, evidence and the conclusion where they belong. */
export const builderStep = z.object({
  ...base,
  kind: z.literal("builder"),
  /** The places in the map, top to bottom. One conclusion; the rest support it. */
  slots: z
    .array(z.object({ id, role: z.enum(ARGUMENT_ROLES), label: text(40) }))
    .min(2)
    .max(5),
  /** `role: null` marks a piece that belongs nowhere (it doesn't support anything). */
  pieces: z
    .array(
      z.object({
        id,
        text: text(200),
        role: z.enum(ARGUMENT_ROLES).nullable(),
        /** Extra explanation when it is put in the wrong kind of place. */
        note: text(240).optional(),
      }),
    )
    .min(2)
    .max(7),
});

/** 3. Drag claims into buckets. */
export const sortStep = z.object({
  ...base,
  kind: z.literal("sort"),
  buckets: z
    .array(z.object({ id, label: text(30), hint: text(80).optional() }))
    .min(2)
    .max(4),
  items: z
    .array(z.object({ id, text: text(200), bucket: id, why: text(240) }))
    .min(3)
    .max(6),
});

/** 4. Choose, then say how sure you are BEFORE the answer is shown. */
export const confidenceStep = z.object({
  ...base,
  kind: z.literal("confidence"),
  question: text(300),
  options: z.array(option).min(2).max(4),
  correct: z.number().int().min(0),
});

/** 5. Two arguments side by side; pick the stronger, then see the deciding factor. */
export const strongerStep = z.object({
  ...base,
  kind: z.literal("stronger"),
  a: text(300),
  b: text(300),
  stronger: z.enum(["a", "b"]),
  /** The one thing that decides it, in a few words. */
  factor: text(80),
  /** What is wrong with the weaker one specifically; shown if it is picked. */
  weakerWhy: text(280),
});

/** 6. Reveal evidence cards one at a time and watch the probability move. */
export const updaterStep = z.object({
  ...base,
  kind: z.literal("updater"),
  claim: text(200),
  /** How likely the claim looks at the start, 5-95. */
  prior: z.number().int().min(5).max(95),
  cards: z
    .array(
      z.object({
        id,
        text: text(240),
        /** Percentage points the probability moves. 0 means the card changes nothing. */
        shift: z.number().int().min(-40).max(40),
        note: text(280),
      }),
    )
    .min(2)
    .max(5),
});

/** 7. A chart where switching on a hidden variable changes the picture. */
export const causeStep = z.object({
  ...base,
  kind: z.literal("cause"),
  scenario: text(240),
  xLabel: text(40),
  yLabel: text(40),
  /** The variable that isn't on the chart. */
  hiddenLabel: text(40),
  groups: z
    .array(
      z.object({
        id,
        label: text(40),
        points: z
          .array(z.tuple([z.number(), z.number()]))
          .min(4)
          .max(14),
      }),
    )
    .min(2)
    .max(3),
  question: text(200),
  options: z.array(option).min(2).max(4),
  correct: z.number().int().min(0),
});

/** 8. Pick the missing assumption that makes the argument work. */
export const gapStep = z.object({
  ...base,
  kind: z.literal("gap"),
  /** "Because ...". */
  reason: text(240),
  /** "..., so ...". */
  conclusion: text(240),
  options: z.array(option).min(2).max(4),
  correct: z.number().int().min(0),
});

/** A plain question with a stimulus, for the few places none of the above fits. */
export const choiceStep = z.object({
  ...base,
  kind: z.literal("choice"),
  stimulus: text(360).optional(),
  options: z.array(option).min(2).max(4),
  correct: z.number().int().min(0),
});

/** A short text card. The only step that asks nothing of the learner. */
export const noteStep = z.object({
  id,
  kind: z.literal("note"),
  prompt: text(300),
});

export const stepSchema = z.discriminatedUnion("kind", [
  flawStep,
  builderStep,
  sortStep,
  confidenceStep,
  strongerStep,
  updaterStep,
  causeStep,
  gapStep,
  choiceStep,
  noteStep,
]);

export type FlawStep = z.infer<typeof flawStep>;
export type BuilderStep = z.infer<typeof builderStep>;
export type SortStep = z.infer<typeof sortStep>;
export type ConfidenceStep = z.infer<typeof confidenceStep>;
export type StrongerStep = z.infer<typeof strongerStep>;
export type UpdaterStep = z.infer<typeof updaterStep>;
export type CauseStep = z.infer<typeof causeStep>;
export type GapStep = z.infer<typeof gapStep>;
export type ChoiceStep = z.infer<typeof choiceStep>;
export type NoteStep = z.infer<typeof noteStep>;
export type LessonStep = z.infer<typeof stepSchema>;
export type StepKind = LessonStep["kind"];

/** Every step except the text card asks the learner to do something. */
export const isInteractive = (step: LessonStep) => step.kind !== "note";

/**
 * Rules that span fields, which a per-field schema can't express. Returns what is wrong, in
 * words; an empty list means the step is well formed.
 */
export function stepProblems(step: LessonStep): string[] {
  const problems: string[] = [];
  const instruction = wordCount(step.prompt);
  if (instruction > MAX_PROMPT_WORDS) {
    problems.push(`instruction is ${instruction} words; the limit is ${MAX_PROMPT_WORDS}`);
  }
  switch (step.kind) {
    case "flaw": {
      if (step.passage.filter((p) => p.flaw).length !== 1)
        problems.push("exactly one phrase is the flaw");
      if (step.passage.some((p) => p.flaw && !p.tappable))
        problems.push("the flaw must be tappable");
      if (step.passage.filter((p) => p.tappable).length < 3)
        problems.push("offer at least three phrases");
      break;
    }
    case "builder": {
      const conclusions = step.slots.filter((s) => s.role === "conclusion").length;
      if (conclusions !== 1) problems.push("exactly one conclusion slot");
      for (const role of ARGUMENT_ROLES) {
        const slots = step.slots.filter((s) => s.role === role).length;
        const pieces = step.pieces.filter((p) => p.role === role).length;
        if (pieces !== slots)
          problems.push(`${slots} ${role} slot(s) but ${pieces} ${role} piece(s)`);
      }
      if (new Set(step.slots.map((s) => s.id)).size !== step.slots.length)
        problems.push("duplicate slot ids");
      if (new Set(step.pieces.map((p) => p.id)).size !== step.pieces.length)
        problems.push("duplicate piece ids");
      break;
    }
    case "sort": {
      const ids = new Set(step.buckets.map((b) => b.id));
      if (step.items.some((item) => !ids.has(item.bucket)))
        problems.push("an item belongs to no bucket");
      if (step.buckets.some((b) => !step.items.some((item) => item.bucket === b.id))) {
        problems.push("a bucket no item belongs in");
      }
      if (new Set(step.items.map((i) => i.id)).size !== step.items.length)
        problems.push("duplicate item ids");
      break;
    }
    case "confidence":
    case "gap":
    case "choice":
    case "cause": {
      if (step.correct >= step.options.length) problems.push("correct is not one of the options");
      const wrong = step.options.filter((_, i) => i !== step.correct);
      if (wrong.some((o) => !o.whyNot)) problems.push("every wrong option needs a whyNot");
      break;
    }
    case "stronger":
      break;
    case "updater": {
      if (new Set(step.cards.map((c) => c.id)).size !== step.cards.length)
        problems.push("duplicate card ids");
      if (!step.cards.some((c) => c.shift > 0) || !step.cards.some((c) => c.shift < 0)) {
        problems.push("show at least one card that raises and one that lowers");
      }
      break;
    }
    case "note":
      break;
  }
  return problems;
}

/** What a lesson is: its steps in order, the closing writing task and a line to carry away. */
export const lessonScriptSchema = z.object({
  lessonId: z.string().min(1),
  steps: z.array(stepSchema).min(5).max(11),
  /** One sentence to take away, shown on the summary. */
  takeaway: text(200),
  written: z.object({
    prompt: text(300),
    passage: text(700),
    guidance: text(240).optional(),
  }),
});
export type LessonScript = z.infer<typeof lessonScriptSchema>;
