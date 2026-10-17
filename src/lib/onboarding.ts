import { useEffect, useState } from "react";
import type { LessonStep } from "./steps/types";

/**
 * What the learner told us during onboarding: why they're here and how much time
 * they have. The time answer sets their daily goal; the motivation is used for
 * copy, not for gating anything.
 */

const KEY = "lamppost-intent-v1";

export const MOTIVATION_IDS = ["debate", "school", "decisions", "misinformation", "work"] as const;

export type Motivation = (typeof MOTIVATION_IDS)[number];

export const MOTIVATIONS: { id: Motivation; label: string; blurb: string; reaction: string }[] = [
  {
    id: "debate",
    label: "Win arguments fairly",
    blurb: "Hold your ground without cheap shots",
    reaction: "Good. We'll make your case hard to knock down.",
  },
  {
    id: "school",
    label: "School and tests",
    blurb: "Essays, comprehension, reasoning sections",
    reaction: "Then the written tasks are your gym.",
  },
  {
    id: "decisions",
    label: "Make better decisions",
    blurb: "Money, health, big life calls",
    reaction: "Unit 6 is going to be your favorite.",
  },
  {
    id: "misinformation",
    label: "Spot misinformation",
    blurb: "Headlines, charts, viral posts, AI answers",
    reaction: "We'll get you naming the trick, not just sensing it.",
  },
  {
    id: "work",
    label: "Work and meetings",
    blurb: "Meetings, proposals, pushing back well",
    reaction: "Steelmanning is the most underrated work skill.",
  },
];

/**
 * A full lesson (concept, drills and the written task) runs about 8-10 minutes,
 * so the labels promise what the time actually buys.
 */
export const TIME_OPTIONS: { minutes: number; goal: number; label: string; reaction: string }[] = [
  {
    minutes: 5,
    goal: 1,
    label: "About 5 minutes",
    reaction: "Small and daily beats big and rare.",
  },
  { minutes: 15, goal: 2, label: "About 15 minutes", reaction: "That's a real habit. Nice." },
  {
    minutes: 25,
    goal: 3,
    label: "About 25 minutes",
    reaction: "Ambitious. I'll hold you to it.",
  },
];

/**
 * The one real question the first screen asks, with the same feedback every lesson gives. It is
 * not a lesson's own step, so nobody meets it twice.
 */
export const FIRST_QUESTION: Extract<LessonStep, { kind: "choice" }> = {
  id: "first-question",
  kind: "choice",
  label: "Try one",
  prompt: "Which sentence is the claim the others are there to support?",
  stimulus:
    "Harbor Street should close to cars on Saturdays. Shoppers say the road is too loud, and two cafés say they would sell more with tables outside.",
  options: [
    {
      text: "Shoppers say the road is too loud.",
      whyNot: "That is a reason given for the claim, not the claim itself.",
    },
    {
      text: "Two cafés would sell more with tables outside.",
      whyNot: "That is another reason. It supports the claim rather than being it.",
    },
    { text: "Harbor Street should close to cars on Saturdays." },
  ],
  correct: 2,
  why: "The claim is what everything else is there to support. Every lesson works like this: you try first, then see why.",
};

export type Intent = {
  motivation: Motivation | null;
  minutesPerDay: number | null;
  placementScore: number | null;
  placementSkipped: boolean;
};

const DEFAULT: Intent = {
  motivation: null,
  minutesPerDay: null,
  placementScore: null,
  placementSkipped: false,
};

export function readIntent(): Intent {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Intent) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function saveIntent(patch: Partial<Intent>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...readIntent(), ...patch }));
  } catch {
    /* ignore */
  }
}

export function useIntent() {
  const [intent, setIntent] = useState<Intent>(DEFAULT);
  useEffect(() => setIntent(readIntent()), []);
  return intent;
}

/**
 * How many unit-1 lessons a placement result unlocks. Only a near-perfect run
 * skips ahead — being wrongly skipped past a skill is worse than repeating it.
 */
export function placementSkip(correct: number, total: number) {
  if (total === 0) return 0;
  if (correct >= total) return 4;
  if (correct >= total - 1) return 2;
  return 0;
}
