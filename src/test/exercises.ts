import type { Exercise, ExerciseKind } from "@/lib/exercises";

/**
 * One well-formed drill of every type. They satisfy the structural rules, so the
 * rules, the generator's normaliser and the drill components can all be tested
 * against the same examples.
 */
export const SAMPLES = {
  claim: {
    kind: "claim",
    passage:
      "The corner store closed last month. Prices keep rising and nobody visits the main street. The town is dying and the council must act.",
    options: [
      "The town is dying and the council must act",
      "The corner store closed down last month",
      "Prices keep rising and nobody visits the main street",
    ],
    correct: 0,
    explanation: "Everything else is offered to support that conclusion.",
  },
  flaw: {
    kind: "flaw",
    claim: "Everyone I know loves this app, so it must be good for everyone.",
    options: [
      "Popularity among friends is not evidence for everyone",
      "It attacks a weaker version of the opposing view",
      "It assumes one step leads to disaster",
    ],
    correct: 0,
    fallacy: "Bandwagon",
    explanation: "Popularity in a small circle says little about the wider population.",
  },
  assumption: {
    kind: "assumption",
    argument: "Sales rose after the new ad ran, so the ad worked.",
    options: [
      "Nothing else changed that could explain the rise",
      "The ad was expensive to make",
      "Sales always rise in the fall",
    ],
    correct: 0,
    explanation: "Without that link, the rise could have any other cause.",
  },
  rank: {
    kind: "rank",
    claim: "Drinking coffee helps people live longer.",
    items: [
      {
        text: "A large randomized trial with a control group",
        why: "It rules out most other causes.",
      },
      { text: "A cohort study following thousands of people", why: "Strong but observational." },
      { text: "A survey of readers about their habits", why: "Self-reported and self-selected." },
      { text: "One centenarian who drinks coffee daily", why: "A single anecdote." },
    ],
  },
  sort: {
    kind: "sort",
    statements: [
      {
        text: "Water boils at 100 degrees at sea level.",
        bucket: "fact",
        why: "It can be checked.",
      },
      { text: "Jazz is better than pop.", bucket: "opinion", why: "A preference." },
      { text: "We ought to protect the young.", bucket: "value", why: "About what matters." },
    ],
  },
  predict: {
    kind: "predict",
    scenario:
      "A fair coin is flipped ten times and the result of each flip is written down in order.",
    question: "About how many heads should you expect?",
    options: ["About five", "Exactly five", "At least eight"],
    correct: 0,
    explanation:
      "Five is the average, though exactly five happens only about a quarter of the time.",
  },
  steelman: {
    kind: "steelman",
    view: "Remote work is just people avoiding the office.",
    options: [
      "Remote work trades commuting time for fewer chance conversations, and suits some tasks better",
      "Remote work is a passing fad that will fade once offices reopen fully",
      "Remote work is always better for every person in every kind of job",
    ],
    correct: 0,
    explanation: "It keeps the point honest and specific.",
  },
  judge: {
    kind: "judge",
    question: "Who owes evidence here?",
    passage: "You cannot prove that the supplement does not work, so it must be safe to take.",
    options: ["The person making the claim", "The skeptic", "Nobody"],
    correct: 0,
    explanation: "Whoever makes the claim carries the burden of support.",
  },
  highlight: {
    kind: "highlight",
    question: "Tap the words that make this untestable.",
    tokens: [
      "Studies",
      "may",
      "suggest",
      "that",
      "it",
      "can",
      "help",
      "some",
      "people",
      "feel",
      "better.",
    ],
    targets: [1, 5],
    explanation: "May and can leave no result that would count as failure.",
  },
  rewrite: {
    kind: "rewrite",
    question: "Which rewrite could actually be shown false?",
    original: "The program helps people a lot.",
    options: [
      "The program cut average waits by ten percent",
      "The program helps people even more",
      "The program is widely loved",
    ],
    correct: 0,
    explanation: "It says what result would count as failure.",
  },
  order: {
    kind: "order",
    question: "Order these into a working argument.",
    passage: "A council is deciding whether to ban cars from the center.",
    items: [
      { text: "Cars in the center cause most of its air pollution", why: "The premise." },
      { text: "Air pollution harms people who live there", why: "The link." },
      { text: "So the council should limit cars in the center", why: "The conclusion." },
    ],
  },
  numeric: {
    kind: "numeric",
    question: "How many healthy people test positive by mistake?",
    scenario:
      "A test wrongly flags 10 in every 100 healthy people. It is given to 1000 people, all of whom are healthy.",
    answer: 100,
    tolerance: 10,
    unit: "people",
    solution: "10% of 1000 healthy people is 100 false alarms.",
  },
  slider: {
    kind: "slider",
    claim: "The new tool saves the team time.",
    evidence: "A trial with a control group found no difference in time taken.",
    direction: "down",
    size: 30,
    explanation: "A controlled trial is hard to fake, so it should move you a lot.",
  },
  chart: {
    kind: "chart",
    question: "What is this chart doing to you?",
    title: "Quarterly sales",
    series: [
      { label: "Q1", value: 98 },
      { label: "Q2", value: 99 },
      { label: "Q3", value: 100 },
    ],
    yMin: 97,
    yMax: 100,
    options: [
      "The axis starts near the data, so tiny changes look huge",
      "The data behind the chart was probably made up",
      "The bars use a color that is hard to read",
    ],
    correct: 0,
    explanation: "A truncated axis exaggerates a small change.",
  },
} as const satisfies Record<ExerciseKind, Exercise>;

/** A deep copy of a sample, typed as its own kind, that a test can break on purpose. */
export function sample<K extends ExerciseKind>(kind: K): Extract<Exercise, { kind: K }> {
  return JSON.parse(JSON.stringify(SAMPLES[kind])) as Extract<Exercise, { kind: K }>;
}
