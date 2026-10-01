import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Share2, Trophy } from "lucide-react";
import { CompanionAura } from "@/components/CompanionAura";
import { Confetti } from "@/components/Confetti";
import { CountUp } from "@/components/CountUp";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ProgressRing } from "@/components/ProgressRing";
import { StreakFlame } from "@/components/StreakCalendar";
import { Button } from "@/components/ui/button";
import { useCompanion } from "@/lib/companion-store";
import {
  CURRICULUM_SLUG,
  lessonAt,
  unitById,
  unitProgress,
  type CurriculumLesson,
} from "@/lib/curriculum";
import { dayKey, useProgress } from "@/lib/progress";
import { shareUnitCard } from "@/lib/share-image";
import { unitAccent } from "@/lib/unit-accent";

/**
 * The end of a lesson: the mascot cheering, the XP just earned counting up, the streak, today's
 * goal, and what was practised. A unit's last lesson also earns a badge card to share. Only
 * what was actually done is listed, and the confetti only falls for a flawless run.
 */
export function LessonFinished({
  meta,
  lessonNumber,
  totalLessons,
  accuracy,
  answered,
  practised,
  xpEarned,
  wrote,
  takeaway,
}: {
  meta: CurriculumLesson;
  lessonNumber: number;
  totalLessons: number;
  /** 0-100, across the steps that were answered. */
  accuracy: number;
  answered: number;
  practised: string[];
  xpEarned: number;
  wrote: boolean;
  takeaway?: string | undefined;
}) {
  const navigate = useNavigate();
  const { companion } = useCompanion();
  const { state, streak, doneLessons } = useProgress();
  const doneToday = state.history[dayKey()] ?? 0;
  const goal = state.dailyGoal;
  const nextMeta = lessonAt(lessonNumber);
  const unitDone = !nextMeta || nextMeta.unitId !== meta.unitId;
  const unit = unitById(meta.unitId);
  const perfect = answered > 0 && accuracy === 100;
  const accent = unitAccent(meta.unitId);
  const unitLessonsDone = unitProgress(doneLessons).find((u) => u.unit.id === meta.unitId);

  return (
    <PhoneFrame showNav={false}>
      <div className="relative overflow-hidden px-5 py-8">
        {perfect && <Confetti count={34} big={unitDone} />}

        <div className="relative z-30 flex animate-pop-in flex-col items-center text-center">
          <CompanionAura
            companion={{ ...companion, expression: "excited" }}
            streak={streak}
            size={unitDone ? 128 : 104}
            pose="cheer"
            animate
          />
          <p className="mt-4 text-sm font-bold" style={{ color: accent.color }}>
            {unitDone ? "Unit complete" : "Lesson complete"}
          </p>
          <h1 className="mt-2 text-3xl leading-tight">
            {unitDone ? `${unit.title} — done.` : "You worked through it."}
          </h1>
          {perfect && (
            <p className="mt-2 text-sm font-bold text-success">
              Flawless run — every step right first time.
            </p>
          )}
          {takeaway && (
            <p className="mt-3 max-w-72 text-sm font-semibold leading-snug text-muted-foreground">
              To carry away: {takeaway}
            </p>
          )}
        </div>

        {unitDone ? (
          <div
            className="relative z-30 mt-6 overflow-hidden rounded-3xl border p-6 text-center"
            style={{ background: accent.wash, borderColor: accent.border }}
          >
            <span
              aria-hidden
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full text-5xl"
              style={{ background: "var(--card)", border: `2px solid ${accent.border}` }}
            >
              {unit.emoji}
            </span>
            <p
              className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wide"
              style={{ color: accent.color }}
            >
              <Trophy aria-hidden className="h-3.5 w-3.5" /> Unit badge earned
            </p>
            <h2 className="mt-1 text-2xl leading-tight">{unit.title}</h2>
            <div className="mt-4 grid grid-cols-3 divide-x divide-border/60">
              {[
                { label: "accuracy", value: `${accuracy}%` },
                { label: "day streak", value: `${streak}` },
                { label: "lessons", value: `${unitLessonsDone?.completed ?? 0}` },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                void shareUnitCard({
                  unitTitle: unit.title,
                  emoji: unit.emoji,
                  accuracy,
                  streak,
                  lessons: unitLessonsDone?.completed ?? 0,
                  accent: accent.fixed,
                })
              }
              className="mt-5 h-11 w-full rounded-full text-sm font-semibold"
            >
              <Share2 aria-hidden className="h-4 w-4" /> Share this badge
            </Button>
          </div>
        ) : (
          <div className="relative z-30 mt-6 flex items-center justify-center gap-6">
            <ProgressRing pct={accuracy} size={124} stroke={11} label="accuracy" />
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                XP earned
              </p>
              <CountUp
                value={xpEarned}
                className="font-display text-4xl font-semibold text-foreground"
                format={(n) => `+${n}`}
              />
              <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
                <StreakFlame streak={streak} size={16} />
                {streak} day{streak === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-3xl bg-card p-5 shadow-soft">
          <p className="text-[11px] font-semibold text-primary-text">Today's goal</p>
          <p className="mt-1 text-sm font-bold text-foreground">
            {Math.min(doneToday, goal)} of {goal} lessons
          </p>
          <div
            role="progressbar"
            aria-label="Today's goal"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={Math.min(doneToday, goal)}
            className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-hero-gradient transition-all duration-700"
              style={{ width: `${Math.min(100, Math.round((doneToday / goal) * 100))}%` }}
            />
          </div>
          <p className="mt-4 text-[11px] font-semibold text-primary-text">What you practised</p>
          <ul className="mt-2 space-y-1.5">
            {practised.map((label) => (
              <li key={label} className="flex items-center gap-2 text-[13px] font-semibold">
                <Check
                  aria-hidden
                  className="h-4 w-4 shrink-0 rounded-full bg-success/15 p-0.5 text-success"
                />
                {label}
              </li>
            ))}
            {wrote && (
              <li className="flex items-center gap-2 text-[13px] font-semibold">
                <Check
                  aria-hidden
                  className="h-4 w-4 shrink-0 rounded-full bg-success/15 p-0.5 text-success"
                />
                Writing an argument
              </li>
            )}
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {lessonNumber < totalLessons && (
            <Button
              onClick={() =>
                navigate({
                  to: "/course/$slug/lesson/$index",
                  params: { slug: CURRICULUM_SLUG, index: String(lessonNumber + 1) },
                })
              }
              className="h-12 w-full rounded-full bg-hero-gradient text-base font-semibold shadow-card"
            >
              Continue to the next lesson
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/" })}
            className="h-12 w-full rounded-full text-base font-semibold"
          >
            Back to home
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/courses" })}
            className="h-11 w-full rounded-full text-sm font-bold text-muted-foreground"
          >
            See my path
          </Button>
        </div>
      </div>
    </PhoneFrame>
  );
}
