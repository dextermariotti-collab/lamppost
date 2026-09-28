import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Flame, Play, Share2, Zap } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LessonTrail } from "@/components/LessonTrail";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useCompanion } from "@/lib/companion-store";
import {
  CURRICULUM_SLUG,
  CURRICULUM_TAGLINE,
  CURRICULUM_TITLE,
  TOTAL_LESSONS,
  UNITS,
} from "@/lib/curriculum";
import { useCurriculumCourse } from "@/lib/curriculum-store";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/course/$slug/")({
  head: () => ({
    meta: [
      { title: "Critical thinking path — Lamppost" },
      {
        name: "description",
        content:
          "Work through Lamppost's seven-unit critical thinking curriculum: claims, evidence, fallacies, biases, arguments, probability and media literacy.",
      },
      { property: "og:title", content: "Critical thinking path — Lamppost" },
      { property: "og:description", content: CURRICULUM_TAGLINE },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `/course/${CURRICULUM_SLUG}` }],
  }),
  component: CoursePath,
});

function CoursePath() {
  const { slug: slugParam } = Route.useParams();
  const slug = CURRICULUM_SLUG;
  const navigate = useNavigate();
  const course = useCurriculumCourse();
  const { state, streak, registerCourse } = useProgress();
  const { companion } = useCompanion();

  // There is only one curriculum now: any other slug redirects to it.
  useEffect(() => {
    if (slugParam !== CURRICULUM_SLUG) {
      navigate({ to: "/course/$slug", params: { slug: CURRICULUM_SLUG }, replace: true });
    }
  }, [slugParam, navigate]);

  useEffect(() => {
    registerCourse(CURRICULUM_SLUG, CURRICULUM_TITLE, TOTAL_LESSONS);
  }, [registerCourse]);

  const total = TOTAL_LESSONS;
  const completed = state.courses[slug]?.completed ?? 0;
  const pct = Math.round((completed / total) * 100);
  const nextIndex = Math.min(completed, total - 1);
  const finished = completed >= total;

  return (
    <PhoneFrame className="course-expedition">
      <div className="px-5 pb-10 pt-4">
        <header>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to home"
              onClick={() => navigate({ to: "/" })}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-1">
              <StatPill icon={Flame} value={streak} />
              <StatPill icon={Zap} value={state.xp} />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Share course"
                onClick={() => {
                  const url = window.location.href;
                  if (navigator.share) void navigator.share({ title: CURRICULUM_TITLE, url });
                  else void navigator.clipboard?.writeText(url);
                }}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-7 border-l border-primary pl-4">
            <p className="font-graph text-xs font-bold text-muted-foreground">
              {UNITS.length} units · {total} lessons
            </p>
            <h1 className="mt-1 font-graph text-3xl font-bold leading-tight text-foreground">
              {CURRICULUM_TITLE}
            </h1>
            <p className="mt-2 max-w-[19rem] text-sm leading-relaxed text-muted-foreground">
              {CURRICULUM_TAGLINE}
            </p>
          </div>

          <div className="mt-6 flex items-end justify-between border-b border-border pb-4">
            <div>
              <p className="font-graph text-3xl font-bold text-foreground">{pct}%</p>
              <p className="text-[11px] text-muted-foreground">
                {completed} of {total} lessons
              </p>
            </div>
            <Button
              onClick={() =>
                navigate({
                  to: "/course/$slug/lesson/$index",
                  params: { slug, index: String(nextIndex + 1) },
                })
              }
            >
              <Play className="h-4 w-4" />
              {completed === 0 ? "Begin unit 1" : finished ? "Review route" : "Continue"}
            </Button>
          </div>
        </header>

        <LessonTrail
          slug={slug}
          lessons={course.lessons}
          completed={completed}
          companion={companion}
          unitNames={UNITS.map((unit) => unit.title)}
        />
      </div>
    </PhoneFrame>
  );
}

function StatPill({ icon: Icon, value }: { icon: typeof Flame; value: number }) {
  return (
    <span className="flex items-center gap-1 px-1.5 py-1 text-[11px] font-bold text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={2.2} />
      {value.toLocaleString()}
    </span>
  );
}
