import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Lock, MoreHorizontal, Play, RotateCcw, Share2 } from "lucide-react";
import { useEffect } from "react";
import { clampBrief } from "@/lib/course-brief";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useStoredCourse } from "@/lib/course-store";
import { buildCourse } from "@/lib/courses";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/course/$slug/")({
  head: ({ params }) => {
    const course = buildCourse(params.slug.replace(/-/g, " "));
    return {
      meta: [
        { title: `${course.topic} learning path — Lamppost` },
        { name: "description", content: `${course.tagline} Follow your AI-built path lesson by lesson.` },
        { property: "og:title", content: `${course.topic} — Lamppost` },
        { property: "og:description", content: course.tagline },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: `/course/${params.slug}` }],
    };
  },
  component: CoursePath,
});

function CoursePath() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { course: stored, hydrated } = useStoredCourse(slug);
  const { state, registerCourse } = useProgress();

  // Deep link to a course that was never generated → generate it.
  useEffect(() => {
    if (hydrated && !stored) {
      navigate({
        to: "/setup",
        search: clampBrief({ topic: slug.replace(/-/g, " ") }),
        replace: true,
      });
    }
  }, [hydrated, stored, slug, navigate]);

  useEffect(() => {
    if (stored) registerCourse(stored.slug, stored.topic, stored.lessons.length);
  }, [stored, registerCourse]);

  if (!stored) {
    return (
      <PhoneFrame>
        <div className="space-y-4 px-5 py-8">
          <div className="h-36 animate-pulse rounded-3xl bg-primary-soft" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      </PhoneFrame>
    );
  }

  const course = stored;
  const completed = state.courses[slug]?.completed ?? 0;
  const pct = Math.round((completed / course.lessons.length) * 100);
  const nextIndex = Math.min(completed, course.lessons.length - 1);

  return (
    <PhoneFrame>
      <ScreenHeader
        backTo="/"
        right={
          <>
            <button
              aria-label="Regenerate course"
              onClick={() => navigate({ to: "/setup", search: clampBrief({ topic: course.topic, ...course.brief }) })}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-soft transition-transform hover:rotate-90"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              aria-label="Share course"
              onClick={() => {
                const url = window.location.href;
                if (navigator.share) void navigator.share({ title: course.topic, url });
                else void navigator.clipboard?.writeText(url);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              aria-label="More options"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-soft"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </>
        }
      />

      <div className="px-5 pb-8">
        <section className="relative animate-rise-in overflow-hidden rounded-3xl bg-hero-gradient p-5 text-primary-foreground shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/20 text-4xl">
              {course.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold opacity-80">{course.tagline}</p>
              <h1 className="text-2xl leading-tight">{course.topic}</h1>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-primary-foreground/30">
                  <div
                    className="h-full rounded-full bg-primary-foreground transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold">{pct}%</span>
              </div>
            </div>
          </div>
          <button
            onClick={() =>
              navigate({
                to: "/course/$slug/lesson/$index",
                params: { slug, index: String(nextIndex + 1) },
              })
            }
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-5 py-2.5 text-sm font-extrabold text-primary shadow-soft transition-transform hover:scale-[1.03] active:scale-95"
          >
            <Play className="h-4 w-4" />
            {completed === 0 ? "Start" : completed >= course.lessons.length ? "Review" : "Continue"}
          </button>
        </section>

        <h2 className="mt-6 text-base">Your learning path</h2>

        <ol className="mt-4 space-y-4">
          {course.lessons.map((lesson, i) => {
            const done = i < completed;
            const locked = i > completed;
            const current = i === completed;
            return (
              <li
                key={lesson.title}
                className={`animate-rise-in ${i % 2 ? "pl-8" : "pr-8"}`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <Link
                  to="/course/$slug/lesson/$index"
                  params={{ slug, index: String(i + 1) }}
                  disabled={locked}
                  className={`flex items-center gap-3 rounded-3xl bg-card p-3 shadow-soft transition-all ${
                    locked ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5 hover:shadow-card"
                  } ${current ? "ring-2 ring-primary/40" : ""}`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                      locked
                        ? "bg-muted text-muted-foreground"
                        : "bg-hero-gradient text-primary-foreground shadow-card"
                    } ${current ? "animate-pulse-ring" : ""}`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{lesson.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {locked ? "Coming up next" : lesson.subtitle}
                    </span>
                  </span>
                  {done ? (
                    <Check className="h-5 w-5 shrink-0 animate-pop-in rounded-full bg-success p-1 text-success-foreground" />
                  ) : locked ? (
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Play className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </PhoneFrame>
  );
}
