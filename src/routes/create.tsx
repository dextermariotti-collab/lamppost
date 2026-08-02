import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import aiBot from "@/assets/ai-bot.png";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { buildCourse } from "@/lib/courses";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/create")({
  validateSearch: (search: Record<string, unknown>) => ({
    topic: typeof search['topic'] === "string" ? (search['topic'] as string) : "Digital Photography",
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

function CreateScreen() {
  const { topic } = Route.useSearch();
  const navigate = useNavigate();
  const course = useMemo(() => buildCourse(topic), [topic]);
  const { registerCourse } = useProgress();
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const timer = setInterval(
      () => setProgress((p) => Math.min(100, p + 13)),
      280,
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress < 100) return;
    registerCourse(course.slug, course.topic, course.lessons.length);
    const t = setTimeout(
      () => navigate({ to: "/course/$slug", params: { slug: course.slug } }),
      900,
    );
    return () => clearTimeout(t);
  }, [progress, course, navigate, registerCourse]);

  const revealed = Math.min(course.lessons.length, Math.floor(progress / 20));

  return (
    <PhoneFrame showNav={false}>
      <ScreenHeader title="AI Course Creator" backTo="/" />
      <div className="px-5 pb-8">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-3xl rounded-br-md bg-hero-gradient px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card">
            Make me a beginner course on {course.topic}
          </div>
        </div>

        <div className="my-6 flex justify-center">
          <img
            src={aiBot}
            alt="Lamppost AI assistant"
            width={816}
            height={816}
            className="h-32 w-32 animate-float object-contain drop-shadow-lg"
          />
        </div>

        <div className="rounded-3xl bg-card p-5 shadow-card">
          <h2 className="text-base">
            {progress >= 100 ? "Your course is ready! ✨" : "AI is building your course ✨"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {progress >= 100 ? "Opening your learning path…" : "This will only take a few seconds…"}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-hero-gradient transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-muted-foreground">{progress}%</span>
          </div>

          <p className="mt-6 text-sm font-bold">Here&apos;s what I&apos;m creating for you:</p>
          <ol className="mt-3 space-y-2">
            {course.lessons.map((lesson, i) => (
              <li
                key={lesson.title}
                className={`flex items-center gap-3 rounded-2xl bg-muted/60 p-3 transition-all duration-500 ${
                  i < revealed ? "opacity-100" : "translate-y-1 opacity-0"
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
            ))}
          </ol>

          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-primary-soft px-3 py-3 text-xs font-semibold text-accent-foreground">
            <span aria-hidden>🤖</span> This course is 100% personalized for you.
          </p>
        </div>
      </div>
    </PhoneFrame>
  );
}
