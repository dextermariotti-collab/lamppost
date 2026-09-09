import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Flame, Play, RotateCcw, Share2, Zap } from "lucide-react";
import { useEffect } from "react";
import { clampBrief } from "@/lib/course-brief";
import { Button } from "@/components/ui/button";
import { LessonTrail } from "@/components/LessonTrail";
import { PhoneFrame } from "@/components/PhoneFrame";
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
        { name: "twitter:card", content: "summary_large_image" },
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
    <PhoneFrame className="course-expedition">
      <div className="px-5 pb-10 pt-4">
        <header>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" aria-label="Back to home" onClick={() => navigate({ to: "/" })}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-1">
              <StatPill icon={Flame} value={state.streak} />
              <StatPill icon={Zap} value={state.xp} />
              <Button variant="ghost" size="icon" aria-label="Regenerate course" onClick={() => navigate({ to: "/setup", search: clampBrief({ topic: course.topic, ...course.brief }) })}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Share course" onClick={() => {
                const url = window.location.href;
                if (navigator.share) void navigator.share({ title: course.topic, url });
                else void navigator.clipboard?.writeText(url);
              }}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-7 border-l border-primary pl-4">
            <p className="font-graph text-xs font-bold text-muted-foreground">Learning expedition</p>
            <h1 className="mt-1 font-graph text-3xl font-bold leading-tight text-foreground">{course.topic}</h1>
            <p className="mt-2 max-w-[19rem] text-sm leading-relaxed text-muted-foreground">{course.tagline}</p>
          </div>

          <div className="mt-6 flex items-end justify-between border-b border-border pb-4">
            <div>
              <p className="font-graph text-3xl font-bold text-foreground">{pct}%</p>
              <p className="text-[11px] text-muted-foreground">{completed} of {total} checkpoints</p>
            </div>
            <Button onClick={() => navigate({ to: "/course/$slug/lesson/$index", params: { slug, index: String(nextIndex + 1) } })}>
              <Play className="h-4 w-4" />
              {completed === 0 ? "Begin route" : finished ? "Review route" : "Continue route"}
            </Button>
          </div>
        </header>

        <LessonTrail slug={slug} lessons={course.lessons} completed={completed} companion={companion} />
      </div>
    </PhoneFrame>
  );
}

function StatPill({
  icon: Icon,
  value,
}: {
  icon: typeof Flame;
  value: number;
}) {
  return (
    <span className="flex items-center gap-1 px-1.5 py-1 text-[11px] font-bold text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={2.2} />
      {value.toLocaleString()}
    </span>
  );
}
