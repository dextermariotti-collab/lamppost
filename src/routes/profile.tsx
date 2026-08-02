import { createFileRoute } from "@tanstack/react-router";
import { Bell, ChevronRight, Globe, HelpCircle, Moon, Target } from "lucide-react";
import foxMascot from "@/assets/fox-mascot.png";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Lamppost" },
      { name: "description", content: "Your Lamppost learner profile, daily goal and app preferences." },
      { property: "og:title", content: "Profile — Lamppost" },
      { property: "og:description", content: "Manage your learning goal, reminders and preferences." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/profile" }],
  }),
  component: ProfileScreen,
});

const ROWS = [
  { icon: Target, label: "Daily goal", value: "1 lesson" },
  { icon: Bell, label: "Reminders", value: "8:00 PM" },
  { icon: Globe, label: "Language", value: "English" },
  { icon: Moon, label: "Appearance", value: "Light" },
  { icon: HelpCircle, label: "Help & feedback", value: "" },
];

function ProfileScreen() {
  const { state } = useProgress();

  return (
    <PhoneFrame>
      <div className="px-5 pb-8">
        <h1 className="pt-4 text-3xl">Profile</h1>

        <div className="mt-4 flex items-center gap-4 rounded-3xl bg-hero-gradient p-5 text-primary-foreground shadow-card">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/20">
            <img src={foxMascot} alt="Your avatar" width={816} height={816} loading="lazy" className="h-14 w-14 object-contain" />
          </div>
          <div>
            <p className="text-lg font-extrabold">Curious Learner</p>
            <p className="text-xs opacity-85">
              {state.xp.toLocaleString()} XP · {state.streak} day streak
            </p>
          </div>
        </div>

        <ul className="mt-5 overflow-hidden rounded-3xl bg-card shadow-soft">
          {ROWS.map(({ icon: Icon, label, value }) => (
            <li
              key={label}
              className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-0"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="flex-1 text-sm font-bold">{label}</span>
              <span className="text-xs text-muted-foreground">{value}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </li>
          ))}
        </ul>
      </div>
    </PhoneFrame>
  );
}
