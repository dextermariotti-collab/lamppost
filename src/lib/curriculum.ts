/**
 * The one canonical Lamppost curriculum.
 *
 * Lamppost is a dedicated critical-thinking trainer: there is no open-ended
 * topic generation any more. Everything the app shows — the course map, the
 * home skills graph, reviews — is derived from this single file, so editing
 * the curriculum here changes the whole app.
 */

export type CurriculumUnit = {
  id: string;
  title: string;
  /** One line shown as the region label / graph node caption. */
  blurb: string;
  emoji: string;
};

export type CurriculumLesson = {
  id: string;
  unitId: string;
  title: string;
  /** One-sentence learning objective; also the lesson subtitle in the UI. */
  objective: string;
  /** Lesson ids that should come first. Defaults to the previous lesson. */
  prerequisites: string[];
  emoji: string;
};

/** A real curriculum link between two skills in different units. */
export type CurriculumLink = {
  from: string;
  to: string;
  concept: string;
  detail: string;
};

export const CURRICULUM_SLUG = "critical-thinking";
export const CURRICULUM_TITLE = "Critical thinking";
export const CURRICULUM_TAGLINE = "Seven skills for thinking clearly under pressure.";

export const UNITS: CurriculumUnit[] = [
  {
    id: "claims",
    title: "Claims & assumptions",
    blurb: "Find what is actually being claimed",
    emoji: "🗣️",
  },
  { id: "evidence", title: "Evidence", blurb: "Tell real support from noise", emoji: "🔍" },
  {
    id: "fallacies",
    title: "Logical fallacies",
    blurb: "Name the broken move in an argument",
    emoji: "⚠️",
  },
  {
    id: "biases",
    title: "Cognitive biases",
    blurb: "Catch your own thinking shortcuts",
    emoji: "🧠",
  },
  {
    id: "arguments",
    title: "Building arguments",
    blurb: "Make a case that holds up",
    emoji: "🧱",
  },
  {
    id: "probability",
    title: "Probability & decisions",
    blurb: "Decide well without full information",
    emoji: "🎲",
  },
  {
    id: "media",
    title: "Media & AI literacy",
    blurb: "Read headlines, charts and AI answers",
    emoji: "📰",
  },
];

type Draft = Omit<CurriculumLesson, "prerequisites" | "unitId"> & {
  prerequisites?: string[];
};

const UNIT_LESSONS: Record<string, Draft[]> = {
  claims: [
    {
      id: "claims-the-actual-claim",
      title: "What is actually claimed",
      objective: "Restate any argument's central claim in one precise sentence.",
      emoji: "🎯",
    },
    {
      id: "claims-hidden-assumptions",
      title: "Hidden assumptions",
      objective: "Surface the unstated beliefs an argument needs in order to work.",
      emoji: "🫥",
    },
    {
      id: "claims-facts-opinions-values",
      title: "Facts, opinions, values",
      objective: "Sort a statement into fact, opinion or value judgement before debating it.",
      emoji: "⚖️",
    },
    {
      id: "claims-burden-of-proof",
      title: "Burden of proof",
      objective: "Identify who owes evidence in a disagreement, and how much.",
      emoji: "📐",
    },
    {
      id: "claims-vague-language",
      title: "Vague language",
      objective: "Spot words loose enough to make a claim unfalsifiable.",
      emoji: "🌫️",
    },
  ],
  evidence: [
    {
      id: "evidence-types",
      title: "Types of evidence",
      objective: "Rank the main kinds of evidence by what each one can actually show.",
      emoji: "🧾",
    },
    {
      id: "evidence-anecdote-vs-data",
      title: "Anecdote vs data",
      objective: "Explain what a single vivid story can and cannot establish.",
      emoji: "📖",
    },
    {
      id: "evidence-source-reliability",
      title: "Source reliability",
      objective: "Judge a source by expertise, incentives and track record.",
      emoji: "🏛️",
    },
    {
      id: "evidence-correlation-causation",
      title: "Correlation vs causation",
      objective: "Test whether a claimed cause survives confounders and reverse causation.",
      emoji: "🔗",
    },
    {
      id: "evidence-sample-cherry-picking",
      title: "Samples and cherry-picking",
      objective: "Detect when a sample is too small or selected to flatter a conclusion.",
      emoji: "🍒",
    },
  ],
  fallacies: [
    {
      id: "fallacies-adhominem-strawman",
      title: "Ad hominem and strawman",
      objective: "Tell an attack on a person or a distorted position from a real rebuttal.",
      emoji: "🥊",
    },
    {
      id: "fallacies-dilemma-slippery-slope",
      title: "False dilemma, slippery slope",
      objective: "Spot fake either/or framings and unearned chains of consequence.",
      emoji: "🪜",
    },
    {
      id: "fallacies-authority-popularity",
      title: "Authority and popularity",
      objective: "Separate legitimate expert testimony from appeals to status or crowds.",
      emoji: "👑",
    },
    {
      id: "fallacies-circular-reasoning",
      title: "Circular reasoning",
      objective: "Notice when a conclusion is quietly used as its own premise.",
      emoji: "🔄",
    },
    {
      id: "fallacies-hasty-generalization",
      title: "Hasty generalisation",
      objective: "Catch conclusions drawn from too few or unrepresentative cases.",
      emoji: "⚡",
    },
  ],
  biases: [
    {
      id: "biases-confirmation",
      title: "Confirmation bias",
      objective: "Notice yourself seeking evidence that agrees with you, and correct for it.",
      emoji: "🪞",
    },
    {
      id: "biases-anchoring",
      title: "Anchoring",
      objective: "Recognise how a first number quietly sets your later judgements.",
      emoji: "⚓",
    },
    {
      id: "biases-availability",
      title: "Availability",
      objective: "Adjust for risks that feel common only because they are memorable.",
      emoji: "🚨",
    },
    {
      id: "biases-sunk-cost",
      title: "Sunk cost",
      objective: "Decide from what is ahead rather than what you already spent.",
      emoji: "🕳️",
    },
    {
      id: "biases-overconfidence",
      title: "Overconfidence",
      objective: "Calibrate how sure you are against how often you are right.",
      emoji: "📏",
    },
  ],
  arguments: [
    {
      id: "arguments-premise-conclusion",
      title: "Premise to conclusion",
      objective: "Lay out any argument as explicit premises leading to a conclusion.",
      emoji: "🧩",
    },
    {
      id: "arguments-strong-vs-weak",
      title: "Strong vs weak reasoning",
      objective: "Judge whether premises, if true, would actually support the conclusion.",
      emoji: "💪",
    },
    {
      id: "arguments-steelmanning",
      title: "Steelmanning",
      objective: "State the strongest honest version of a view you disagree with.",
      emoji: "🛡️",
    },
    {
      id: "arguments-counterarguments",
      title: "Counterarguments and rebuttals",
      objective: "Anticipate the best objection and answer it without dodging.",
      emoji: "↔️",
    },
    {
      id: "arguments-qualifying-claims",
      title: "Qualifying claims",
      objective: "State a claim with the scope and confidence the evidence supports.",
      emoji: "✂️",
    },
  ],
  probability: [
    {
      id: "probability-base-rates",
      title: "Base rates",
      objective: "Start from how common something is before weighing specific signals.",
      emoji: "📊",
    },
    {
      id: "probability-expected-value",
      title: "Expected value",
      objective: "Compare options by payoff weighted by probability, not by best case.",
      emoji: "🧮",
    },
    {
      id: "probability-thinking-in-bets",
      title: "Thinking in bets",
      objective: "Judge a decision by its reasoning, not only by how it turned out.",
      emoji: "🃏",
    },
    {
      id: "probability-updating-beliefs",
      title: "Updating on evidence",
      objective: "Move your confidence in proportion to how diagnostic new evidence is.",
      emoji: "🔁",
    },
    {
      id: "probability-second-order",
      title: "Second-order effects",
      objective: "Trace what happens after the obvious first consequence.",
      emoji: "🌊",
    },
  ],
  media: [
    {
      id: "media-headlines-vs-findings",
      title: "Headlines vs findings",
      objective: "Compare what a headline promises with what the study actually found.",
      emoji: "🗞️",
    },
    {
      id: "media-misleading-charts",
      title: "Misleading charts and stats",
      objective: "Spot truncated axes, bad baselines and percentages without denominators.",
      emoji: "📉",
    },
    {
      id: "media-manipulation",
      title: "Spotting manipulation",
      objective: "Recognise emotional framing, selective omission and manufactured urgency.",
      emoji: "🎭",
    },
    {
      id: "media-ai-answers",
      title: "Evaluating AI answers",
      objective: "Check an AI answer for confident fabrication and missing sourcing.",
      emoji: "🤖",
    },
    {
      id: "media-lateral-reading",
      title: "Lateral reading",
      objective: "Leave the page and check what other sources say about it.",
      emoji: "🧭",
    },
  ],
};

/** All 35 lessons in curriculum order, with prerequisites filled in. */
export const LESSONS: CurriculumLesson[] = UNITS.flatMap((unit, unitIndex) => {
  const drafts = UNIT_LESSONS[unit.id] ?? [];
  return drafts.map((draft, lessonIndex) => {
    const previousUnit = UNITS[unitIndex - 1];
    const previous =
      lessonIndex > 0
        ? drafts[lessonIndex - 1]?.id
        : previousUnit
          ? UNIT_LESSONS[previousUnit.id]?.at(-1)?.id
          : undefined;
    return {
      id: draft.id,
      unitId: unit.id,
      title: draft.title,
      objective: draft.objective,
      emoji: draft.emoji,
      prerequisites: draft.prerequisites ?? (previous ? [previous] : []),
    };
  });
});

/**
 * Explicit cross-unit links between related skills. These are curriculum facts,
 * never inferred at runtime — the home graph draws exactly these edges.
 */
export const CROSS_LINKS: CurriculumLink[] = [
  {
    from: "evidence-correlation-causation",
    to: "probability-base-rates",
    concept: "Correlation vs causation ↔ base rates",
    detail:
      "A relationship can look causal purely because the underlying event is common. Base rates tell you how surprising the pattern really is.",
  },
  {
    from: "biases-confirmation",
    to: "evidence-sample-cherry-picking",
    concept: "Confirmation bias ↔ cherry-picking",
    detail:
      "Cherry-picked evidence is what confirmation bias looks like once it reaches the page: the sample was chosen after the conclusion.",
  },
  {
    from: "fallacies-authority-popularity",
    to: "evidence-source-reliability",
    concept: "Appeal to authority ↔ source reliability",
    detail:
      "Judging a source by expertise, incentives and track record is what separates real expert testimony from an appeal to status.",
  },
  {
    from: "media-ai-answers",
    to: "evidence-source-reliability",
    concept: "AI answers ↔ source reliability",
    detail:
      "An AI answer is a source with no track record attached, so the reliability checks matter more, not less.",
  },
  {
    from: "claims-hidden-assumptions",
    to: "arguments-premise-conclusion",
    concept: "Hidden assumptions ↔ premise structure",
    detail:
      "Writing an argument out as premises and a conclusion is the fastest way to expose the assumption nobody stated.",
  },
  {
    from: "biases-anchoring",
    to: "media-misleading-charts",
    concept: "Anchoring ↔ misleading charts",
    detail:
      "A truncated axis or a hand-picked baseline works by anchoring you to a number before you reason about it.",
  },
  {
    from: "biases-sunk-cost",
    to: "probability-expected-value",
    concept: "Sunk cost ↔ expected value",
    detail:
      "Expected value only looks forward, which is exactly why it dissolves sunk-cost reasoning.",
  },
  {
    from: "fallacies-hasty-generalization",
    to: "evidence-sample-cherry-picking",
    concept: "Hasty generalisation ↔ sample size",
    detail:
      "Both fail the same test: too few or unrepresentative cases carrying a conclusion far too wide.",
  },
  {
    from: "probability-updating-beliefs",
    to: "arguments-counterarguments",
    concept: "Updating beliefs ↔ rebuttals",
    detail:
      "Taking a counterargument seriously and updating on evidence are the same skill applied in argument and in judgement.",
  },
  {
    from: "claims-vague-language",
    to: "media-headlines-vs-findings",
    concept: "Vague language ↔ headlines",
    detail:
      "Headlines survive fact-checking by staying vague: 'linked to', 'may', 'up to' all move the claim out of reach.",
  },
  {
    from: "biases-overconfidence",
    to: "arguments-qualifying-claims",
    concept: "Overconfidence ↔ qualifying claims",
    detail:
      "Qualifying a claim to the scope the evidence supports is calibration written down.",
  },
  {
    from: "evidence-anecdote-vs-data",
    to: "biases-availability",
    concept: "Anecdote ↔ availability",
    detail:
      "One vivid story feels like data because availability makes memorable cases feel frequent.",
  },
];

export const unitById = (id: string) => UNITS.find((unit) => unit.id === id) ?? UNITS[0]!;

export const lessonAt = (index: number) => LESSONS[index];

export const lessonIndexOf = (id: string) => LESSONS.findIndex((lesson) => lesson.id === id);

export const TOTAL_LESSONS = LESSONS.length;

export const LESSONS_PER_UNIT = 5;

/** Zero-based index of the next lesson to do, clamped to the last lesson. */
export const nextLessonIndex = (completed: number) =>
  Math.min(Math.max(completed, 0), TOTAL_LESSONS - 1);

export type UnitProgress = {
  unit: CurriculumUnit;
  index: number;
  lessons: CurriculumLesson[];
  completed: number;
  total: number;
  pct: number;
  state: "complete" | "current" | "locked";
};

/** Per-unit completion derived from the learner's real lesson count. */
export function unitProgress(completed: number): UnitProgress[] {
  return UNITS.map((unit, index) => {
    const lessons = LESSONS.filter((lesson) => lesson.unitId === unit.id);
    const start = index * LESSONS_PER_UNIT;
    const done = Math.max(0, Math.min(lessons.length, completed - start));
    const pct = lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0;
    return {
      unit,
      index,
      lessons,
      completed: done,
      total: lessons.length,
      pct,
      state: done === lessons.length ? "complete" : done > 0 || completed >= start ? "current" : "locked",
    };
  });
}

export type UnitLink = CurriculumLink & { fromUnit: string; toUnit: string };

/** Cross links lifted to unit level, for the home skills graph. */
export function unitLinks(): UnitLink[] {
  const unitOf = new Map(LESSONS.map((lesson) => [lesson.id, lesson.unitId]));
  return CROSS_LINKS.flatMap((link) => {
    const fromUnit = unitOf.get(link.from);
    const toUnit = unitOf.get(link.to);
    if (!fromUnit || !toUnit || fromUnit === toUnit) return [];
    return [{ ...link, fromUnit, toUnit }];
  });
}

/** Links that touch a given lesson, for lesson-level context. */
export const linksForLesson = (id: string) =>
  CROSS_LINKS.filter((link) => link.from === id || link.to === id);
