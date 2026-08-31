import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { clampBrief } from "@/lib/course-brief";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { AnimatedBar } from "@/components/AnimatedBar";
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
      <div className="px-5 pb-8">
        <header className="border-b border-border py-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Your learning journal
          </p>
          <div className="mt-1 flex items-end justify-between gap-4">
            <h1 className="text-3xl italic">Lamppost</h1>
            <Link to="/profile" aria-label="Open profile" className="shrink-0">
              <CompanionAvatar
                companion={{ ...companion, expression: atRisk ? "calm" : "happy" }}
                size={44}
              />
            </Link>
          </div>
        </header>

        <section className="pt-7">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Today’s review
          </p>
          <h2 className="mt-2 text-[1.75rem] leading-tight">
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
          <button
            onClick={() => navigate({ to: "/review" })}
            className="mt-5 flex h-12 w-full items-center justify-between rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
          >
            <span>{dueItems.length === 0 ? "View review schedule" : "Begin today’s review"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>

        <div className="mt-7 grid grid-cols-3 border-y border-border py-4">
          <JournalStat value={`${state.streak}`} label="day streak" />
          <JournalStat value={state.xp.toLocaleString()} label="XP earned" bordered />
          <JournalStat value={Object.keys(state.courses).length.toString()} label="courses" />
        </div>

        {continuing.length > 0 && (
          <section className="mt-7">
            <h2 className="text-lg">Continue learning</h2>
            <div className="mt-3 divide-y divide-border border-y border-border">
              {continuing.map(([slug, course]) => {
                const pct = Math.round((course.completed / course.total) * 100);
                const left = course.total - course.completed;
                return (
                  <button
                    key={slug}
                    onClick={() => navigate({ to: "/course/$slug", params: { slug } })}
                    className="flex w-full items-center gap-3 py-4 text-left transition-colors duration-200 hover:bg-primary-soft/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-primary-soft">
                      <BookOpen className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{course.topic}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {left} lesson{left === 1 ? "" : "s"} remaining
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <AnimatedBar pct={pct} className="flex-1" />
                        <span className="text-[11px] font-semibold text-muted-foreground">{pct}%</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-lg">Begin a new subject</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Name what you want to understand. We’ll shape the course together.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              start(topic);
            }}
            className="mt-4 rounded-lg border border-border bg-card p-3 focus-within:border-primary"
          >
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What do you want to learn?"
              aria-label="Course topic"
              className="w-full bg-transparent px-1 py-2 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-2 flex justify-end border-t border-border pt-3">
              <button
                type="submit"
                aria-label="Create course"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      </div>
    </PhoneFrame>
  );
}

function JournalStat({
  value,
  label,
  bordered = false,
}: {
  value: string;
  label: string;
  bordered?: boolean;
}) {
  return (
    <div className={`text-center ${bordered ? "border-x border-border" : ""}`}>
      <p className="font-display text-xl font-semibold">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
