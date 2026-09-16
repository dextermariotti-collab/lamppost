import { QUIZ_RIGOR_PROMPT } from "./course-brief";
import { UNITS, linksForLesson, type CurriculumLesson } from "./curriculum";

/**
 * Prompt for one fixed-curriculum lesson. The model is tightly constrained to
 * the lesson's objective so cached content stays on-syllabus, and is told about
 * the real cross-unit links so lessons reference each other honestly.
 */
export function curriculumLessonPrompt(lesson: CurriculumLesson) {
  const unit = UNITS.find((u) => u.id === lesson.unitId);
  const links = linksForLesson(lesson.id)
    .map((link) => `- ${link.concept}: ${link.detail}`)
    .join("\n");

  return `Course: Lamppost — Critical thinking (a fixed 7-unit critical-thinking curriculum).
Unit: ${unit?.title ?? lesson.unitId} — ${unit?.blurb ?? ""}
Lesson title: "${lesson.title}"
Learning objective (the whole lesson must serve exactly this, nothing wider):
${lesson.objective}

Write full content for this one lesson, using index 1.
Teach the reasoning skill itself. Draw examples from everyday arguments people
actually meet: news claims, workplace decisions, health advice, adverts, social
media posts, product reviews, politics. Never drift into another unit's skill,
and never teach study technique instead of the skill.
Each lesson needs 2 quiz question(s) in "quizzes".
${QUIZ_RIGOR_PROMPT["tricky"]}
The required "flaw" drill must contain exactly the reasoning error this lesson
teaches, so a learner who understood the lesson can name it.
${links ? `This lesson genuinely connects to other units in the curriculum:\n${links}\nReference one of these connections briefly in part 3.` : ""}
Return the JSON now.`;
}
