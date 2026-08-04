import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Check, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import aiBot from "@/assets/ai-bot.png";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { generateLessonChunk, generateOutline } from "@/lib/course-ai.functions";
import { briefChips, clampBrief, type CourseBrief, type CourseOutline } from "@/lib/course-brief";
import { saveCourse } from "@/lib/course-store";
import type { Lesson } from "@/lib/courses";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/create")({
  validateSearch: (search: Record<string, unknown>) =>
    clampBrief({
      topic: search["topic"],
      lessons: search["lessons"],
      difficulty: search["difficulty"],
      experience: search["experience"],
      focus: search["focus"],
      goal: search["goal"],
    }),
  head: () => ({
    meta: [
      { title: "AI Course Creator — Lamppost" },
      {
        name: "description",
        content: "Watch Lamppost write a personalized, in-depth course for your topic.",
      },
      { property: "og:title", content: "AI Course Creator — Lamppost" },
      { property: "og:description", content: "Your personalized course, written lesson by lesson." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/create" }],
  }),
  component: CreateScreen,
});

const CHUNK = 3;

function CreateScreen() {
  const brief = Route.useSearch();
  const navigate = useNavigate();
  const runOutline = useServerFn(generateOutline);
  const runChunk = useServerFn(generateLessonChunk);
  const { registerCourse } = useProgress();

  const [outline, setOutline] = useState<CourseOutline | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const briefKey = JSON.stringify(brief);
  const registerRef = useRef(registerCourse);
  registerRef.current = registerCourse;

  useEffect(() => {
    const parsed = JSON.parse(briefKey) as CourseBrief;
    let cancelled = false;
    setOutline(null);
    setLessons([]);
    setDone(false);
    setFailed(null);

    (async () => {
      try {
        const outlineResult = await runOutline({ data: parsed });
        if (cancelled) return;
        if (!outlineResult.ok) {
          setFailed(outlineResult.reason);
          return;
        }
        const nextOutline = outlineResult.outline;
        setOutline(nextOutline);

        const written: Lesson[] = [];
        for (let i = 0; i < nextOutline.stubs.length; i += CHUNK) {
          const chunk = await runChunk({
            data: {
              brief: parsed,
              courseTitle: nextOutline.topic,
              stubs: nextOutline.stubs.slice(i, i + CHUNK),
            },
          });
          if (cancelled) return;
          if (!chunk.ok) {
            setFailed(chunk.reason);
            return;
          }
          written.push(...chunk.lessons);
          setLessons([...written]);
        }

        saveCourse({
          slug: nextOutline.slug,
          topic: nextOutline.topic,
          tagline: nextOutline.tagline,
          emoji: nextOutline.emoji,
          brief: parsed,
          lessons: written,
        });
        registerRef.current(nextOutline.slug, nextOutline.topic, written.length);
        setDone(true);
        setTimeout(() => {
          if (!cancelled) navigate({ to: "/course/$slug", params: { slug: nextOutline.slug } });
        }, 1100);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setFailed("The AI tutor couldn't finish writing this course. Try again in a moment.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [briefKey, attempt, runOutline, runChunk, navigate]);

  const total = outline?.stubs.length ?? brief.lessons;
  const pct = done ? 100 : outline ? Math.round(12 + (lessons.length / total) * 84) : 8;
  const step = !outline
    ? "Designing your learning path…"
    : done
      ? "Opening your course…"
      : `Writing lesson ${Math.min(lessons.length + 1, total)} of ${total}…`;

  return (
    <PhoneFrame showNav={false}>
      <ScreenHeader title="AI Course Creator" backTo="/setup" />
      <div className="px-5 pb-8">
        <div className="flex animate-rise-in justify-end">
          <div className="max-w-[85%] rounded-3xl rounded-br-md bg-hero-gradient px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card">
            Build me a course on {brief.topic}
            {brief.goal ? ` so I can ${brief.goal.toLowerCase()}` : ""}.
          </div>
        </div>

        <div className="mt-3 flex flex-wrap justify-end gap-1.5">
          {briefChips(brief).map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-extrabold text-accent-foreground"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="my-6 flex justify-center">
          <div className="relative">
            <span
              aria-hidden
              className={`absolute inset-4 rounded-full ${done ? "" : "animate-pulse-ring"}`}
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

        {failed ? (
          <div className="animate-pop-in rounded-3xl bg-card p-5 text-center shadow-card">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <h2 className="mt-2 text-base">Course creation hit a snag</h2>
            <p className="mt-1 text-xs text-muted-foreground">{failed}</p>
            <button
              onClick={() => setAttempt((a) => a + 1)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-hero-gradient px-5 py-2.5 text-sm font-extrabold text-primary-foreground shadow-card transition-transform hover:scale-[1.03]"
            >
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
          </div>
        ) : (
          <div className="animate-rise-in rounded-3xl bg-card p-5 shadow-card">
            <h2 className="text-base">
              {done ? (
                "Your course is ready! ✨"
              ) : (
                <span className="shimmer-text">AI is writing your course ✨</span>
              )}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{step}</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-hero-gradient transition-all duration-700 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs font-bold text-muted-foreground">{pct}%</span>
            </div>

            <p className="mt-6 text-sm font-bold">
              {outline ? outline.tagline : "Sketching your learning path…"}
            </p>
            <ol className="mt-3 space-y-2">
              {outline
                ? outline.stubs.map((stub, i) => {
                    const written = i < lessons.length;
                    const active = i === lessons.length && !done;
                    return (
                      <li
                        key={`${stub.index}-${stub.title}`}
                        className={`flex animate-rise-in items-center gap-3 rounded-2xl p-3 transition-all ${
                          written ? "bg-primary-soft" : "bg-muted/60"
                        }`}
                        style={{ animationDelay: `${i * 70}ms` }}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${
                            written
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary-soft text-primary"
                          }`}
                        >
                          {written ? <Check className="h-4 w-4" /> : stub.index}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{stub.title}</span>
                          <span
                            className={`block truncate text-xs ${
                              active ? "shimmer-text" : "text-muted-foreground"
                            }`}
                          >
                            {active ? "Writing lesson content…" : stub.subtitle}
                          </span>
                        </span>
                        <span aria-hidden className="text-lg">
                          {stub.emoji}
                        </span>
                      </li>
                    );
                  })
                : Array.from({ length: brief.lessons }).map((_, i) => (
                    <li
                      key={`skeleton-${i}`}
                      className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3"
                    >
                      <span className="h-7 w-7 shrink-0 animate-pulse rounded-xl bg-primary-soft" />
                      <span className="flex-1 space-y-1.5">
                        <span className="block h-3 w-2/3 animate-pulse rounded-full bg-primary-soft" />
                        <span className="block h-2.5 w-1/3 animate-pulse rounded-full bg-muted" />
                      </span>
                    </li>
                  ))}
            </ol>

            <p className="mt-4 flex items-center gap-2 rounded-2xl bg-primary-soft px-3 py-3 text-xs font-semibold text-accent-foreground">
              <span aria-hidden>🤖</span> Written from scratch for your answers.
            </p>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
