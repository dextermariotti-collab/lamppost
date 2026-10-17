import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Share2 } from "lucide-react";
import { LineBullet } from "@/components/LineBullet";
import { PhoneFrame } from "@/components/PhoneFrame";
import { StreakFlame } from "@/components/StreakCalendar";
import { Button } from "@/components/ui/button";
import {
  CURRICULUM_SLUG,
  TOTAL_LESSONS,
  UNITS,
  lessonAt,
  lessonPlace,
  nextLessonIndex,
  unitById,
  unitProgress,
  type CurriculumLesson,
} from "@/lib/curriculum";
import { dayKey, useProgress } from "@/lib/progress";
import { shareUnitCard } from "@/lib/share-image";
import { unitAccent } from "@/lib/unit-accent";
import { useUnitChecks } from "@/lib/unit-checks";
import { TryItCard } from "./NotesView";

/**
 * The end of a lesson, as an arrival board: where you are on the line, what this lesson earned,
 * today's goal, what was practiced, and the next stop. Finishing a whole unit adds its line
 * badge to share, and finishing the last of the 35 points to the final check. Nothing bounces or
 * falls from the sky; the numbers are the reward.
 */
export function LessonFinished({
  meta,
  lessonNumber,
  totalLessons,
  accuracy,
  answered,
  practiced,
  xpEarned,
  wrote,
  takeaway,
  tryIt,
  mapComplete = false,
}: {
  meta: CurriculumLesson;
  lessonNumber: number;
  totalLessons: number;
  /** 0-100, across the steps that were answered. */
  accuracy: number;
  answered: number;
  practiced: string[];
  xpEarned: number;
  wrote: boolean;
  takeaway?: string | undefined;
  /** Something to try outside the app, from the lesson's notes. */
  tryIt?: string | undefined;
  /** This lesson was the last of the 35 still to do. */
  mapComplete?: boolean;
}) {
  const navigate = useNavigate();
  const { state, streak, doneLessons } = useProgress();
  const doneToday = state.history[dayKey()] ?? 0;
  const goal = state.dailyGoal;
  const unit = unitById(meta.unitId);
  const accent = unitAccent(meta.unitId);
  const unitLessons = unitProgress(doneLessons).find((u) => u.unit.id === meta.unitId);
  const unitDone = unitLessons?.state === "complete";
  const perfect = answered > 0 && accuracy === 100;
  const nextIndex = nextLessonIndex(doneLessons);
  const nextMeta = doneLessons.size < TOTAL_LESSONS ? lessonAt(nextIndex) : undefined;
  const place = lessonPlace(lessonNumber - 1);
  const { checks } = useUnitChecks();
  const checksLeft = UNITS.filter((u) => !checks[u.id]?.after).length;

  return (
    <PhoneFrame showNav={false}>
      <div className="px-5 py-8">
        <p className="legend flex items-center gap-2 text-muted-foreground">
          <LineBullet unitId={meta.unitId} />
          {unit.title} / stop {place.stop} of {place.stops}
        </p>
        <p className="legend mt-5 text-muted-foreground">
          {mapComplete ? "Map complete" : unitDone ? "Line complete" : "Lesson complete"}
        </p>
        <h1 className="mt-1 text-[30px] leading-[1.05]">{meta.title}</h1>
        {perfect && (
          <p className="mt-2 text-sm font-bold text-success">Every step right first time.</p>
        )}
        {takeaway && <p className="mt-3 text-[15px] leading-relaxed text-foreground">{takeaway}</p>}

        {/* What this lesson added, as three plain numbers */}
        <dl className="mt-5 grid grid-cols-3 border-y-2 border-edge">
          {[
            { label: "Accuracy", value: answered > 0 ? `${accuracy}%` : "–" },
            { label: "XP earned", value: `+${xpEarned}` },
            { label: "Streak", value: `${streak} day${streak === 1 ? "" : "s"}` },
          ].map((stat, i) => (
            <div key={stat.label} className={`py-3 ${i > 0 ? "border-l border-border pl-3" : ""}`}>
              <dt className="legend text-muted-foreground">{stat.label}</dt>
              <dd className="mt-1 flex items-center gap-1 font-mono text-lg font-bold text-foreground">
                {stat.label === "Streak" && <StreakFlame streak={streak} size={16} />}
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

        {mapComplete && (
          <section className="sign mt-5 p-5" aria-labelledby="map-complete">
            <div aria-hidden className="flex gap-1">
              {UNITS.map((u) => (
                <LineBullet key={u.id} unitId={u.id} size="lg" />
              ))}
            </div>
            <h2 id="map-complete" className="mt-3 text-xl leading-tight">
              Every line, every stop
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              All seven lines and all {TOTAL_LESSONS} lessons. From here it's upkeep: a case a day,
              and each line comes back after 30, 60 and 120 days so it stays sharp.
            </p>
            <Button
              asChild
              className="mt-4 h-auto min-h-12 w-full justify-between rounded-sm px-4 py-2.5 text-left"
            >
              <Link to="/final-check">
                <span className="min-w-0">
                  <span className="legend block opacity-80">
                    {checksLeft > 0
                      ? `${checksLeft} after-check${checksLeft === 1 ? "" : "s"} to go`
                      : "All after-checks taken"}
                  </span>
                  <span className="block text-base font-bold">
                    {checksLeft > 0 ? "Take the final check" : "See your before and after"}
                  </span>
                </span>
                <ArrowRight aria-hidden className="h-5 w-5 shrink-0" />
              </Link>
            </Button>
          </section>
        )}

        {unitDone && (
          <section className="sign mt-5 p-5" aria-labelledby="line-badge">
            <div className="flex items-center gap-4">
              <LineBullet unitId={meta.unitId} size="xl" />
              <div className="min-w-0">
                <p className="legend text-muted-foreground">Line badge</p>
                <h2 id="line-badge" className="mt-0.5 text-xl leading-tight">
                  {unit.title}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  All {unitLessons?.total ?? 5} stops on this line.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                void shareUnitCard({
                  unitTitle: unit.title,
                  line: accent.line,
                  lineColor: accent.fixed,
                  lineOn: accent.fixedOn,
                  accuracy,
                  streak,
                  lessons: unitLessons?.completed ?? 0,
                })
              }
              className="mt-4 h-11 w-full rounded-sm text-sm font-bold"
            >
              <Share2 aria-hidden className="h-4 w-4" /> Share this badge
            </Button>
          </section>
        )}

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="legend text-muted-foreground">Today's goal</p>
            <p className="font-mono text-sm font-bold text-foreground">
              {Math.min(doneToday, goal)} / {goal}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Today's goal"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={Math.min(doneToday, goal)}
            className="mt-2 h-1.5 overflow-hidden bg-muted"
          >
            <div
              className="h-full bg-foreground"
              style={{ width: `${Math.min(100, Math.round((doneToday / goal) * 100))}%` }}
            />
          </div>
          <p className="legend mt-5 text-muted-foreground">What you practiced</p>
          <ul className="mt-2 space-y-1.5">
            {[...practiced, ...(wrote ? ["Writing an argument"] : [])].map((label) => (
              <li key={label} className="flex items-center gap-2 text-sm font-semibold">
                <Check aria-hidden className="h-4 w-4 shrink-0 text-success" strokeWidth={3} />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {tryIt && <TryItCard text={tryIt} className="mt-5" />}

        <div className="mt-6 flex flex-col gap-2">
          {nextMeta && (
            <Button
              onClick={() =>
                navigate({
                  to: "/course/$slug/lesson/$index",
                  params: { slug: CURRICULUM_SLUG, index: String(nextIndex + 1) },
                })
              }
              className="h-auto min-h-14 w-full justify-between rounded-sm bg-primary px-4 py-2.5 text-left text-primary-foreground hover:bg-primary/90"
            >
              <span className="min-w-0">
                <span className="legend block opacity-80">Next stop</span>
                <span className="block truncate text-base font-bold">{nextMeta.title}</span>
              </span>
              <ArrowRight aria-hidden className="h-5 w-5 shrink-0" />
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/" })}
            className="h-12 w-full rounded-sm text-base font-bold"
          >
            Back to home
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/courses" })}
            className="h-11 w-full rounded-sm text-sm font-bold text-muted-foreground"
          >
            See my path
          </Button>
          <p className="sr-only">
            Lesson {lessonNumber} of {totalLessons}.
          </p>
        </div>
      </div>
    </PhoneFrame>
  );
}
