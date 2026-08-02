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

const CURATED: Record<string, Omit<Course, "slug">> = {
  "digital-photography": {
    topic: "Digital Photography",
    tagline: "Control the light, control the story.",
    emoji: "📷",
    lessons: [
      {
        title: "Camera Basics",
        subtitle: "Understanding your gear",
        emoji: "📷",
        quiz: {
          question: "What does the lens aperture primarily control?",
          options: ["How much light enters", "Image file size", "Battery life"],
          correct: 0,
          explanation: "Aperture is the opening that controls how much light reaches the sensor.",
        },
      },
      {
        title: "Exposure",
        subtitle: "Control the light",
        emoji: "☀️",
        quiz: {
          question: "Which setting controls how bright or dark your photo is?",
          options: ["Aperture", "Shutter Speed", "ISO"],
          correct: 2,
          explanation: "ISO controls the camera's sensitivity to light.",
        },
      },
      {
        title: "Composition",
        subtitle: "Frame the shot",
        emoji: "🖼️",
        quiz: {
          question: "The rule of thirds divides your frame into how many parts?",
          options: ["3", "6", "9"],
          correct: 2,
          explanation: "Two horizontal and two vertical lines create 9 equal parts.",
        },
      },
      {
        title: "Portraits",
        subtitle: "People & expressions",
        emoji: "🧑",
        quiz: {
          question: "Which lens length flatters most portraits?",
          options: ["14mm", "85mm", "600mm"],
          correct: 1,
          explanation: "Around 85mm keeps natural proportions with pleasing background blur.",
        },
      },
      {
        title: "Editing",
        subtitle: "Bring your photos to life",
        emoji: "🎚️",
        quiz: {
          question: "Which format keeps the most editing information?",
          options: ["RAW", "JPEG", "GIF"],
          correct: 0,
          explanation: "RAW files store unprocessed sensor data, giving you the most latitude.",
        },
      },
    ],
  },
  "guitar-basics": {
    topic: "Guitar Basics",
    tagline: "Six strings, endless songs.",
    emoji: "🎸",
    lessons: [
      {
        title: "Meet the Guitar",
        subtitle: "Parts & posture",
        emoji: "🎸",
        quiz: {
          question: "What are the metal strips along the neck called?",
          options: ["Frets", "Bridges", "Nuts"],
          correct: 0,
          explanation: "Frets divide the neck into semitone steps.",
        },
      },
      {
        title: "Tuning Up",
        subtitle: "Standard tuning",
        emoji: "🎵",
        quiz: {
          question: "Standard tuning from the thickest string is…",
          options: ["E A D G B E", "C G D A E B", "D A D G A D"],
          correct: 0,
          explanation: "E A D G B E is the standard tuning for a six-string guitar.",
        },
      },
      {
        title: "First Chords",
        subtitle: "Em, C and G",
        emoji: "✋",
        quiz: {
          question: "Which chord uses only two fingers on the fretboard?",
          options: ["F barre", "E minor", "B7"],
          correct: 1,
          explanation: "E minor needs just two fingers, making it a great first chord.",
        },
      },
      {
        title: "Strumming",
        subtitle: "Rhythm & timing",
        emoji: "🥁",
        quiz: {
          question: "In 4/4 time, how many beats are in a bar?",
          options: ["3", "4", "6"],
          correct: 1,
          explanation: "4/4 means four quarter-note beats per bar.",
        },
      },
      {
        title: "Your First Song",
        subtitle: "Put it together",
        emoji: "⭐",
        quiz: {
          question: "What's the best way to learn a song cleanly?",
          options: ["Play it fast immediately", "Practice slowly with a metronome", "Skip hard parts"],
          correct: 1,
          explanation: "Slow, steady practice builds accuracy that speed can be added to later.",
        },
      },
    ],
  },
};

const TEMPLATE = [
  { suffix: "Foundations", subtitle: "Where it all begins", emoji: "🌱" },
  { suffix: "Core Concepts", subtitle: "The big ideas", emoji: "🧠" },
  { suffix: "In Practice", subtitle: "Hands-on drills", emoji: "🛠️" },
  { suffix: "Common Mistakes", subtitle: "What to avoid", emoji: "⚠️" },
  { suffix: "Going Further", subtitle: "Level up your skills", emoji: "🚀" },
];

export function buildCourse(topic: string): Course {
  const clean = topic.trim().replace(/\s+/g, " ") || "Something New";
  const slug = slugify(clean);
  const curated = CURATED[slug];
  if (curated) return { slug, ...curated };

  return {
    slug,
    topic: clean.replace(/\b\w/g, (c) => c.toUpperCase()),
    tagline: `A personalized path through ${clean}.`,
    emoji: "✨",
    lessons: TEMPLATE.map((t, i) => ({
      title: `${clean} ${t.suffix}`,
      subtitle: t.subtitle,
      emoji: t.emoji,
      quiz: {
        question: `Lesson ${i + 1}: what's the smartest next step when learning ${clean}?`,
        options: [
          "Memorize everything at once",
          "Practice one small piece at a time",
          "Wait until you feel ready",
        ],
        correct: 1,
        explanation: `Small, repeated reps are how ${clean} actually sticks.`,
      },
    })),
  };
}

export const IDEAS = [
  { label: "Photography", emoji: "📷", topic: "Digital Photography" },
  { label: "Biology", emoji: "🌿", topic: "Cell Biology" },
  { label: "Stocks", emoji: "📈", topic: "Stock Investing" },
  { label: "Japanese", emoji: "🇯🇵", topic: "Japanese for Beginners" },
];
