import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, HelpCircle, LogIn, LogOut, Sparkles, Target } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useCompanion } from "@/lib/companion-store";
import { companionName } from "@/lib/companions";
import { supabase } from "@/integrations/supabase/client";
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

function ProfileScreen() {
  const { state } = useProgress();
  const { companion, signedIn } = useCompanion();
  const navigate = useNavigate();
  const rows = [
    {
      icon: Target,
      label: "Daily goal",
      value: `${state.dailyGoal} lesson${state.dailyGoal === 1 ? "" : "s"}`,
    },
  ];

  return (
    <PhoneFrame>
      <div className="px-5 pb-8">
        <h1 className="pt-4 text-3xl">Profile</h1>

        <div className="mt-4 flex items-center gap-4 rounded-3xl bg-hero-gradient p-5 text-primary-foreground shadow-card">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/20">
            <CompanionAvatar companion={companion} size={56} />
          </div>
          <div>
            <p className="text-lg font-extrabold">Learning with {companionName(companion)}</p>
            <p className="text-xs opacity-85">
              {state.xp.toLocaleString()} XP · {state.streak} day streak
            </p>
          </div>
        </div>

        <ul className="mt-5 overflow-hidden rounded-3xl bg-card shadow-soft">
          {rows.map(({ icon: Icon, label, value }) => (
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

        <Link
          to="/onboarding"
          className="mt-4 flex items-center gap-3 rounded-3xl bg-card px-4 py-4 shadow-soft transition-transform hover:-translate-y-0.5"
        >
          <CompanionAvatar companion={companion} size={40} />
          <span className="flex-1 text-sm font-bold">Change companion</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        {signedIn ? (
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
            className="mt-3 flex w-full items-center gap-3 rounded-3xl bg-card px-4 py-4 text-left shadow-soft"
          >
            <LogOut className="h-5 w-5 text-flame" />
            <span className="flex-1 text-sm font-bold">Sign out</span>
          </button>
        ) : (
          <Link
            to="/auth"
            className="mt-3 flex items-center gap-3 rounded-3xl bg-card px-4 py-4 shadow-soft"
          >
            <LogIn className="h-5 w-5 text-primary" />
            <span className="flex-1 text-sm font-bold">Save my progress</span>
            <Sparkles className="h-4 w-4 text-primary" />
          </Link>
        )}
      </div>
    </PhoneFrame>
  );
}
