/**
 * Lamppost is a critical-thinking app: every course teaches how to reason about
 * a subject, not just recall it. These are the starter skills we suggest.
 */
export type ThinkingTrack = {
  topic: string;
  blurb: string;
};

export const THINKING_TRACKS: ThinkingTrack[] = [
  { topic: "Logical fallacies", blurb: "Name the broken move in any argument" },
  { topic: "Cognitive biases", blurb: "Catch your own reasoning shortcuts" },
  { topic: "Judging evidence and sources", blurb: "Tell strong support from noise" },
  { topic: "Statistics that mislead", blurb: "Read numbers people use on you" },
  { topic: "Rhetoric and persuasion", blurb: "See how language does the work" },
  { topic: "Making decisions under uncertainty", blurb: "Think clearly without full facts" },
];

/**
 * Every generated course is framed as a reasoning course, whatever the subject.
 * This sentence is appended to the AI brief so content stays argument-first.
 */
export const THINKING_LENS = `Lamppost is a critical-thinking app. Whatever the subject, teach the learner how to
reason about it: what counts as evidence here, which claims are commonly overstated, how experts
tell a strong argument from a weak one, and which mistakes in thinking trip people up. Every lesson
must make the learner evaluate claims, not just memorise facts. Use real arguments, real numbers and
real trade-offs from the subject.`;
