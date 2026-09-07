import { categoryFor } from "./categories";
import type { Course } from "./courses";

export type KnowledgeConnection = {
  id: string;
  from: string;
  to: string;
  concept: string;
  detail: string;
};

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "because", "before", "being", "between", "both",
  "could", "each", "from", "have", "into", "just", "lesson", "more", "most", "other",
  "over", "same", "some", "such", "than", "that", "their", "them", "then", "there",
  "these", "they", "this", "through", "under", "using", "very", "what", "when", "where",
  "which", "while", "with", "would", "your",
]);

function conceptsFor(course: Course) {
  const source = course.lessons.flatMap((lesson) => [
    lesson.title,
    lesson.subtitle,
    ...(lesson.keyPoints ?? []),
  ]).join(" ");

  const counts = new Map<string, number>();
  for (const token of source.toLowerCase().match(/[a-z][a-z-]{4,}/g) ?? []) {
    const clean = token.replace(/^-|-$/g, "");
    if (STOP_WORDS.has(clean)) continue;
    counts.set(clean, (counts.get(clean) ?? 0) + 1);
  }
  return counts;
}

/**
 * Finds specific concepts that genuinely occur in two generated courses.
 * A link needs repeated evidence in both courses and different subject domains;
 * if that evidence does not exist, the graph intentionally returns no line.
 */
export function identifyCrossDomainConnections(courses: Course[]): KnowledgeConnection[] {
  const concepts = new Map(courses.map((course) => [course.slug, conceptsFor(course)]));
  const connections: KnowledgeConnection[] = [];

  for (let i = 0; i < courses.length; i += 1) {
    const first = courses[i];
    if (!first) continue;
    for (let j = i + 1; j < courses.length; j += 1) {
      const second = courses[j];
      if (!second || categoryFor(first.topic).id === categoryFor(second.topic).id) continue;

      const firstConcepts = concepts.get(first.slug);
      const secondConcepts = concepts.get(second.slug);
      if (!firstConcepts || !secondConcepts) continue;

      const shared = [...firstConcepts.entries()]
        .filter(([word, count]) => count >= 2 && (secondConcepts.get(word) ?? 0) >= 2)
        .sort((a, b) => {
          const bScore = b[1] + (secondConcepts.get(b[0]) ?? 0);
          const aScore = a[1] + (secondConcepts.get(a[0]) ?? 0);
          return bScore - aScore || a[0].localeCompare(b[0]);
        })[0]?.[0];

      if (!shared) continue;
      const concept = shared.replace(/\b\w/g, (letter) => letter.toUpperCase());
      connections.push({
        id: `${first.slug}--${second.slug}--${shared}`,
        from: first.slug,
        to: second.slug,
        concept,
        detail: `${concept} appears repeatedly in both ${first.topic} and ${second.topic}.`,
      });
    }
  }

  return connections;
}