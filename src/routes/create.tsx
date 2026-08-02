import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import aiBot from "@/assets/ai-bot.png";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { generateCourse } from "@/lib/course-ai.functions";
import { saveCourse } from "@/lib/course-store";
import { slugify } from "@/lib/courses";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/create")({
  validateSearch: (search: Record<string, unknown>) => ({
    topic: typeof search["topic"] === "string" ? (search["topic"] as string) : "Digital Photography",
  }),
  head: () => ({
    meta: [
      { title: "AI Course Creator — Lamppost" },
      {
        name: "description",
        content: "Watch Lamppost build a personalized course outline for your topic in seconds.",
      },
      { property: "og:title", content: "AI Course Creator — Lamppost" },
      { property: "og:description", content: "Your personalized course, generated in seconds." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/create" }],
  }),
  component: CreateScreen,
});

const STEPS = [
  "Understanding your topic…",
  "Sketching a learning path…",
  "Writing lesson content…",
  "Adding quick quizzes…",
  "Polishing your course…",
];

function CreateScreen() {
  const { topic } = Route.useSearch();
  const navigate = useNavigate();
  const create = useServerFn(generateCourse);
  const { registerCourse } = useProgress();
  const [progress, setProgress] = useState(6);
  const [revealed, setRevealed] = useState(0);

  const { data: course, isError, refetch, isFetching } = useQuery({
    queryKey: ["course", slugify(topic)],
    queryFn: () => create({ data: { topic } }),
    staleTime: Infinity,
    retry: 0,
  });

  // Creep toward 92% while the AI works, then finish.
  useEffect(() => {
    if (course) {
      setProgress(100);
      return;
    }
    if (isError) return;
    const timer = setInterval(() => setProgress((p) => (p < 92 ? p + Math.max(1, (92 - p) * 0.08) : p)), 220);
    return () => clearInterval(timer);
  }, [course, isError]);

  // Persist + reveal lessons one by one, then open the path.
  useEffect(() => {
    if (!course) return;
    saveCourse(course);
    registerCourse(course.slug, course.topic, course.lessons.length);
    let i = 0;
    const reveal = setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= course.lessons.length) clearInterval(reveal);
    }, 220);
    const go = setTimeout(
      () => navigate({ to: "/course/$slug", params: { slug: course.slug } }),
      course.lessons.length * 220 + 900,
    );
    return () => {
      clearInterval(reveal);
      clearTimeout(go);
    };
  }, [course, navigate, registerCourse]);

  const step = STEPS[Math.min(STEPS.length - 1, Math.floor(progress / 20))]!;
  const pct = Math.round(progress);

  return (
    <PhoneFrame showNav={false}>
      <ScreenHeader title="AI Course Creator" backTo="/" />
      <div className="px-5 pb-8">
        <div className="flex animate-rise-in justify-end">
          <div className="max-w-[80%] rounded-3xl rounded-br-md bg-hero-gradient px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card">
            Make me a beginner course on {topic}
          </div>
        </div>

        <div className="my-6 flex justify-center">
          <div className="relative">
            <span
              aria-hidden
              className={`absolute inset-4 rounded-full ${course ? "" : "animate-pulse-ring"}`}
            />
            <img
              src={aiBot}
              alt="Lamppost AI assistant"
              width={816}
              height={816}
              className="relative h-32 w-32 animate-float object-contain drop-shadow-lg"
            />
          </div>
        </div>

        {isError ? (
          <div className="animate-pop-in rounded-3xl bg-card p-5 text-center shadow-card">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <h2 className="mt-2 text-base">Course creation hit a snag</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              The AI tutor is busy right now. Give it another try.
            </p>
            <button
              onClick={() => {
                setProgress(6);
                void refetch();
              }}
              disabled={isFetching}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-hero-gradient px-5 py-2.5 text-sm font-extrabold text-primary-foreground shadow-card transition-transform hover:scale-[1.03] disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
          </div>
        ) : (
          <div className="animate-rise-in rounded-3xl bg-card p-5 shadow-card">
            <h2 className="text-base">
              {course ? (
                "Your course is ready! ✨"
              ) : (
                <span className="shimmer-text">AI is building your course ✨</span>
              )}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {course ? "Opening your learning path…" : step}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-hero-gradient transition-all duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs font-bold text-muted-foreground">{pct}%</span>
            </div>

            <p className="mt-6 text-sm font-bold">
              {course ? "Here's what I created for you:" : "Drafting your lessons…"}
            </p>
            <ol className="mt-3 space-y-2">
              {(course?.lessons ?? Array.from({ length: 5 })).map((lesson, i) => {
                if (!course || !lesson) {
                  return (
                    <li
                      key={`skeleton-${i}`}
                      className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3"
                      style={{ animationDelay: `${i * 90}ms` }}
                    >
                      <span className="h-7 w-7 shrink-0 animate-pulse rounded-xl bg-primary-soft" />
                      <span className="flex-1 space-y-1.5">
                        <span className="block h-3 w-2/3 animate-pulse rounded-full bg-primary-soft" />
                        <span className="block h-2.5 w-1/3 animate-pulse rounded-full bg-muted" />
                      </span>
                    </li>
                  );
                }
                const shown = i < revealed;
                return (
                  <li
                    key={lesson.title}
                    className={`flex items-center gap-3 rounded-2xl bg-muted/60 p-3 transition-all duration-500 ${
                      shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-xs font-extrabold text-primary">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{lesson.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {lesson.subtitle}
                      </span>
                    </span>
                    <span aria-hidden className="text-lg">
                      {lesson.emoji}
                    </span>
                  </li>
                );
              })}
            </ol>

            <p className="mt-4 flex items-center gap-2 rounded-2xl bg-primary-soft px-3 py-3 text-xs font-semibold text-accent-foreground">
              <span aria-hidden>🤖</span> This course is 100% personalized for you.
            </p>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
