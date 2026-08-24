import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Flame, Lock, Play, RotateCcw, Share2, Zap } from "lucide-react";
import { useEffect } from "react";
import { clampBrief } from "@/lib/course-brief";
import { AnimatedBar } from "@/components/AnimatedBar";
import { CompanionPeek } from "@/components/CompanionPeek";
import { LessonTrail } from "@/components/LessonTrail";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useCompanion } from "@/lib/companion-store";
import { useStoredCourse } from "@/lib/course-store";
import { titleFromSlug } from "@/lib/courses";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/course/$slug/")({
  head: ({ params }) => {
    const topic = titleFromSlug(params.slug);
    return {
      meta: [
        { title: `${topic} learning path — Lamppost` },
        {
          name: "description",
          content: `Follow your AI-built ${topic} path lesson by lesson on Lamppost.`,
        },
        { property: "og:title", content: `${topic} — Lamppost` },
        { property: "og:description", content: `Your personalized ${topic} course path.` },
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
  const { companion } = useCompanion();

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
  const total = course.lessons.length;
  const completed = state.courses[slug]?.completed ?? 0;
  const pct = Math.round((completed / total) * 100);
  const nextIndex = Math.min(completed, total - 1);
  const finished = completed >= total;

  return (
    <PhoneFrame>
      <ScreenHeader
        backTo="/"
        right={
          <>
            <StatPill icon={Flame} value={state.streak} tone="flame" />
            <StatPill icon={Zap} value={state.xp} tone="xp" />
            <button
              aria-label="Regenerate course"
              onClick={() =>
                navigate({ to: "/setup", search: clampBrief({ topic: course.topic, ...course.brief }) })
              }
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
          </>
        }
      />

      <div className="px-5 pb-10">
        {/* Course header — title, blurb, segmented progress. */}
        <CompanionPeek companion={companion} size={72} side="right" className="mt-7">
          <section className="relative animate-rise-in rounded-3xl bg-hero-gradient p-5 text-primary-foreground shadow-card">
            <div className="max-w-[70%]">
              <h1 className="text-xl leading-tight">{course.topic}</h1>
              <p className="mt-1 text-xs font-semibold opacity-85">{course.tagline}</p>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex flex-1 gap-1">
                {Array.from({ length: Math.min(total, 12) }, (_, i) => {
                  const step = Math.round((i / Math.min(total, 12)) * total);
                  return (
                    <span
                      key={i}
                      className={`h-2.5 flex-1 rounded-full transition-colors duration-500 ${
                        step < completed ? "bg-primary-foreground" : "bg-primary-foreground/30"
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-extrabold">{pct}%</span>
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
              {completed === 0 ? "Start" : finished ? "Review" : "Continue"}
            </button>
          </section>
        </CompanionPeek>

        <h2 className="mt-6 text-base">Your learning path</h2>

        <LessonTrail slug={slug} lessons={course.lessons} completed={completed} companion={companion} />

        {/* Locked-unit card: the trail keeps going once this course is done. */}
        {!finished && (
          <CompanionPeek companion={companion} size={68} side="center" className="mt-14">
            <section className="animate-rise-in overflow-hidden rounded-3xl bg-hero-gradient px-5 pb-5 pt-8 text-center text-primary-foreground shadow-card">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/20">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-lg">Next unit locked</h3>
              <p className="mx-auto mt-1 max-w-[16rem] text-xs font-semibold opacity-85">
                Complete all the lessons in this unit to advance and continue your learning.
              </p>
              <div className="mx-auto mt-4 max-w-[15rem]">
                <AnimatedBar pct={pct} />
              </div>
              <button
                onClick={() =>
                  navigate({
                    to: "/course/$slug/lesson/$index",
                    params: { slug, index: String(nextIndex + 1) },
                  })
                }
                className="mt-4 w-full rounded-full bg-primary-foreground px-5 py-3 text-sm font-extrabold text-primary shadow-soft transition-transform hover:scale-[1.02] active:scale-95"
              >
                <span className="inline-flex items-center justify-center gap-1.5">Keep Going <Flame className="h-4 w-4" /></span>
              </button>
            </section>
          </CompanionPeek>
        )}
      </div>
    </PhoneFrame>
  );
}

function StatPill({
  icon: Icon,
  value,
  tone,
}: {
  icon: typeof Flame;
  value: number;
  tone: "flame" | "xp";
}) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1.5 text-[11px] font-extrabold shadow-soft">
      <Icon className={`h-3.5 w-3.5 ${tone === "flame" ? "text-flame" : "text-xp"}`} strokeWidth={2.6} />
      {value.toLocaleString()}
    </span>
  );
}
