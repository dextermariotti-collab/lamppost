import { createFileRoute } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Your Progress — Lamppost" },
      { name: "description", content: "Track your streak, XP, gems and lessons completed across every Lamppost course." },
      { property: "og:title", content: "Your Progress — Lamppost" },
      { property: "og:description", content: "Streaks, XP and lessons completed at a glance." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/progress" }],
  }),
  component: ProgressScreen,
});

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

function ProgressScreen() {
  const { state } = useProgress();
  const lessonsDone = Object.values(state.courses).reduce((sum, c) => sum + c.completed, 0);

  return (
    <PhoneFrame>
      <div className="px-5 pb-8">
        <h1 className="pt-4 text-3xl">Your progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">Small steps, every single day.</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Tile label="Day streak" value={state.streak} emoji="🔥" />
          <Tile label="Lessons done" value={lessonsDone} emoji="✅" />
          <Tile label="Total XP" value={state.xp.toLocaleString()} emoji="⭐" />
          <Tile label="Gems" value={state.gems.toLocaleString()} emoji="💎" />
        </div>

        <div className="mt-5 rounded-3xl bg-card p-5 shadow-soft">
          <h2 className="text-base">This week</h2>
          <div className="mt-4 flex items-end justify-between gap-2">
            {WEEK.map((day, i) => {
              const height = 24 + ((i * 37) % 60);
              return (
                <div key={`${day}-${i}`} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-xl bg-hero-gradient"
                    style={{ height: `${height}px` }}
                  />
                  <span className="text-[11px] font-bold text-muted-foreground">{day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function Tile({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <div className="rounded-3xl bg-card p-4 shadow-soft">
      <span aria-hidden className="text-2xl">
        {emoji}
      </span>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
