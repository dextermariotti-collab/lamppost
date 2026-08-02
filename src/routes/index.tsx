import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, RefreshCw, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { clampBrief } from "@/lib/course-brief";
import foxMascot from "@/assets/fox-mascot.png";
import { PhoneFrame } from "@/components/PhoneFrame";
import { IDEAS } from "@/lib/courses";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lamppost — AI course creator for any topic" },
      {
        name: "description",
        content:
          "Lamppost turns any topic into a personalized mini-course with lessons, a learning path and quick quizzes.",
      },
      { property: "og:title", content: "Lamppost — AI course creator for any topic" },
      {
        property: "og:description",
        content: "Ask AI for a course on anything and start learning in seconds.",
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
  const [shuffle, setShuffle] = useState(0);
  const { state } = useProgress();

  const ideas = IDEAS.map((_, i) => IDEAS[(i + shuffle) % IDEAS.length]!);
  const continuing = Object.entries(state.courses).filter(([, c]) => c.completed < c.total);

  const start = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    navigate({ to: "/setup", search: clampBrief({ topic: trimmed }) });
  };

  return (
    <PhoneFrame>
      <div className="px-5 pb-6">
        <div className="flex items-center gap-3 py-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-soft">
            <img src={foxMascot} alt="Your Lamppost mascot" width={816} height={816} className="h-9 w-9 object-contain" />
          </div>
          <div className="flex flex-1 items-center justify-between gap-2 text-center">
            <Stat value={state.streak} label="day streak" emoji="🔥" />
            <Stat value={state.gems.toLocaleString()} label="gems" emoji="💎" />
            <Stat value={state.xp.toLocaleString()} label="XP" emoji="⭐" />
          </div>
        </div>

        <div className="relative mt-3">
          <h1 className="max-w-[16rem] text-[2rem] leading-tight">
            What do you want to <span className="text-primary">learn</span> today?
          </h1>
          <p className="mt-2 max-w-[15rem] text-sm text-muted-foreground">
            Ask AI to create a personalized course on any topic.
          </p>
          <img
            src={foxMascot}
            alt=""
            aria-hidden
            width={816}
            height={816}
            className="pointer-events-none absolute -top-2 right-0 h-32 w-32 animate-float object-contain"
          />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(topic);
          }}
          className="mt-5 rounded-3xl border-2 border-primary/40 bg-card p-4 shadow-card"
        >
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Create a course on Guitar Basics"
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

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-base">Try these ideas</h2>
          <button
            onClick={() => setShuffle((s) => s + 1)}
            aria-label="Shuffle ideas"
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {ideas.map((idea) => (
            <button
              key={idea.label}
              onClick={() => start(idea.topic)}
              className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm font-bold shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <span aria-hidden>{idea.emoji}</span>
              {idea.label}
            </button>
          ))}
        </div>

        {continuing.length > 0 && (
          <>
            <h2 className="mt-7 text-base">Continue learning</h2>
            <div className="mt-3 space-y-3">
              {continuing.map(([slug, course]) => {
                const pct = Math.round((course.completed / course.total) * 100);
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
                        {course.completed} of {course.total} lessons done
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-hero-gradient" style={{ width: `${pct}%` }} />
                        </div>
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
      </div>
    </PhoneFrame>
  );
}

function Stat({ value, label, emoji }: { value: string | number; label: string; emoji: string }) {
  return (
    <div className="leading-tight">
      <p className="text-sm font-extrabold">
        <span aria-hidden className="mr-1">
          {emoji}
        </span>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
