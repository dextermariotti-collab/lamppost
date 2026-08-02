import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Sparkles } from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "My Courses — Lamppost" },
      { name: "description", content: "Every course Lamppost has built for you, with your progress on each one." },
      { property: "og:title", content: "My Courses — Lamppost" },
      { property: "og:description", content: "Pick up any of your AI-generated courses where you left off." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/courses" }],
  }),
  component: MyCourses,
});

function MyCourses() {
  const { state } = useProgress();
  const entries = Object.entries(state.courses);

  return (
    <PhoneFrame>
      <div className="px-5 pb-8">
        <h1 className="pt-4 text-3xl">My courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {entries.length} course{entries.length === 1 ? "" : "s"} built just for you.
        </p>

        <div className="mt-5 space-y-3">
          {entries.map(([slug, course]) => {
            const pct = Math.round((course.completed / course.total) * 100);
            return (
              <Link
                key={slug}
                to="/course/$slug"
                params={{ slug }}
                className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft transition-transform hover:-translate-y-0.5"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-xl">
                  📚
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{course.topic}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-hero-gradient" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground">{pct}%</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>

        <Link
          to="/"
          className="mt-5 flex items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-primary/40 p-5 text-sm font-bold text-primary"
        >
          <Sparkles className="h-4 w-4" />
          Create a new course
        </Link>
      </div>
    </PhoneFrame>
  );
}
