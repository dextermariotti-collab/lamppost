/**
 * The content rules every authored text follows: made-up people, companies and products, and no
 * partisan positions. Shared by the tests for lessons, notes and unit checks.
 */

/** Real people and brands a lesson must not use; examples are made up. */
export const REAL_NAMES = [
  "Trump",
  "Biden",
  "Obama",
  "Clinton",
  "Musk",
  "Bezos",
  "Zuckerberg",
  "Gates",
  "Jobs",
  "Putin",
  "Modi",
  "Macron",
  "Merkel",
  "Johnson",
  "Google",
  "Facebook",
  "Instagram",
  "TikTok",
  "Twitter",
  "Amazon",
  "Apple",
  "Microsoft",
  "Tesla",
  "Netflix",
  "Nike",
  "Coca-Cola",
  "Pepsi",
  "McDonald",
  "Starbucks",
  "Walmart",
  "Pfizer",
  "Moderna",
  "OpenAI",
  "ChatGPT",
  "Wikipedia",
  "Fox News",
  "CNN",
  "BBC",
  "Reuters",
  "Democrat",
  "Republican",
  "Tory",
  "Labour Party",
  "Brexit",
  "Trumpism",
];
/** Topics on which a lesson would end up taking a partisan side. */
export const PARTISAN = [
  "abortion",
  "gun control",
  "immigration",
  "border wall",
  "election fraud",
  "pro-life",
  "pro-choice",
  "gay marriage",
  "transgender",
  "gun rights",
  "Second Amendment",
  "climate hoax",
  "vaccine mandate",
  "rent control",
  "minimum wage",
  "death penalty",
  "welfare",
  "left-wing",
  "right-wing",
  "liberals",
  "conservatives",
  "the president",
  "prime minister",
];

/** What a piece of text mentions that it shouldn't; an empty list means it follows the rules. */
export function contentRuleBreaks(text: string): string[] {
  return [...REAL_NAMES, ...PARTISAN].filter((word) => new RegExp(`\\b${word}\\b`, "i").test(text));
}
