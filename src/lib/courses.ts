import type { CourseBrief } from "./course-brief";

export type Quiz = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

export type LessonPart = {
  title: string;
  body: string;
};

/** Short "predict before reveal" beat shown at the end of the reading part. */
export type Prediction = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

export type Lesson = {
  title: string;
  subtitle: string;
  emoji: string;
  intro?: string;
  keyPoints?: string[];
  /** Multi-page lesson content, shown one part at a time before the quiz. */
  parts?: LessonPart[];
  quiz: Quiz;
  /** Multiple quiz questions on longer courses; falls back to `quiz`. */
  quizzes?: Quiz[];
};

export type Course = {
  slug: string;
  topic: string;
  tagline: string;
  emoji: string;
  brief?: CourseBrief;
  lessons: Lesson[];
};

export const lessonQuizzes = (lesson: Lesson): Quiz[] =>
  lesson.quizzes && lesson.quizzes.length > 0 ? lesson.quizzes : [lesson.quiz];


export const slugify = (topic: string) =>
  topic
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "course";

export const titleFromSlug = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Course";
