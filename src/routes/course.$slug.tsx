import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Lock, MoreHorizontal, Play, Share2 } from "lucide-react";
import { useEffect } from "react";
import foxMascot from "@/assets/fox-mascot.png";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { buildCourse } from "@/lib/courses";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/course/$slug")({
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
  const course = buildCourse(slug.replace(/-/g, " "));
  const { state, registerCourse } = useProgress();

  useEffect(() => {
    registerCourse(course.slug, course.topic, course.lessons.length);
  }, [course, registerCourse]);

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
              aria-label="Share course"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-soft"
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
        <section className="relative overflow-hidden rounded-3xl bg-hero-gradient p-5 text-primary-foreground shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/20 text-4xl">
              {course.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold opacity-80">Your course</p>
              <h1 className="text-2xl leading-tight">{course.topic}</h1>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-primary-foreground/30">
                  <div className="h-full rounded-full bg-primary-foreground" style={{ width: `${pct}%` }} />
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
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-5 py-2.5 text-sm font-extrabold text-primary shadow-soft transition-transform hover:scale-[1.03]"
          >
            <Play className="h-4 w-4" />
            {completed === 0 ? "Start" : completed >= course.lessons.length ? "Review" : "Continue"}
          </button>
          <img
            src={foxMascot}
            alt=""
            aria-hidden
            width={816}
            height={816}
            className="pointer-events-none absolute -right-3 bottom-0 h-24 w-24 object-contain"
          />
        </section>

        <h2 className="mt-6 text-base">Your learning path</h2>

        <ol className="mt-4 space-y-4">
          {course.lessons.map((lesson, i) => {
            const done = i < completed;
            const locked = i > completed;
            return (
              <li key={lesson.title} className={i % 2 ? "pl-8" : "pr-8"}>
                <Link
                  to="/course/$slug/lesson/$index"
                  params={{ slug, index: String(i + 1) }}
                  disabled={locked}
                  className={`flex items-center gap-3 rounded-3xl bg-card p-3 shadow-soft transition-transform ${
                    locked ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                      locked
                        ? "bg-muted text-muted-foreground"
                        : "bg-hero-gradient text-primary-foreground shadow-card"
                    }`}
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
                    <Check className="h-5 w-5 shrink-0 rounded-full bg-success p-1 text-success-foreground" />
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
