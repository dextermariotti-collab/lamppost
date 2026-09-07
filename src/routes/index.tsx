import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Flame, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { clampBrief } from "@/lib/course-brief";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { categoryFor } from "@/lib/categories";
import { hasSeenOnboarding, useCompanion } from "@/lib/companion-store";
import { deriveInsights, useProgress } from "@/lib/progress";
import { reviewUrgency, useReviewQueue } from "@/lib/reviews";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lamppost — daily review for anything you learn" },
      {
        name: "description",
        content:
          "Lamppost keeps what you learn: a daily spaced repetition queue, streaks that compound, and AI-built mini-courses on any topic.",
      },
      { property: "og:title", content: "Lamppost — daily review for anything you learn" },
      {
        property: "og:description",
        content: "Review what's due today, keep your streak alive, and build a course on anything.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const { state } = useProgress();
  const { companion } = useCompanion();

  // First run: introduce the app and let them pick a companion.
  useEffect(() => {
    if (!hasSeenOnboarding()) navigate({ to: "/onboarding", replace: true });
  }, [navigate]);

  const completedBySlug = useMemo(
    () => Object.fromEntries(Object.entries(state.courses).map(([slug, c]) => [slug, c.completed])),
    [state.courses],
  );
  const { items: dueItems } = useReviewQueue(completedBySlug);
  const insights = deriveInsights(state);

  const maxOverdue = dueItems[0]?.overdueDays ?? 0;
  const urgency = reviewUrgency(dueItems.length, maxOverdue);
  const atRisk = insights.atRisk || urgency === "piling";

  const continuing = Object.entries(state.courses).filter(([, c]) => c.completed < c.total);

  const start = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    navigate({ to: "/setup", search: clampBrief({ topic: trimmed }) });
  };

  return (
    <PhoneFrame>
      <main className="journal-page min-h-full px-5 pb-10">
        <header className="relative flex min-h-48 items-start justify-between gap-6 pt-7">
          <div className="relative z-10 pt-1">
            <h1 className="text-[2.2rem] italic leading-none">Lamppost</h1>
            <p className="mt-3 max-w-40 text-sm leading-relaxed text-muted-foreground">
              A little light for everything you’re learning.
            </p>
          </div>

          <div className="relative z-10 flex w-32 flex-col items-center text-center">
            <span aria-hidden="true" className="lamplight-glow absolute -inset-9 -z-10 rounded-full" />
            <Link to="/profile" aria-label="Open profile" className="shrink-0">
              <CompanionAvatar
                companion={{ ...companion, expression: atRisk ? "calm" : "happy" }}
                size={58}
              />
            </Link>
            <div className="mt-1 flex items-center gap-1.5 text-primary">
              <Flame aria-hidden="true" className="animate-streak-settle h-5 w-5" strokeWidth={2} />
              <span className="text-3xl font-extrabold leading-none">{state.streak}</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-foreground">day streak</p>
            {state.freezes > 0 && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-extrabold text-primary">
                <Snowflake aria-hidden="true" className="h-3 w-3" strokeWidth={2.4} />
                {state.freezes} freeze{state.freezes === 1 ? "" : "s"}
              </span>
            )}
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              {state.xp.toLocaleString()} XP · {Object.keys(state.courses).length} courses
            </p>
          </div>
        </header>

        <section className="border-t border-border pb-8 pt-6">
          <p className="text-sm font-bold text-primary">Today’s review</p>
          <h2 className="mt-2 max-w-[20rem] font-sans text-[1.65rem] font-bold leading-[1.25]">
            {dueItems.length === 0
              ? "Nothing due today."
              : `${dueItems.length} idea${dueItems.length === 1 ? "" : "s"} ready to revisit.`}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {dueItems.length === 0
              ? "Finish a lesson and Lamppost will bring it back when recall matters."
              : urgency === "piling"
                ? `Your oldest review is ${maxOverdue} days overdue. A short session will bring you current.`
                : "A short recall session will help today’s learning stick."}
          </p>
          <Button
            onClick={() => navigate({ to: dueItems.length === 0 ? "/schedule" : "/review" })}
            className="mt-5 h-11 w-full justify-between px-4 font-bold shadow-none"
          >
            <span>{dueItems.length === 0 ? "View review schedule" : "Begin today’s review"}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
          {dueItems.length > 0 && (
            <Link
              to="/schedule"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary"
            >
              See what comes back next
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          )}

        </section>

        {continuing.length > 0 && (
          <section className="pt-5">
            <h2 className="font-sans text-lg font-bold">Continue learning</h2>
            <ol className="mt-2">
              {continuing.map(([slug, course], index) => {
                const accent = subjectAccent(categoryFor(course.topic).id);
                return (
                  <li key={slug} className="border-b border-border/80">
                  <Link
                    key={slug}
                    to="/course/$slug"
                    params={{ slug }}
                    className="group flex min-h-20 w-full items-center gap-4 py-4 text-left"
                  >
                    <span className={`w-7 shrink-0 text-sm font-bold ${accent}`}>{String(index + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold">{course.topic}</p>
                      <p className={`mt-1 text-xs font-bold ${accent}`}>
                        {course.completed} of {course.total} lessons
                      </p>
                    </div>
                    <ArrowRight className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${accent}`} />
                  </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <section className="mt-8 border-t border-border/80 pt-6">
          <h2 className="font-sans text-lg font-bold">Begin a new subject</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Name what you want to understand. We’ll shape the course together.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              start(topic);
            }}
            className="mt-4 border-b border-foreground/40 pb-2 focus-within:border-primary"
          >
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What do you want to learn?"
              aria-label="Course topic"
              className="w-full bg-transparent px-1 py-2 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-2 flex justify-end">
              <Button
                type="submit"
                size="icon"
                aria-label="Create course"
                className="shadow-none"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </section>
      </main>
    </PhoneFrame>
  );
}

function subjectAccent(category: string) {
  if (["arts", "music", "food"].includes(category)) return "text-subject-amber";
  if (["finance", "writing", "mind"].includes(category)) return "text-subject-forest";
  if (["science", "health"].includes(category)) return "text-subject-terracotta";
  return "text-subject-blue";
}
