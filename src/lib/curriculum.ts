/**
 * The one canonical Lamppost curriculum.
 *
 * Lamppost is a dedicated critical-thinking trainer: there is no open-ended
 * topic generation any more. Everything the app shows — the course map, the
 * home skills graph, reviews — is derived from this single file, so editing
 * the curriculum here changes the whole app.
 */

import type { ExerciseKind, WrittenTaskType } from "./exercises";

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
  /**
   * The lesson spine. `keyIdea` is the one thing the lesson teaches and `trap`
   * is the specific mistake every drill must actually test. Both are fed into
   * generation AND validation, so drills stop drifting into generic
   * "find the claim" territory.
   */
  keyIdea: string;
  trap: string;
  /**
   * The only drill types that fit this objective, in the order they are shown:
   * 4–5 of them, all different (see drill-plan.ts). Generation never invents a
   * drill type outside this list — a lesson about naming claims must not be asked
   * to rank evidence, and rank-the-evidence only appears where there is real
   * evidence for a stated claim.
   */
  drills: ExerciseKind[];
  /** Which closing written task this objective calls for. */
  written: WrittenTaskType;
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
      drills: ["claim", "highlight", "flaw", "judge", "rewrite"],
      written: "restate",
      title: "What is actually claimed",
      objective: "Restate any argument's central claim in one precise sentence.",
      keyIdea:
        "The central claim is the thing everything else is offered in support of — not necessarily the last or loudest sentence, and sometimes never stated outright.",
      trap: "Learners pick the most emotional sentence, the final sentence, or a premise, instead of the conclusion the passage wants accepted. Vary where the claim sits, and sometimes leave it implied.",
      emoji: "🎯",
    },
    {
      id: "claims-hidden-assumptions",
      drills: ["assumption", "flaw", "judge", "steelman"],
      written: "critique",
      title: "Hidden assumptions",
      objective: "Surface the unstated beliefs an argument needs in order to work.",
      keyIdea:
        "An assumption is the unstated bridge between the evidence given and the conclusion drawn; remove it and the argument collapses.",
      trap: "Learners choose a statement that is merely plausible or agreeable rather than load-bearing. Distractors should be believable but survivable.",
      emoji: "🫥",
    },
    {
      id: "claims-facts-opinions-values",
      drills: ["sort", "judge", "highlight", "rewrite"],
      written: "critique",
      title: "Facts, opinions, values",
      objective: "Sort a statement into fact, opinion or value judgment before debating it.",
      keyIdea:
        "A factual claim can be checked, an opinion reports a preference, and a value claim says what ought to matter — 'should' claims can never be settled by data alone.",
      trap: "Real sentences mix types in one breath ('the policy cut delays by 9%, so it was the right call'). Use borderline items and sentences that need splitting.",
      emoji: "⚖️",
    },
    {
      id: "claims-burden-of-proof",
      drills: ["claim", "flaw", "judge", "assumption"],
      written: "critique",
      title: "Burden of proof",
      objective: "Identify who owes evidence in a disagreement, and how much.",
      keyIdea:
        "Whoever makes the claim owes the support; 'you can't disprove it' is not evidence, and an unusual claim owes more than an ordinary one.",
      trap: "Learners accept a shifted burden ('prove it doesn't work'). Ask who owes evidence here and how much, not just what is wrong.",
      emoji: "📐",
    },
    {
      id: "claims-vague-language",
      drills: ["highlight", "rewrite", "judge", "flaw"],
      written: "testable",
      title: "Vague language",
      objective: "Spot words loose enough to make a claim unfalsifiable.",
      keyIdea:
        "Weasel words — up to, may, linked to, supports, helps — leave a claim with no result that could ever count as failure.",
      trap: "Learners sense the claim is slippery but cannot point at the word doing it, or accept a rewrite that is merely stronger rather than testable.",
      emoji: "🌫️",
    },
  ],
  evidence: [
    {
      id: "evidence-types",
      drills: ["rank", "judge", "flaw", "assumption"],
      written: "critique",
      title: "Types of evidence",
      objective: "Rank the main kinds of evidence by what each one can actually show.",
      keyIdea:
        "Evidence strength is how well it rules out other explanations: randomized experiment beats cohort study, which beats survey, which beats expert opinion, which beats anecdote.",
      trap: "Learners rank by how convincing the wording sounds. Every item must be checkable evidence, never a restated claim.",
      emoji: "🧾",
    },
    {
      id: "evidence-anecdote-vs-data",
      drills: ["flaw", "rank", "predict", "judge"],
      written: "case",
      title: "Anecdote vs data",
      objective: "Explain what a single vivid story can and cannot establish.",
      keyIdea:
        "One vivid case proves something can happen; it says nothing about how often, and it beats base rates in our attention every time.",
      trap: "Learners treat a striking story as refuting an average. Make the anecdote genuinely compelling.",
      emoji: "📖",
    },
    {
      id: "evidence-source-reliability",
      drills: ["rank", "highlight", "judge", "flaw"],
      written: "critique",
      title: "Source reliability",
      objective: "Judge a source by expertise, incentives and track record.",
      keyIdea:
        "Four questions decide a source: relevant expertise, who pays, what they got right before, and whether anyone independent agrees.",
      trap: "Learners judge on tone or prestige. Include a well-credentialed source with an obvious incentive problem.",
      emoji: "🏛️",
    },
    {
      id: "evidence-correlation-causation",
      drills: ["judge", "flaw", "assumption", "predict", "rewrite"],
      written: "critique",
      title: "Correlation vs causation",
      objective: "Test whether a claimed cause survives confounders and reverse causation.",
      keyIdea:
        "Before accepting A caused B, check three rivals: a common cause, the reverse direction, and plain coincidence.",
      trap: "Learners say 'correlation isn't causation' without naming which rival explanation applies here. Ask for the specific alternative.",
      emoji: "🔗",
    },
    {
      id: "evidence-sample-cherry-picking",
      drills: ["judge", "flaw", "rank", "highlight"],
      written: "critique",
      title: "Samples and cherry-picking",
      objective: "Detect when a sample is too small or selected to flatter a conclusion.",
      keyIdea:
        "Who got counted decides what the number means: small samples swing wildly, self-selected ones tilt, and survivors are the only ones left to ask.",
      trap: "Learners focus on sample size only. Include selective reporting and survivorship, and make the better sample the less flattering one.",
      emoji: "🍒",
    },
  ],
  fallacies: [
    {
      id: "fallacies-adhominem-strawman",
      drills: ["judge", "flaw", "steelman", "rewrite"],
      written: "critique",
      title: "Ad hominem and strawman",
      objective: "Tell an attack on a person or a distorted position from a real rebuttal.",
      keyIdea:
        "A rebuttal engages the argument as stated; ad hominem swaps in the person, strawman swaps in an easier version of the claim.",
      trap: "Learners label any harsh reply a fallacy. Include a blunt but legitimate rebuttal, and a distortion subtle enough to need checking against the original.",
      emoji: "🥊",
    },
    {
      id: "fallacies-dilemma-slippery-slope",
      drills: ["highlight", "judge", "flaw", "rewrite"],
      written: "critique",
      title: "False dilemma, slippery slope",
      objective: "Spot fake either/or framings and unearned chains of consequence.",
      keyIdea:
        "A false dilemma hides the third option; a slippery slope asserts a chain of steps without supporting any link in it.",
      trap: "Learners reject every chain argument. Some slopes are real and supported — the fault is unsupported links, not length.",
      emoji: "🪜",
    },
    {
      id: "fallacies-authority-popularity",
      drills: ["judge", "flaw", "assumption", "rank"],
      written: "critique",
      title: "Authority and popularity",
      objective: "Separate legitimate expert testimony from appeals to status or crowds.",
      keyIdea:
        "Citing relevant expert consensus is good reasoning; citing fame, confidence or headcount is not.",
      trap: "Learners treat every citation of an expert as a fallacy. Half the items should be legitimate.",
      emoji: "👑",
    },
    {
      id: "fallacies-circular-reasoning",
      drills: ["flaw", "judge", "highlight", "rewrite"],
      written: "critique",
      title: "Circular reasoning",
      objective: "Notice when a conclusion is quietly used as its own premise.",
      keyIdea:
        "Circular arguments restate the conclusion in different words and call it support, so no new reason ever arrives.",
      trap: "Learners miss it when the restatement uses synonyms. Have them point at the repeated step.",
      emoji: "🔄",
    },
    {
      id: "fallacies-hasty-generalization",
      drills: ["judge", "flaw", "rank", "predict"],
      written: "critique",
      title: "Hasty generalization",
      objective: "Catch conclusions drawn from too few or unrepresentative cases.",
      keyIdea:
        "A general rule needs enough cases, chosen in a way that could have shown the rule false.",
      trap: "Learners flag any generalization. Include one properly supported general claim to be left alone.",
      emoji: "⚡",
    },
  ],
  biases: [
    {
      id: "biases-confirmation",
      drills: ["highlight", "judge", "flaw", "predict", "slider"],
      written: "steelmanWrite",
      title: "Confirmation bias",
      objective: "Notice yourself seeking evidence that agrees with you, and correct for it.",
      keyIdea:
        "The correcting question is 'what would show me I'm wrong?' — the useful test is the one that could fail.",
      trap: "Learners pick the test most likely to confirm. The keyed option should be the disconfirming check, and it should feel less satisfying.",
      emoji: "🪞",
    },
    {
      id: "biases-anchoring",
      drills: ["numeric", "judge", "flaw", "predict"],
      written: "critique",
      title: "Anchoring",
      objective: "Recognize how a first number quietly sets your later judgments.",
      keyIdea:
        "The first number mentioned drags every later estimate toward it, even when it is arbitrary and known to be arbitrary.",
      trap: "Learners believe they are immune. Have them estimate with an anchor present, then compare against what the numbers actually support.",
      emoji: "⚓",
    },
    {
      id: "biases-availability",
      drills: ["predict", "judge", "numeric", "flaw"],
      written: "critique",
      title: "Availability",
      objective: "Adjust for risks that feel common only because they are memorable.",
      keyIdea:
        "Ease of recall is not frequency: vivid, recent and heavily covered events feel far more common than they are.",
      trap: "Only use base-rate comparisons that are genuinely well established, or clearly hypothetical figures.",
      emoji: "🚨",
    },
    {
      id: "biases-sunk-cost",
      drills: ["judge", "flaw", "predict", "numeric"],
      written: "case",
      title: "Sunk cost",
      objective: "Decide from what is ahead rather than what you already spent.",
      keyIdea:
        "Money and time already spent are gone either way; only the remaining costs and benefits can change the right choice.",
      trap: "Learners honor the investment. Make quitting feel wasteful but correct.",
      emoji: "🕳️",
    },
    {
      id: "biases-overconfidence",
      drills: ["predict", "slider", "judge", "flaw"],
      written: "critique",
      title: "Overconfidence",
      objective: "Calibrate how sure you are against how often you are right.",
      keyIdea: "Being 90% sure should mean being right about nine times in ten, no more, no less.",
      trap: "Learners state high confidence out of habit. Use items where the honest answer is genuinely uncertain.",
      emoji: "📏",
    },
  ],
  arguments: [
    {
      id: "arguments-premise-conclusion",
      drills: ["claim", "order", "assumption", "judge", "flaw"],
      written: "case",
      title: "Premise to conclusion",
      objective: "Lay out any argument as explicit premises leading to a conclusion.",
      keyIdea:
        "Mapping an argument means saying what supports what: premises first, each doing a job, conclusion last.",
      trap: "Learners order by how the text reads rather than by what supports what. Include one card that is background, not support.",
      emoji: "🧩",
    },
    {
      id: "arguments-strong-vs-weak",
      drills: ["rank", "flaw", "judge", "assumption"],
      written: "critique",
      title: "Strong vs weak reasoning",
      objective: "Judge whether premises, if true, would actually support the conclusion.",
      keyIdea:
        "Support has two tests: relevance (does it bear on the claim?) and sufficiency (is there enough of it?).",
      trap: "Learners rate arguments they agree with as strong. Make the strongest argument reach an unpopular conclusion.",
      emoji: "💪",
    },
    {
      id: "arguments-steelmanning",
      drills: ["steelman", "rewrite", "judge", "flaw"],
      written: "steelmanWrite",
      title: "Steelmanning",
      objective: "State the strongest honest version of a view you disagree with.",
      keyIdea:
        "The strongest version uses the best reasons available for that view, stated so its own supporters would nod.",
      trap: "Learners pick the most polite version rather than the strongest, or one that quietly changes the position.",
      emoji: "🛡️",
    },
    {
      id: "arguments-counterarguments",
      drills: ["judge", "steelman", "rewrite", "assumption"],
      written: "case",
      title: "Counterarguments and rebuttals",
      objective: "Anticipate the best objection and answer it without dodging.",
      keyIdea:
        "A real rebuttal answers the strongest objection on its own terms; anything else changes the subject.",
      trap: "Learners pick the easiest objection to knock down, or a rebuttal that restates the original claim louder.",
      emoji: "↔️",
    },
    {
      id: "arguments-qualifying-claims",
      drills: ["highlight", "rewrite", "judge", "slider"],
      written: "testable",
      title: "Qualifying claims",
      objective: "State a claim with the scope and confidence the evidence supports.",
      keyIdea:
        "Most, often, in this group, under these conditions — qualifiers are what make a claim defensible rather than weak.",
      trap: "Learners treat hedging and qualifying as the same thing. Qualified means scoped to the evidence; hedged means unfalsifiable.",
      emoji: "✂️",
    },
  ],
  probability: [
    {
      id: "probability-base-rates",
      drills: ["numeric", "predict", "judge", "flaw", "slider"],
      written: "critique",
      title: "Base rates",
      objective: "Start from how common something is before weighing specific signals.",
      keyIdea:
        "With a rare condition, even an accurate test produces mostly false positives — the base rate does most of the work.",
      trap: "Learners answer with the test's accuracy. Use computable numbers and show the working.",
      emoji: "📊",
    },
    {
      id: "probability-expected-value",
      drills: ["numeric", "judge", "predict", "flaw"],
      written: "case",
      title: "Expected value",
      objective: "Compare options by payoff weighted by probability, not by best case.",
      keyIdea:
        "Expected value is each outcome's payoff times its probability, added up — compare options on that, not on the best case.",
      trap: "Learners pick the biggest possible win. Make the higher-EV option the duller one.",
      emoji: "🧮",
    },
    {
      id: "probability-thinking-in-bets",
      drills: ["judge", "slider", "predict", "flaw"],
      written: "critique",
      title: "Thinking in bets",
      objective: "Judge a decision by its reasoning, not only by how it turned out.",
      keyIdea:
        "Good decisions can lose and bad ones can win; separate the quality of the reasoning from the luck of the outcome.",
      trap: "Learners grade by result. Include a bad decision that worked out well.",
      emoji: "🃏",
    },
    {
      id: "probability-updating-beliefs",
      drills: ["slider", "judge", "rank", "numeric"],
      written: "critique",
      title: "Updating on evidence",
      objective: "Move your confidence in proportion to how diagnostic new evidence is.",
      keyIdea:
        "Strong, hard-to-fake evidence should move you a lot; weak or expected evidence should barely move you at all.",
      trap: "Learners either refuse to move or swing to certainty. Judge direction and size of the move.",
      emoji: "🔁",
    },
    {
      id: "probability-second-order",
      drills: ["predict", "order", "judge", "flaw"],
      written: "case",
      title: "Second-order effects",
      objective: "Trace what happens after the obvious first consequence.",
      keyIdea:
        "Ask 'and then what?': people respond to the change, and the response is often bigger than the change.",
      trap: "Learners stop at the intended effect. The keyed answer is the knock-on nobody planned.",
      emoji: "🌊",
    },
  ],
  media: [
    {
      id: "media-headlines-vs-findings",
      drills: ["highlight", "judge", "rewrite", "flaw"],
      written: "testable",
      title: "Headlines vs findings",
      objective: "Compare what a headline promises with what the study actually found.",
      keyIdea:
        "Headlines overstate by dropping conditions and by reporting relative change where the absolute change is tiny.",
      trap: "Learners accept a headline that is technically true but misleading. Include relative-vs-absolute risk.",
      emoji: "🗞️",
    },
    {
      id: "media-misleading-charts",
      drills: ["chart", "numeric", "judge", "flaw", "highlight"],
      written: "critique",
      title: "Misleading charts and stats",
      objective: "Spot truncated axes, bad baselines and percentages without denominators.",
      keyIdea:
        "The trick is usually in the axis or the window: a truncated axis, a hand-picked start date, or percent confused with percentage points.",
      trap: "Learners read the shape, not the axis. Give real data and let the drawing mislead.",
      emoji: "📉",
    },
    {
      id: "media-manipulation",
      drills: ["highlight", "judge", "flaw", "rewrite"],
      written: "critique",
      title: "Spotting manipulation",
      objective: "Recognize emotional framing, selective omission and manufactured urgency.",
      keyIdea:
        "Urgency, outrage and false scarcity are used to stop you checking; the tell is pressure without new information.",
      trap: "Learners flag strong feeling itself. Some passages are emotive and honest.",
      emoji: "🎭",
    },
    {
      id: "media-ai-answers",
      drills: ["highlight", "judge", "flaw", "rank"],
      written: "critique",
      title: "Evaluating AI answers",
      objective: "Check an AI answer for confident fabrication and missing sourcing.",
      keyIdea:
        "Fluent is not correct: the parts to check are specific numbers, named sources and confident claims with no support.",
      trap: "Learners judge by how authoritative it sounds. Bury one unsupported part in an otherwise sound answer.",
      emoji: "🤖",
    },
    {
      id: "media-lateral-reading",
      drills: ["order", "judge", "flaw", "assumption"],
      written: "case",
      title: "Lateral reading",
      objective: "Leave the page and check what other sources say about it.",
      keyIdea:
        "Don't read the page harder — leave it and ask who is behind the claim and what independent sources say.",
      trap: "Learners start with the page's own about section. Ordering should put leaving the page first.",
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
      keyIdea: draft.keyIdea,
      trap: draft.trap,
      drills: draft.drills,
      written: draft.written,
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
    concept: "Hasty generalization ↔ sample size",
    detail:
      "Both fail the same test: too few or unrepresentative cases carrying a conclusion far too wide.",
  },
  {
    from: "probability-updating-beliefs",
    to: "arguments-counterarguments",
    concept: "Updating beliefs ↔ rebuttals",
    detail:
      "Taking a counterargument seriously and updating on evidence are the same skill applied in argument and in judgment.",
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
    detail: "Qualifying a claim to the scope the evidence supports is calibration written down.",
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

/**
 * Where each unit's lessons sit in `LESSONS`. Read from the lessons themselves, so a unit can
 * gain or lose a lesson without any position arithmetic changing.
 */
const UNIT_SPANS = UNITS.map((unit) => ({
  start: LESSONS.findIndex((lesson) => lesson.unitId === unit.id),
  count: LESSONS.filter((lesson) => lesson.unitId === unit.id).length,
}));

/** Where a lesson sits on its line: its unit's index, and "stop n of m". */
export function lessonPlace(index: number): { unitIndex: number; stop: number; stops: number } {
  const found = UNIT_SPANS.findIndex(
    (span) => index >= span.start && index < span.start + span.count,
  );
  const unitIndex = Math.max(0, found);
  const span = UNIT_SPANS[unitIndex]!;
  return { unitIndex, stop: Math.max(0, index - span.start) + 1, stops: span.count };
}

/**
 * Zero-based index of the lesson to suggest next: the first one not finished, or the last
 * lesson once everything is. The order is a suggestion; any lesson can be started.
 */
export function nextLessonIndex(done: ReadonlySet<number>): number {
  for (let i = 0; i < TOTAL_LESSONS; i++) if (!done.has(i)) return i;
  return TOTAL_LESSONS - 1;
}

export type UnitProgress = {
  unit: CurriculumUnit;
  index: number;
  lessons: CurriculumLesson[];
  completed: number;
  total: number;
  pct: number;
  /** "current" is where the learner is working; every other unit is open to start. */
  state: "complete" | "current" | "open";
};

/** Per-unit completion derived from the lessons the learner has really finished. */
export function unitProgress(done: ReadonlySet<number>): UnitProgress[] {
  const next = nextLessonIndex(done);
  return UNITS.map((unit, index) => {
    const lessons = LESSONS.filter((lesson) => lesson.unitId === unit.id);
    const { start } = UNIT_SPANS[index]!;
    const finished = lessons.filter((_, i) => done.has(start + i)).length;
    const pct = lessons.length > 0 ? Math.round((finished / lessons.length) * 100) : 0;
    const holdsNext = next >= start && next < start + lessons.length;
    return {
      unit,
      index,
      lessons,
      completed: finished,
      total: lessons.length,
      pct,
      state:
        finished === lessons.length ? "complete" : finished > 0 || holdsNext ? "current" : "open",
    };
  });
}

/**
 * Where to send someone who opens a unit: its first lesson they haven't finished, or its first
 * lesson to go back over once they all are.
 */
export function unitEntryIndex(unitIndex: number, done: ReadonlySet<number>): number {
  const { start, count } = UNIT_SPANS[unitIndex] ?? { start: 0, count: 0 };
  for (let i = start; i < start + count; i++) {
    if (!done.has(i)) return i;
  }
  return Math.max(0, start);
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
