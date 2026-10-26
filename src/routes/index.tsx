import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Newspaper, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AiLabel } from "@/components/AiLabel";
import { Button } from "@/components/ui/button";
import { PhoneFrame } from "@/components/PhoneFrame";
import { LampMark, LineBullet, Stops } from "@/components/LineBullet";
import { StreakFlame } from "@/components/StreakCalendar";
import { WeeklyRecapCard } from "@/components/WeeklyRecapCard";
import { DAILY_CASES } from "@/content/cases";
import { hasSeenOnboarding } from "@/lib/companion-store";
import {
  CURRICULUM_SLUG,
  CURRICULUM_TITLE,
  TOTAL_LESSONS,
  UNITS,
  lessonAt,
  lessonPlace,
  unitById,
  unitProgress,
} from "@/lib/curriculum";
import { CASE_SOURCES, caseUnits, isAiCase, useDailyCase, type CasePick } from "@/lib/daily-case";
import { useAiCaseTopUp } from "@/lib/daily-case-ai";
import { readAttemptStore } from "@/lib/exercise-store";
import { useProgress } from "@/lib/progress";
import { upNextIndex } from "@/lib/progress-view";
import {
  nextReviewLine,
  reviewUrgencyFor,
  useDrillSchedule,
  useDueDrills,
} from "@/lib/review-drills";
import { laterCheckDue, useUnitChecks } from "@/lib/unit-checks";
import { useToday } from "@/lib/use-today";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lamppost — train your critical thinking daily" },
      {
        name: "description",
        content:
          "Lamppost is a critical thinking trainer: seven units on claims, evidence, fallacies, biases, arguments, probability and media literacy.",
      },
      { property: "og:title", content: "Lamppost — train your critical thinking daily" },
      {
        property: "og:description",
        content:
          "Spot the flaw in everyday arguments, test your reasoning, and keep the habit going.",
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
  const { state, streak, doneLessons, doneToday, registerCourse } = useProgress();
  // Re-renders Home at local midnight and on coming back, so the goal, reviews and case move on.
  const today = useToday();
  // Makes sure the curriculum exists locally with its lesson titles.

  // First run: introduce the app. Nothing renders until that check has run, so a new
  // visitor never sees home flash first.
  const [gate, setGate] = useState<"checking" | "open">("checking");
  useEffect(() => {
    if (!hasSeenOnboarding()) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    setGate("open");
  }, [navigate]);

  useEffect(() => {
    registerCourse(CURRICULUM_SLUG, CURRICULUM_TITLE, TOTAL_LESSONS);
  }, [registerCourse]);

  const lessonsDone = doneLessons.size;
  const { total: dueTotal, maxOverdue } = useDueDrills();
  const { items: scheduled } = useDrillSchedule();
  const { pick: todaysCase, wantsNew } = useDailyCase(DAILY_CASES, doneLessons);
  const writingCase = useAiCaseTopUp(wantsNew);
  const { checks } = useUnitChecks();
  const laterDue = laterCheckDue(
    checks,
    UNITS.map((u) => u.id),
    today,
  );

  const urgency = reviewUrgencyFor(dueTotal, maxOverdue);
  // The counters wait for the first lesson: before it they would only be zeros.
  const started = lessonsDone > 0 || state.xp > 0 || streak > 0;

  // Follows the line the learner is on (a unit chosen at onboarding included), not lesson 1.
  const nextIndex = upNextIndex(doneLessons, state.doneLessonIds);
  const next = lessonAt(nextIndex);
  const finished = lessonsDone >= TOTAL_LESSONS;

  // The sign only says things about its own lesson: here, that it was begun and left.
  const nextId = next?.id;
  const nextDone = doneLessons.has(nextIndex);
  const [begun, setBegun] = useState(false);
  useEffect(() => {
    setBegun(nextId !== undefined && !nextDone && hasAnswers(nextId));
  }, [nextId, nextDone]);
  const unit = unitById(next?.unitId ?? "claims");
  const place = lessonPlace(nextIndex);
  const minutes = Math.max(5, (next?.drills.length ?? 4) * 2);

  const units = useMemo(() => unitProgress(doneLessons), [doneLessons]);
  const where = units[place.unitIndex] ?? units[units.length - 1]!;
  // Once every lesson is done, Home is about keeping it sharp: the case, the checks, the reviews.
  const afterChecksLeft = UNITS.filter((u) => !checks[u.id]?.after).length;

  if (gate === "checking") {
    return (
      <PhoneFrame showNav={false}>
        <div className="min-h-full" aria-busy="true" />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div className="min-h-full px-5 pb-10">
        {/* Header: the mark, and how you're doing once there is something to show */}
        <header className="flex min-h-12 items-center gap-3 pt-5">
          {/* From 1024px the sidebar carries the wordmark. */}
          <span className="legend flex items-center gap-1.5 text-foreground lg:hidden">
            <LampMark className="h-5 w-5" /> Lamppost
          </span>
          {started && (
            <span className="ml-auto flex items-center gap-4 text-sm font-bold text-foreground">
              <Link
                to="/progress"
                className="flex min-h-11 items-center gap-1.5"
                aria-label={`${streak} day streak`}
              >
                <StreakFlame streak={streak} />
                {streak}
              </Link>
              <span className="font-mono text-xs text-muted-foreground">
                {Math.min(doneToday, state.dailyGoal)} / {state.dailyGoal} today
              </span>
            </span>
          )}
        </header>

        {/* The main action: one sign for what's next */}
        <p className="legend mt-4 text-muted-foreground">
          {finished ? "Keep it sharp" : "Up next"}
        </p>
        {finished && todaysCase ? (
          <CaseSign pick={todaysCase} writing={writingCase} />
        ) : (
          <section className="sign mt-2 p-4">
            <p className="legend flex items-center gap-2 text-muted-foreground">
              <LineBullet unitId={unit.id} />
              {unit.title} / stop {place.stop} of {place.stops}
            </p>
            <h1 className="mt-2.5 text-[28px] leading-[1.05]">{next?.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{next?.objective}</p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              about {minutes} min · lesson {nextIndex + 1} of {TOTAL_LESSONS}
            </p>
            {begun && (
              <p className="mt-1 text-xs text-muted-foreground">You've started this one before.</p>
            )}
            <Button
              type="button"
              onClick={() =>
                navigate({
                  to: "/course/$slug/lesson/$index",
                  params: { slug: CURRICULUM_SLUG, index: String(nextIndex + 1) },
                })
              }
              className="mt-4 h-12 w-full justify-between rounded-sm bg-primary px-4 text-base font-bold text-primary-foreground hover:bg-primary/90"
            >
              Start the lesson
              <ArrowRight aria-hidden className="h-5 w-5" />
            </Button>
          </section>
        )}

        {/* Reviews, today's case and any open checks: one row each, between rules */}
        <div className="mt-5 border-t-2 border-edge">
          {dueTotal > 0 ? (
            <button
              type="button"
              onClick={() => navigate({ to: "/review" })}
              className="flex min-h-14 w-full items-center gap-3 border-b-2 border-edge py-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-foreground">
                  Today's review · {dueTotal} due
                </span>
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  {urgency === "piling" && maxOverdue >= 2
                    ? `Oldest is ${maxOverdue} days overdue.`
                    : "The skills that slipped, back before they fade."}
                </span>
              </span>
              <ArrowRight aria-hidden className="h-5 w-5 shrink-0 text-foreground" />
            </button>
          ) : (
            scheduled.length > 0 && (
              <Link
                to="/schedule"
                className="flex min-h-12 items-center gap-2 border-b-2 border-edge py-2 text-[13px] font-semibold text-muted-foreground"
              >
                <Check aria-hidden className="h-4 w-4 text-success" />
                No reviews due. {nextReviewLine(scheduled)}
              </Link>
            )
          )}

          {!finished && started && todaysCase && (
            <Link
              to="/case"
              className="flex min-h-14 w-full items-center gap-3 border-b-2 border-edge py-3"
            >
              <Newspaper aria-hidden className="h-5 w-5 shrink-0 text-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-foreground">Today's case</span>
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  {todaysCase.done
                    ? "Done for today. A new one tomorrow."
                    : "One real-world text, three questions. Counts toward your streak."}
                </span>
              </span>
              {!todaysCase.done && (
                <ArrowRight aria-hidden className="h-5 w-5 shrink-0 text-foreground" />
              )}
            </Link>
          )}

          {finished && (
            <Link
              to="/final-check"
              className="flex min-h-14 w-full items-center gap-3 border-b-2 border-edge py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-foreground">
                  {afterChecksLeft > 0 ? "The final check" : "Before and after"}
                </span>
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  {afterChecksLeft > 0
                    ? `${afterChecksLeft} after-check${afterChecksLeft === 1 ? "" : "s"} to go, then every line side by side.`
                    : "Every line's checks, side by side."}
                </span>
              </span>
              <ArrowRight aria-hidden className="h-5 w-5 shrink-0 text-foreground" />
            </Link>
          )}

          {laterDue.length > 0 && (
            <Link
              to="/check/$unitId/$phase"
              params={{ unitId: laterDue[0]!, phase: "later" }}
              className="flex min-h-14 w-full items-center gap-3 border-b-2 border-edge py-3"
            >
              <LineBullet unitId={laterDue[0]!} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-foreground">
                  Three months on: {unitById(laterDue[0]!).title}
                </span>
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  Your after-check's three questions, once more, to see what stuck.
                  {laterDue.length > 1 &&
                    ` ${laterDue.length - 1} more line${laterDue.length === 2 ? "" : "s"} ready too.`}
                </span>
              </span>
              <ArrowRight aria-hidden className="h-5 w-5 shrink-0 text-foreground" />
            </Link>
          )}

          {started && (
            <Link
              to="/look"
              className="flex min-h-14 w-full items-center gap-3 border-b-2 border-edge py-3"
            >
              <Search aria-hidden className="h-5 w-5 shrink-0 text-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-foreground">
                  Check something you saw
                </span>
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  Paste a post, an ad or a chatbot answer and get your lessons' questions about it.
                </span>
              </span>
              <ArrowRight aria-hidden className="h-5 w-5 shrink-0 text-foreground" />
            </Link>
          )}
        </div>

        <WeeklyRecapCard className="mt-4" />

        {/* The seven units as lines; the full map lives under My Path */}
        <section className="mt-6" aria-labelledby="lines-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="lines-heading" className="legend text-muted-foreground">
              Lines
            </h2>
            <Link to="/courses" className="legend flex min-h-11 items-center gap-1 text-foreground">
              My Path <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="space-y-1">
            {units.map((u) => (
              <li key={u.unit.id}>
                <Link
                  to="/courses"
                  className="flex min-h-10 items-center gap-3"
                  aria-label={`Unit ${u.index + 1}, ${u.unit.title}: ${u.completed} of ${u.total} lessons`}
                >
                  <LineBullet unitId={u.unit.id} />
                  <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                    {u.unit.title}
                  </span>
                  <Stops done={u.completed} total={u.total} />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {finished
              ? `${TOTAL_LESSONS} of ${TOTAL_LESSONS} lessons · map complete`
              : `${lessonsDone} of ${TOTAL_LESSONS} lessons · now on line ${where.index + 1}`}
          </p>
          {finished && (
            <p className="mt-1 text-xs text-muted-foreground">
              Any lesson can be played again from My Path, and its notes stay there too.
            </p>
          )}
        </section>
      </div>
    </PhoneFrame>
  );
}

/** Whether any of a lesson's steps were answered, i.e. it was begun at some point. */
function hasAnswers(lessonId: string) {
  const prefix = `${lessonId}#`;
  return Object.keys(readAttemptStore()).some((key) => key.startsWith(prefix));
}

/** After the map: today's case is the main thing to do. */
function CaseSign({ pick, writing }: { pick: CasePick; writing: boolean }) {
  const units = caseUnits(pick.case);
  if (writing) {
    return (
      <section className="sign mt-2 p-4" role="status">
        <p className="legend text-muted-foreground">Today's case</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          You've read every case so far, so today's is being written. It'll be here in a moment.
        </p>
      </section>
    );
  }
  return (
    <section className="sign mt-2 p-4">
      <p className="legend flex items-center gap-2 text-muted-foreground">
        <span className="flex gap-1">
          {units.map((u) => (
            <LineBullet key={u} unitId={u} />
          ))}
        </span>
        Today's case / {CASE_SOURCES[pick.case.source]}
      </p>
      <h1 className="mt-2.5 text-[28px] leading-[1.05]">{pick.case.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {pick.done
          ? "Done for today. A new case is ready tomorrow."
          : "One real-world text and three questions from three different lines."}
      </p>
      {!pick.done && <p className="mt-2 font-mono text-xs text-muted-foreground">about 3 min</p>}
      {isAiCase(pick.case) && <AiLabel className="mt-2" />}
      <Button
        asChild
        variant={pick.done ? "secondary" : "default"}
        className="mt-4 h-12 w-full justify-between rounded-sm px-4 text-base font-bold"
      >
        <Link to="/case">
          {pick.done ? "Look at it again" : "Read today's case"}
          <ArrowRight aria-hidden className="h-5 w-5" />
        </Link>
      </Button>
    </section>
  );
}
