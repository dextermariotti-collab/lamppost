import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, Crown, Sparkles, Timer } from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { AnimatedBar } from "@/components/AnimatedBar";
import { Confetti } from "@/components/Confetti";
import { categoryFor } from "@/lib/categories";
import { useProgress } from "@/lib/progress";
import { useReviewQueue } from "@/lib/reviews";

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

const SEEN_KEY = "lamppost-mastered-seen-v1";

function readSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function MyCourses() {
  const { state, hydrated } = useProgress();

  const completedBySlug = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(state.courses).map(([slug, c]) => [slug, c.completed]),
      ) as Record<string, number>,
    [state.courses],
  );
  const { items: dueItems } = useReviewQueue(completedBySlug);

  const dueBySlug = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of dueItems) map[item.slug] = (map[item.slug] ?? 0) + 1;
    return map;
  }, [dueItems]);

  const courses = useMemo(() => {
    const list = Object.entries(state.courses).map(([slug, course]) => {
      const pct = course.total > 0 ? Math.round((course.completed / course.total) * 100) : 0;
      return {
        slug,
        ...course,
        pct,
        mastered: pct >= 100,
        remaining: Math.max(0, course.total - course.completed),
        due: dueBySlug[slug] ?? 0,
      };
    });
    // Courses needing attention float to the top; mastered ones settle at the bottom.
    return list.sort(
      (a, b) =>
        b.due - a.due ||
        Number(a.mastered) - Number(b.mastered) ||
        b.pct - a.pct ||
        a.topic.localeCompare(b.topic),
    );
  }, [state.courses, dueBySlug]);

  // One-time celebration the first time a course hits 100%.
  const [celebrateSlug, setCelebrateSlug] = useState<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const seen = readSeen();
    const fresh = courses.find((c) => c.mastered && !seen.includes(c.slug));
    if (!fresh) return;
    setCelebrateSlug(fresh.slug);
    try {
      window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, fresh.slug]));
    } catch {
      /* ignore */
    }
    const id = window.setTimeout(() => setCelebrateSlug(null), 2600);
    return () => window.clearTimeout(id);
  }, [hydrated, courses]);

  const dueTotal = dueItems.length;
  const masteredCount = courses.filter((c) => c.mastered).length;

  return (
    <PhoneFrame>
      <div className="relative px-5 pb-8">
        {celebrateSlug && <Confetti big />}

        <h1 className="pt-4 text-3xl">My courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {courses.length} course{courses.length === 1 ? "" : "s"} built just for you
          {masteredCount > 0 && ` · ${masteredCount} mastered`}
          {dueTotal > 0 && ` · ${dueTotal} review${dueTotal === 1 ? "" : "s"} due`}.
        </p>

        <div className="mt-5 space-y-3">
          {courses.map((course, i) => {
            const category = categoryFor(course.topic);
            const Icon = category.icon;
            const celebrating = celebrateSlug === course.slug;
            return (
              <Link
                key={course.slug}
                to="/course/$slug"
                params={{ slug: course.slug }}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`flex animate-rise-in items-center gap-3 rounded-3xl border-2 p-4 shadow-soft transition-transform hover:-translate-y-0.5 ${
                  course.mastered
                    ? "border-success/40 bg-success/5"
                    : course.due > 0
                      ? "border-primary/35 bg-card"
                      : "border-transparent bg-card"
                } ${celebrating ? "animate-pop-in ring-2 ring-success" : ""}`}
              >
                <div className="relative shrink-0">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${category.tile}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  {course.mastered && (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-success-foreground shadow-soft">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold">{course.topic}</p>
                    {course.mastered && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                        <Crown className="h-3 w-3" />
                        Mastered
                      </span>
                    )}
                    {!course.mastered && course.due > 0 && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        <Timer className="h-3 w-3" />
                        {course.due} due
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                    {category.label}
                    {" · "}
                    {course.mastered
                      ? "All lessons complete"
                      : course.remaining <= 2 && course.completed > 0
                        ? `${course.remaining} lesson${course.remaining === 1 ? "" : "s"} left`
                        : `${course.completed}/${course.total} lessons`}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <AnimatedBar pct={course.pct} className="flex-1" />
                    <span className="text-[11px] font-bold text-muted-foreground">{course.pct}%</span>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>

        {courses.length === 0 && hydrated && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            No courses yet — build your first one below.
          </p>
        )}

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
