import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { clampBrief } from "@/lib/course-brief";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { KnowledgeGraph } from "@/components/KnowledgeGraph";
import { PhoneFrame } from "@/components/PhoneFrame";
import { hasSeenOnboarding, useCompanion } from "@/lib/companion-store";
import { useStoredCourses } from "@/lib/course-store";
import { useProgress } from "@/lib/progress";
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
  const { courses } = useStoredCourses();
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

  const maxOverdue = dueItems[0]?.overdueDays ?? 0;
  const urgency = reviewUrgency(dueItems.length, maxOverdue);

  const start = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    navigate({ to: "/setup", search: clampBrief({ topic: trimmed }) });
  };

  return (
    <PhoneFrame className="graph-home">
      <main className="min-h-full px-5 pb-10">
        <header className="flex items-start justify-between gap-4 pt-7">
          <div>
            <h1 className="max-w-56 text-lg font-bold leading-snug">Your knowledge map</h1>
            <p className="mt-1 max-w-56 text-sm leading-relaxed text-muted-foreground">
              Your subjects, lit by the ideas they share.
            </p>
          </div>

          <Link to="/profile" aria-label="Open profile" className="shrink-0 opacity-85 transition-opacity hover:opacity-100">
            <CompanionAvatar
              companion={{ ...companion, expression: urgency === "piling" ? "calm" : "happy" }}
              size={44}
            />
          </Link>
        </header>

        <section className="mt-5">
          <KnowledgeGraph courses={courses} progress={state.courses} streak={state.streak} xp={state.xp} />
        </section>

        <section className="border-t border-border py-5">
          <p className="text-sm font-bold text-foreground">Today’s review</p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate({ to: dueItems.length === 0 ? "/schedule" : "/review" })}
            className="mt-2 h-auto w-full justify-start whitespace-normal rounded-none bg-transparent p-0 text-left text-sm font-normal leading-relaxed text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground"
          >
            {dueItems.length === 0
              ? "Nothing due today. Review schedule is clear."
              : urgency === "piling"
                ? `${dueItems.length} ideas due. Oldest is ${maxOverdue} days overdue.`
                : `${dueItems.length} idea${dueItems.length === 1 ? "" : "s"} ready to revisit.`}
          </Button>
        </section>

        <section className="border-t border-border pt-5">
          <h2 className="text-sm font-bold text-foreground">Begin a new subject</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Add another node to the map.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              start(topic);
            }}
            className="mt-4 border-b border-border pb-2 focus-within:border-primary"
          >
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What do you want to learn?"
              aria-label="Course topic"
              className="w-full bg-transparent px-1 py-2 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-2 flex justify-end">
              <Button
                type="submit"
                size="icon"
                aria-label="Create course"
                className="rounded-full shadow-none"
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
