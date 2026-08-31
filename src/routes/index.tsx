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
      <main className="journal-page min-h-full px-5 pb-10 pl-8">
        <header className="relative min-h-44 pt-6">
          <p className="font-note -rotate-1 text-sm text-muted-foreground">my learning journal</p>
          <h1 className="mt-1 text-[2.15rem] italic leading-none">Lamppost</h1>

          <Link to="/profile" aria-label="Open profile" className="absolute right-0 top-5 shrink-0">
            <CompanionAvatar
              companion={{ ...companion, expression: atRisk ? "calm" : "happy" }}
              size={44}
            />
          </Link>

          <div className="font-note absolute right-1 top-[5.4rem] rotate-2 text-[0.82rem] text-flame">
            <Flame
              aria-hidden="true"
              className="animate-streak-settle mr-1 inline-block h-4 w-4"
              strokeWidth={1.7}
            />
            {state.streak} day streak
          </div>
          <p className="font-note absolute right-[6.5rem] top-[7.25rem] -rotate-2 text-[0.78rem] text-subject-forest">
            {state.xp.toLocaleString()} xp earned
          </p>
          <p className="font-note absolute right-2 top-[8.65rem] rotate-1 text-[0.78rem] text-subject-terracotta">
            {Object.keys(state.courses).length} courses
          </p>
        </header>

        <section className="pb-7 pt-4">
          <p className="font-note -rotate-1 text-base text-primary">today’s review</p>
          <h2 className="mt-1 max-w-[20rem] text-[1.8rem] leading-[1.22]">
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
            onClick={() => navigate({ to: "/review" })}
            className="mt-5 h-11 w-full justify-between rounded-sm px-4 font-bold shadow-none"
          >
            <span>{dueItems.length === 0 ? "View review schedule" : "Begin today’s review"}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </section>

        {continuing.length > 0 && (
          <section className="pt-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xl">Continue learning</h2>
              <span className="font-note rotate-1 text-sm text-muted-foreground">table of contents</span>
            </div>
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
                    <span className={`font-note w-7 shrink-0 text-xl ${accent}`}>{String(index + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-semibold">{course.topic}</p>
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
          <h2 className="text-lg">Begin a new subject</h2>
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
                className="rounded-sm shadow-none"
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
