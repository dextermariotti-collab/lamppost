import type { Motivation } from "./onboarding";

/**
 * Scenario domains.
 *
 * Every drill needs material, and left alone the model writes the same
 * remote-work/wellness scenario forever. Each learner's onboarding goal picks a
 * domain set, generation rotates through it, and no single domain may carry more
 * than about a third of one lesson.
 */

export const DOMAIN_SETS: Record<Motivation, string[]> = {
  school: [
    "a classroom debate",
    "an essay or exam answer",
    "a school policy announcement",
    "a study reported to students",
    "school sport",
    "a social media post shared in a year group",
  ],
  debate: [
    "an everyday disagreement between friends",
    "a group chat argument",
    "a sports take",
    "a non-partisan public debate about a local rule",
    "a family argument about money or chores",
    "an online comment thread",
  ],
  decisions: [
    "a money decision",
    "a big purchase",
    "a habit someone is trying to build",
    "a career or job choice",
    "a health choice with real trade-offs",
    "renting, moving or travel plans",
  ],
  misinformation: [
    "a news headline",
    "a viral social post",
    "a chart shared without context",
    "an AI chatbot answer",
    "a product advert making a health claim",
    "a screenshot passed round with no source",
  ],
  work: [
    "a team meeting",
    "a project proposal",
    "a product claim in marketing copy",
    "a customer complaint",
    "a hiring decision",
    "a report shared with managers",
  ],
};

/** The default rotation when we don't know the learner's goal yet. */
export const DEFAULT_DOMAINS = [
  "a news headline",
  "an everyday disagreement",
  "a money decision",
  "a workplace meeting",
  "a school or study claim",
  "an advert making a claim",
];

export function domainsFor(motivation: Motivation | null | undefined): string[] {
  return motivation ? (DOMAIN_SETS[motivation] ?? DEFAULT_DOMAINS) : DEFAULT_DOMAINS;
}

/**
 * Picks the domains for one lesson's drills: as many different domains as there
 * are drills, so no domain can dominate the set.
 */
export function domainPlan(motivation: Motivation | null | undefined, count: number): string[] {
  const pool = domainsFor(motivation);
  const start = Math.floor(Math.random() * pool.length);
  return Array.from({ length: count }, (_, i) => pool[(start + i) % pool.length]!);
}
