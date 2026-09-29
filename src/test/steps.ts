import type {
  BuilderStep,
  CauseStep,
  ChoiceStep,
  ConfidenceStep,
  FlawStep,
  GapStep,
  NoteStep,
  SortStep,
  StrongerStep,
  UpdaterStep,
} from "@/lib/steps/types";

/** One well-formed step of every kind, used by the component and schema tests. */

export const flawSample: FlawStep = {
  id: "flaw-1",
  kind: "flaw",
  prompt: "Tap the phrase where the reasoning goes wrong.",
  hint: "Ask what else could explain both things.",
  why: "Two things rising together doesn't show one causes the other.",
  fallacy: "Correlation is not causation",
  passage: [
    { text: "Towns with more ice cream stalls" },
    {
      text: "also have more sunburn cases,",
      tappable: true,
      whyNot: "That's the observation, and it may well be true.",
    },
    { text: "so" },
    { text: "ice cream causes sunburn.", tappable: true, flaw: true },
    {
      text: "The council should ban stalls near beaches.",
      tappable: true,
      whyNot: "This is the action they want; the problem is the step before it.",
    },
  ],
};

export const builderSample: BuilderStep = {
  id: "builder-1",
  kind: "builder",
  prompt: "Put each piece where it belongs in the argument.",
  hint: "The conclusion is what the others try to prove.",
  why: "A conclusion rests on reasons, and good reasons rest on things you can check.",
  slots: [
    { id: "c", role: "conclusion", label: "Conclusion" },
    { id: "p", role: "premise", label: "Reason" },
    { id: "e", role: "evidence", label: "Evidence" },
  ],
  pieces: [
    { id: "pc", text: "Brightside Bakery should open at 6am.", role: "conclusion" },
    { id: "pp", text: "Most of its customers are commuters.", role: "premise" },
    { id: "pe", text: "A door counter showed 60% arrive before 7am.", role: "evidence" },
    {
      id: "px",
      text: "The owner likes early mornings.",
      role: null,
      note: "Liking mornings doesn't give customers a reason to come.",
    },
  ],
};

export const sortSample: SortStep = {
  id: "sort-1",
  kind: "sort",
  prompt: "Sort each claim.",
  hint: "Can you check it?",
  why: "A fact can be checked; an opinion can't.",
  buckets: [
    { id: "fact", label: "Fact", hint: "Can be checked" },
    { id: "opinion", label: "Opinion", hint: "A preference" },
  ],
  items: [
    {
      id: "1",
      text: "The Harbour Bridge is 40 metres long.",
      bucket: "fact",
      why: "You could measure it.",
    },
    {
      id: "2",
      text: "The Harbour Bridge is ugly.",
      bucket: "opinion",
      why: "Ugly is a taste, not a measurement.",
    },
    { id: "3", text: "It opened in 1998.", bucket: "fact", why: "A date is in the records." },
  ],
};

export const confidenceSample: ConfidenceStep = {
  id: "conf-1",
  kind: "confidence",
  prompt: "Choose an answer, then say how sure you are.",
  hint: "Sure of what, exactly?",
  why: "A single story can't tell you how common something is.",
  question: "Mia's cousin saw a ghost, so ghosts are common. Is that strong evidence?",
  options: [
    {
      text: "Yes, she saw it herself.",
      whyNot: "One person's story can't show how common something is.",
    },
    { text: "No, one story isn't enough." },
  ],
  correct: 1,
};

export const strongerSample: StrongerStep = {
  id: "stronger-1",
  kind: "stronger",
  prompt: "Which argument is stronger?",
  hint: "Look at who is being asked to believe what.",
  why: "Evidence you can check beats a claim you can only trust.",
  a: "Our tea is the best because our founder says so.",
  b: "Our tea won a blind taste test where 40 of 60 tasters picked it.",
  stronger: "b",
  factor: "It can be checked",
  weakerWhy: "The founder has a reason to say it, and nobody else can check the claim.",
};

export const updaterSample: UpdaterStep = {
  id: "updater-1",
  kind: "updater",
  prompt: "Does each new piece of evidence make the claim more or less likely?",
  hint: "Would you expect it either way?",
  why: "Evidence that fits both stories shouldn't move you.",
  claim: "The lighthouse light went out because the bulb failed.",
  prior: 50,
  cards: [
    {
      id: "a",
      text: "The spare bulb in the cupboard is missing.",
      shift: 20,
      note: "Someone may have swapped it, which fits a bulb failure.",
    },
    {
      id: "b",
      text: "The whole village lost power that night.",
      shift: -30,
      note: "A power cut explains it without any bulb failing.",
    },
    {
      id: "c",
      text: "It was a Tuesday.",
      shift: 0,
      note: "The day of the week says nothing about either cause.",
    },
  ],
};

export const causeSample: CauseStep = {
  id: "cause-1",
  kind: "cause",
  prompt: "Switch on the hidden variable, then say what is going on.",
  hint: "What do hot days do to both?",
  why: "Hot weather raises both ice cream sales and sunburn; neither causes the other.",
  scenario: "Each dot is a day at Coral Bay beach.",
  xLabel: "Ice creams sold",
  yLabel: "Sunburn cases",
  hiddenLabel: "The weather",
  groups: [
    {
      id: "cool",
      label: "Cool days",
      points: [
        [10, 4],
        [12, 6],
        [11, 3],
        [13, 5],
        [14, 4],
      ],
    },
    {
      id: "hot",
      label: "Hot days",
      points: [
        [30, 24],
        [32, 26],
        [31, 23],
        [33, 25],
        [34, 24],
      ],
    },
  ],
  question: "What best explains the pattern?",
  options: [
    { text: "Hot weather drives both." },
    {
      text: "Ice cream causes sunburn.",
      whyNot: "Inside each kind of day the link disappears, so it isn't the ice cream.",
    },
    {
      text: "Sunburn makes people buy ice cream.",
      whyNot: "The same problem: within a kind of day, more sunburn doesn't mean more ice cream.",
    },
  ],
  correct: 0,
};

export const gapSample: GapStep = {
  id: "gap-1",
  kind: "gap",
  prompt: "Which missing assumption makes this argument work?",
  hint: "What has to be true to get from the reason to the conclusion?",
  why: "The argument only works if what worked before will work again here.",
  reason: "Every previous shop on Mill Street closed within a year.",
  conclusion: "The new shop on Mill Street will close within a year.",
  options: [
    { text: "The new shop is like the earlier ones in the ways that matter." },
    {
      text: "Shops are hard to run.",
      whyNot: "That's a general remark; it doesn't connect these particular shops.",
    },
    { text: "The street is busy.", whyNot: "A busy street would point the other way." },
  ],
  correct: 0,
};

export const choiceSample: ChoiceStep = {
  id: "choice-1",
  kind: "choice",
  prompt: "Which sentence is the conclusion?",
  hint: "The conclusion is what the rest is trying to prove.",
  why: "The last sentence is what the others are offered to support.",
  stimulus: "The pool is cold. Nobody swam this week. The pool should open later in the year.",
  options: [
    {
      text: "The pool is cold.",
      whyNot: "That's a reason offered, not what the argument wants you to accept.",
    },
    { text: "Nobody swam this week.", whyNot: "That's an observation offered as support." },
    { text: "The pool should open later in the year." },
  ],
  correct: 2,
};

export const noteSample: NoteStep = {
  id: "note-1",
  kind: "note",
  prompt:
    "A claim is what the argument wants you to accept. Everything else is there to support it.",
};

export const allSamples = [
  flawSample,
  builderSample,
  sortSample,
  confidenceSample,
  strongerSample,
  updaterSample,
  causeSample,
  gapSample,
  choiceSample,
  noteSample,
] as const;
