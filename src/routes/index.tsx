import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Layers, Send, Sparkles, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { clampBrief } from "@/lib/course-brief";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { AnimatedBar } from "@/components/AnimatedBar";
import { StreakHero } from "@/components/StreakHero";
import { hasSeenOnboarding, useCompanion } from "@/lib/companion-store";
import { companionName } from "@/lib/companions";
import { deriveInsights, useProgress } from "@/lib/progress";
import { reviewUrgency, useReviewQueue } from "@/lib/reviews";
import { cn } from "@/lib/utils";

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
      <div className="px-5 pb-6">
        {/* Streak is the hero metric; gems and XP sit under it as support. */}
        <div className="flex items-start justify-between gap-3 py-3">
          <div>
            <StreakHero streak={state.streak} atRisk={atRisk} />
            <div className="mt-3 flex items-center gap-4">
              <MiniStat value={state.gems.toLocaleString()} label="gems" emoji="💎" />
              <span className="h-3 w-px bg-border" />
              <MiniStat value={state.xp.toLocaleString()} label="XP" emoji="⭐" />
            </div>
          </div>
          <Link
            to="/profile"
            aria-label="Your companion"
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-soft"
          >
            {/* The companion reacts to streak state instead of sitting there decoratively. */}
            <CompanionAvatar
              companion={{ ...companion, expression: atRisk ? "calm" : "excited" }}
              size={50}
              animate={!atRisk}
            />
          </Link>
        </div>

        {/* 1 — Reviews due: the primary action on this screen. */}
        <button
          onClick={() => navigate({ to: "/review" })}
          className={cn(
            "mt-2 flex w-full animate-rise-in items-center gap-4 rounded-3xl border-2 p-4 text-left shadow-card transition-transform hover:-translate-y-0.5 active:scale-[0.99]",
            urgency === "piling"
              ? "border-flame/50 bg-flame/8"
              : urgency === "clear"
                ? "border-border bg-card"
                : "border-primary/40 bg-card",
          )}
        >
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
              urgency === "piling" ? "bg-flame/15 text-flame" : "bg-hero-gradient text-primary-foreground",
            )}
          >
            <Zap className={cn("h-7 w-7", urgency !== "clear" && "animate-flame")} strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Daily review
            </p>
            <p className="text-lg font-extrabold leading-tight">
              {dueItems.length === 0
                ? "All caught up"
                : `${dueItems.length} review${dueItems.length === 1 ? "" : "s"} due today`}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">
              {dueItems.length === 0
                ? "Finish a lesson to schedule your next recall"
                : urgency === "piling"
                  ? `Oldest is ${maxOverdue}d overdue — clear it in a couple of minutes`
                  : insights.atRisk
                    ? `Streak at risk · ${insights.hoursLeft}h left today`
                    : "Two minutes keeps it all in memory"}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </button>

        {/* 3 — AI Course Creator, unchanged but now secondary. */}
        <div className="relative mt-7">
          <h1 className="max-w-[16rem] text-[1.6rem] leading-tight">
            Learn something <span className="text-primary">new</span>?
          </h1>
          <p className="mt-1.5 max-w-[15rem] text-sm text-muted-foreground">
            {companionName(companion)} is ready — ask AI to build a course on any topic.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(topic);
          }}
          className="mt-4 rounded-3xl border-2 border-primary/25 bg-card p-4 shadow-soft"
        >
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What do you want to learn?"
            aria-label="Course topic"
            className="w-full bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-6 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold text-primary">
              <Sparkles className="h-4 w-4" />
              AI Course Creator
            </span>
            <button
              type="submit"
              aria-label="Create course"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-hero-gradient text-primary-foreground shadow-card transition-transform hover:scale-105 active:scale-95"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>

        {/* 5 — Continue learning, with eased fills and near-completion framing. */}
        {continuing.length > 0 && (
          <>
            <h2 className="mt-7 text-base">Continue learning</h2>
            <div className="mt-3 space-y-3">
              {continuing.map(([slug, course]) => {
                const pct = Math.round((course.completed / course.total) * 100);
                const left = course.total - course.completed;
                return (
                  <button
                    key={slug}
                    onClick={() => navigate({ to: "/course/$slug", params: { slug } })}
                    className="flex w-full items-center gap-3 rounded-3xl bg-card p-3 text-left shadow-soft transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-2xl">
                      📚
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{course.topic}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {left <= 2 ? (
                          <span className="font-bold text-primary">
                            {left} lesson{left === 1 ? "" : "s"} to finish
                          </span>
                        ) : (
                          `${course.completed} of ${course.total} lessons done`
                        )}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <AnimatedBar pct={pct} className="flex-1" />
                        <span className="text-[11px] font-bold text-muted-foreground">{pct}%</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {Object.keys(state.courses).length > 1 && (
          <div className="mt-6 flex items-center gap-3 rounded-3xl border border-dashed border-border bg-secondary/60 p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              Cross-course connections are coming — Lamppost will surface ideas that link your{" "}
              {Object.keys(state.courses).length} courses.
            </p>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}

function MiniStat({ value, label, emoji }: { value: string; label: string; emoji: string }) {
  return (
    <p className="text-xs font-bold text-muted-foreground">
      <span aria-hidden className="mr-1">
        {emoji}
      </span>
      <span className="text-foreground">{value}</span> {label}
    </p>
  );
}
