import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Flame, Lightbulb, Share2, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { ReportContentButton } from "@/components/ReportContentButton";
import { useCompanion, useSessionUser } from "@/lib/companion-store";
import { PhoneFrame } from "@/components/PhoneFrame";
import { PracticeChat } from "@/components/PracticeChat";
import { SocraticPopup } from "@/components/SocraticPopup";
import { ExerciseRunner } from "@/components/exercises/ExerciseRunner";
import { DrillVariant } from "@/components/exercises/DrillVariant";
import { WrittenArgument } from "@/components/exercises/WrittenArgument";
import { PartsStatus, PendingPart } from "@/components/LessonParts";
import { ChestOffer } from "@/components/ChestOffer";
import { SuccessBurst } from "@/components/SuccessBurst";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { CURRICULUM_SLUG, TOTAL_LESSONS, lessonAt, unitById, unitProgress } from "@/lib/curriculum";
import { unitAccent } from "@/lib/unit-accent";
import { shareUnitCard } from "@/lib/share-image";
import { Confetti } from "@/components/Confetti";
import { CountUp } from "@/components/CountUp";
import { ProgressRing } from "@/components/ProgressRing";
import { CompanionAura } from "@/components/CompanionAura";
import { StreakFlame } from "@/components/StreakCalendar";
import { useCurriculumCourse, useCurriculumLesson } from "@/lib/curriculum-store";
import { EXERCISE_LABEL, describeExercise } from "@/lib/exercises";
import { useLessonAttempts } from "@/lib/exercise-store";
import { needsFitnessDisclaimer } from "@/lib/moderation";
import { dayKey, useProgress } from "@/lib/progress";
import { recordWrittenScore } from "@/lib/mastery";
import { trackDrillResult } from "@/lib/review-drills";
import { recordDrillOutcome } from "@/lib/rating";
import { celebrateAnswer, comboBonus } from "@/components/AnswerFeedback";
import type { PracticeClose } from "@/lib/practice";

export const Route = createFileRoute("/course/$slug/lesson/$index")({
  head: ({ params }) => {
    const meta = lessonAt(Math.max(Number(params.index) || 1, 1) - 1);
    const title = meta?.title ?? "Critical thinking lesson";
    return {
      meta: [
        { title: `${title} — Lamppost critical thinking` },
        {
          name: "description",
          content:
            meta?.objective ??
            "Train one reasoning skill with mixed drills and a graded written argument.",
        },
        { property: "og:title", content: `${title} — Lamppost` },
        {
          property: "og:description",
          content: meta?.objective ?? "Practise spotting weak reasoning in real arguments.",
        },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: `/course/${params.slug}/lesson/${params.index}` }],
    };
  },
  component: LessonScreen,
});

/** Roughly one in three correct answers also gets a Socratic nudge. */
const SOCRATIC_CHANCE = 1 / 3;

function LessonScreen() {
  const { slug: slugParam, index } = Route.useParams();
  const slug = CURRICULUM_SLUG;
  const navigate = useNavigate();
  const course = useCurriculumCourse();
  const lessonNumber = Math.min(Math.max(Number(index) || 1, 1), TOTAL_LESSONS);
  const {
    state,
    streak,
    hydrated,
    completeLesson,
    recordPractice,
    recordExercise,
    recordArgument,
  } = useProgress();
  const completedLessons = state.courses[CURRICULUM_SLUG]?.completed ?? 0;
  const {
    lesson,
    drills: exercises,
    written,
    complete,
    meta,
    loading,
    error,
    notice,
    failed,
    retry,
    ready,
  } = useCurriculumLesson(lessonNumber - 1, completedLessons);
  const { companion } = useCompanion();
  const { userId } = useSessionUser();
  const { attempts, record } = useLessonAttempts(meta?.id ?? `lesson-${lessonNumber}`);

  /** Page 0 = concept card, 1..n = exercises, then written argument, then summary. */
  const [page, setPage] = useState(0);
  const [completing, setCompleting] = useState(false);
  /** True once the celebration has played and the results screen is showing. */
  const [finished, setFinished] = useState(false);
  const [socratic, setSocratic] = useState<{ index: number; correct: boolean } | null>(null);
  const [argumentGrade, setArgumentGrade] = useState<number | null>(null);
  const [skippedWriting, setSkippedWriting] = useState(false);
  /** Set after two or more missed drills: one easier drill plus a re-explanation. */
  const [easier, setEasier] = useState(false);
  const [easierDone, setEasierDone] = useState(false);
  /** Consecutive correct drills in this lesson, for the combo bonus. */
  const [combo, setCombo] = useState(0);
  /**
   * XP when the lesson opened, so the results screen can show what was earned.
   * Captured once the real numbers have loaded (on a hard reload the first render
   * only has the empty server placeholder) and again for each lesson.
   */
  const xpAtStart = useRef<number | null>(null);
  const xpNow = useRef(state.xp);
  xpNow.current = state.xp;
  useEffect(() => {
    if (hydrated) xpAtStart.current = xpNow.current;
  }, [index, hydrated]);

  useEffect(() => {
    setPage(0);
    setCompleting(false);
    setFinished(false);
    setSocratic(null);
    setArgumentGrade(null);
    setSkippedWriting(false);
    setEasier(false);
    setEasierDone(false);
    setCombo(0);
  }, [index]);

  // Old topic courses no longer exist: send any other slug to the curriculum.
  useEffect(() => {
    if (slugParam !== CURRICULUM_SLUG) {
      navigate({
        to: "/course/$slug/lesson/$index",
        params: { slug: CURRICULUM_SLUG, index: String(lessonNumber) },
        replace: true,
      });
    }
  }, [slugParam, lessonNumber, navigate]);

  if (!ready || !lesson) {
    return (
      <PhoneFrame showNav={false}>
        <div className="px-5 py-8">
          <p className="text-xs font-bold text-primary-text">
            {unitById(meta?.unitId ?? "claims").title}
          </p>
          <h1 className="mt-1 text-2xl leading-tight">{meta?.title ?? "Loading lesson"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{meta?.objective}</p>

          {error ? (
            <div className="mt-6 rounded-3xl bg-card p-5 shadow-soft" role="alert">
              <p className="text-sm font-semibold text-foreground">{error}</p>
              <Button onClick={retry} className="mt-4 h-11 w-full rounded-full">
                Try again
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-4" aria-busy={loading}>
              {/* The idea is ready at once: it comes from the curriculum, not the model. */}
              {meta && (
                <article className="rounded-3xl bg-card p-5 shadow-card">
                  <p className="text-[11px] font-semibold text-primary-text">The idea</p>
                  <p className="mt-3 text-[15px] font-semibold leading-relaxed text-foreground/85">
                    {meta.keyIdea}
                  </p>
                  <div className="mt-4 space-y-2" aria-hidden>
                    <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted" />
                    <div className="h-3 w-3/5 animate-pulse rounded-full bg-muted" />
                  </div>
                </article>
              )}
              <p role="status" className="text-sm font-semibold text-muted-foreground">
                Writing your worked example…
              </p>
            </div>
          )}
        </div>
      </PhoneFrame>
    );
  }

  // A lesson that is still being written has its written task on the way; a finished
  // one without a written task simply has no such step.
  const hasWrittenPage = written !== null || !complete;
  const drillsReady = exercises.filter((drill) => drill !== null).length;
  const easierPage = easier ? exercises.length + 1 : null;
  const writtenPage = exercises.length + 1 + (easier ? 1 : 0);
  const summaryPage = writtenPage + (hasWrittenPage ? 1 : 0);
  const totalPages = summaryPage + 1;

  const onConcept = page === 0;
  const onExercise = page >= 1 && page <= exercises.length;
  const exerciseIndex = page - 1;
  const currentExercise = onExercise ? (exercises[exerciseIndex] ?? undefined) : undefined;
  const currentAttempt = onExercise ? attempts[exerciseIndex] : undefined;
  const onEasier = easierPage !== null && page === easierPage;
  const onWritten = hasWrittenPage && page === writtenPage;
  const onSummary = page === summaryPage;

  const stepPct = Math.round(
    ((lessonNumber - 1 + Math.min(page + 1, totalPages) / totalPages) / TOTAL_LESSONS) * 100,
  );

  const answerExercise = (answer: unknown, score: number) => {
    const fresh = record(exerciseIndex, answer, score);
    const correct = score === 1;
    const streakNow = correct ? combo + 1 : 0;
    setCombo(streakNow);
    const bonus = correct ? comboBonus(streakNow) : 0;
    if (fresh) recordExercise(score, bonus);
    celebrateAnswer({
      correct,
      xp: Math.max(5, Math.round(25 * Math.min(Math.max(score, 0), 1))),
      combo: streakNow,
      bonus,
      ...(currentExercise ? { note: EXERCISE_LABEL[currentExercise.kind] } : {}),
    });
    // Shaky drills earn a spaced review as a fresh variant of the same skill.
    if (meta && currentExercise) {
      const confidence = (answer as { confidence?: number } | null)?.confidence;
      trackDrillResult(meta.id, currentExercise.kind, score, confidence);
      recordDrillOutcome(meta.id, {
        score,
        difficulty: 2,
        ...(typeof confidence === "number" ? { confidence } : {}),
      });
    }
    // Two or more misses: earn one easier drill and a plain re-explanation.
    if (!correct) {
      const missed =
        Object.values(attempts).filter((a) => a.score < 1).length + (fresh && score < 1 ? 1 : 0);
      if (missed >= 2 && !easier) setEasier(true);
    }
    if (!correct || Math.random() < SOCRATIC_CHANCE) {
      setSocratic({ index: exerciseIndex, correct });
    }
  };

  const finishLesson = () => {
    if (completing || finished) return;
    completeLesson(slug, course.topic, lessonNumber - 1, course.lessons.length);
    setCompleting(true);
    window.setTimeout(() => {
      setCompleting(false);
      setFinished(true);
    }, 1450);
  };

  const handlePracticeDone = (close: PracticeClose | null) => {
    if (close) recordPractice(close.verdict, close.connectionMade);
    finishLesson();
  };

  const practiceText = [
    lesson.concept?.body ?? "",
    lesson.concept?.example ?? "",
    ...(lesson.keyPoints ?? []),
  ]
    .filter(Boolean)
    .join("\n\n");

  const canContinue = onExercise
    ? currentAttempt !== undefined
    : onEasier
      ? easierDone
      : onWritten
        ? argumentGrade !== null || skippedWriting
        : true;

  const nextLabel = onConcept
    ? "Start training"
    : onExercise
      ? exerciseIndex + 1 === exercises.length
        ? hasWrittenPage
          ? "Write your argument"
          : "See the summary"
        : "Next drill"
      : onEasier
        ? hasWrittenPage
          ? "Write your argument"
          : "See the summary"
        : onWritten
          ? "See the summary"
          : lessonNumber < course.lessons.length
            ? "Continue"
            : "Finish course";

  if (finished) {
    const scores = exercises.map((_, i) => attempts[i]?.score ?? 0);
    const answeredCount = exercises.filter((_, i) => attempts[i] !== undefined).length;
    const accuracy =
      answeredCount > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / answeredCount) * 100) : 0;
    const xpEarned = Math.max(state.xp - (xpAtStart.current ?? state.xp), 0);
    const doneToday = state.history[dayKey()] ?? 0;
    const goal = state.dailyGoal;
    // Only what was actually done gets listed.
    const practised = Array.from(
      new Set(
        exercises.flatMap((e, i) =>
          e && attempts[i] !== undefined ? [EXERCISE_LABEL[e.kind]] : [],
        ),
      ),
    );
    const nextMeta = lessonAt(lessonNumber);
    const unitDone = !nextMeta || nextMeta.unitId !== meta?.unitId;
    const unitTitle = unitById(meta?.unitId ?? "claims").title;

    const perfect = answeredCount > 0 && accuracy === 100;
    const accent = unitAccent(meta?.unitId ?? "claims");
    const unitLessonsDone = unitProgress(completedLessons).find((u) => u.unit.id === meta?.unitId);

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
              {unitDone ? `${unitTitle} — done.` : "You trained your reasoning."}
            </h1>
            {perfect && (
              <p className="mt-2 text-sm font-bold text-success">
                Flawless run — every drill right.
              </p>
            )}
          </div>

          {unitDone ? (
            /* Unit trophy card, with a share image built from these real stats. */
            <div
              className="relative z-30 mt-6 overflow-hidden rounded-3xl border p-6 text-center"
              style={{ background: accent.wash, borderColor: accent.border }}
            >
              <span
                aria-hidden
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-full text-5xl"
                style={{ background: "var(--card)", border: `2px solid ${accent.border}` }}
              >
                {unitById(meta?.unitId ?? "claims").emoji}
              </span>
              <p
                className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wide"
                style={{ color: accent.color }}
              >
                <Trophy className="h-3.5 w-3.5" /> Unit badge earned
              </p>
              <h2 className="mt-1 text-2xl leading-tight">{unitTitle}</h2>
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
                    unitTitle,
                    emoji: unitById(meta?.unitId ?? "claims").emoji,
                    accuracy,
                    streak,
                    lessons: unitLessonsDone?.completed ?? 0,
                    accent: accent.fixed,
                  })
                }
                className="mt-5 h-11 w-full rounded-full text-sm font-semibold"
              >
                <Share2 className="h-4 w-4" /> Share this badge
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
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-hero-gradient transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((doneToday / goal) * 100))}%` }}
              />
            </div>
            <p className="mt-4 text-[11px] font-semibold text-primary-text">What you practised</p>
            <ul className="mt-2 space-y-1.5">
              {practised.map((label) => (
                <li key={label} className="flex items-center gap-2 text-[13px] font-semibold">
                  <Check className="h-4 w-4 shrink-0 rounded-full bg-success/15 p-0.5 text-success" />
                  {label}
                </li>
              ))}
              {argumentGrade !== null && (
                <li className="flex items-center gap-2 text-[13px] font-semibold">
                  <Check className="h-4 w-4 shrink-0 rounded-full bg-success/15 p-0.5 text-success" />
                  Writing an argument
                </li>
              )}
            </ul>
          </div>

          <ChestOffer source="lesson" className="relative z-30 mt-4" />

          <div className="mt-6 flex flex-col gap-2">
            {lessonNumber < course.lessons.length && (
              <Button
                onClick={() =>
                  navigate({
                    to: "/course/$slug/lesson/$index",
                    params: { slug, index: String(lessonNumber + 1) },
                  })
                }
                className="h-12 w-full rounded-full bg-hero-gradient text-base font-semibold shadow-card"
              >
                Continue to the next lesson
                <ArrowRight className="h-4 w-4" />
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
              onClick={() => navigate({ to: "/course/$slug", params: { slug } })}
              className="h-10 w-full rounded-full text-sm font-bold text-muted-foreground"
            >
              See my path
            </Button>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame showNav={false}>
      <ScreenHeader
        backTo="/course/$slug"
        right={
          combo >= 2 ? (
            <span className="flex animate-pop-in items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary-text">
              <Flame className="h-3.5 w-3.5" />
              {combo} in a row
            </span>
          ) : (
            <span className="text-xs font-bold text-muted-foreground">
              Lesson {lessonNumber} of {course.lessons.length}
            </span>
          )
        }
      />

      <div className="px-5">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-hero-gradient transition-all duration-700 ease-out"
            style={{ width: `${stepPct}%` }}
          />
        </div>
        <div className="mt-2 flex gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= page ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 pb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-[11px] font-semibold text-accent-foreground">
          <span aria-hidden>{lesson.emoji}</span> {unitById(meta?.unitId ?? "claims").title}
        </span>
        <h1 className="mt-3 text-3xl leading-tight">{lesson.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lesson.subtitle}</p>

        {onConcept && (
          <article className="mt-5 animate-rise-in rounded-3xl bg-card p-5 shadow-card">
            <p className="text-[11px] font-semibold text-primary-text">The idea</p>
            <h2 className="mt-1 text-xl leading-snug">{lesson.concept?.title ?? lesson.title}</h2>
            <p className="mt-3 text-[15px] font-semibold leading-relaxed text-foreground/85">
              {lesson.concept?.body}
            </p>
            {lesson.concept?.example && (
              <div className="mt-4 flex gap-3 rounded-2xl bg-primary-soft p-4">
                <Lightbulb aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" />
                <p className="text-[14px] font-semibold leading-relaxed text-accent-foreground">
                  {lesson.concept.example}
                </p>
              </div>
            )}
            <p className="mt-4 text-[13px] font-semibold text-muted-foreground">
              {exercises.length} drills ahead. You do the reasoning — I'll push back.
            </p>
            <PartsStatus
              ready={drillsReady}
              total={exercises.length}
              complete={complete}
              problem={notice}
              onRetry={retry}
            />
          </article>
        )}

        {onExercise && !currentExercise && (
          <PendingPart
            what="this drill"
            failed={failed.includes(`drill:${exerciseIndex}`)}
            notice={notice}
            onRetry={retry}
          />
        )}

        {onExercise && currentExercise && (
          <>
            <ExerciseRunner
              exercise={currentExercise}
              index={exerciseIndex}
              total={exercises.length}
              answer={currentAttempt?.answer}
              onAnswer={answerExercise}
            />
            {socratic?.index === exerciseIndex && (
              <SocraticPopup
                key={`socratic-${lessonNumber}-${exerciseIndex}`}
                companion={companion}
                lessonTitle={lesson.title}
                objective={lesson.subtitle}
                exercise={currentExercise}
                answer={currentAttempt?.answer}
                correct={socratic.correct}
                onDismiss={() => setSocratic(null)}
              />
            )}
          </>
        )}

        {onEasier && meta && (
          <>
            <div className="mt-5 animate-rise-in rounded-3xl border border-dashed border-primary/40 bg-primary-soft/50 p-4">
              <p className="text-[13px] font-semibold leading-snug text-accent-foreground">
                Quick reset: {lesson.subtitle} Here's one gentler drill on the same skill.
              </p>
            </div>
            <DrillVariant
              lessonId={meta.id}
              kind={meta.drills[0]!}
              seen={[]}
              index={0}
              total={1}
              showCount={false}
              difficulty={1}
              onAnswer={(score) => {
                if (easierDone) return;
                setEasierDone(true);
                recordExercise(score);
                recordDrillOutcome(meta.id, { score, difficulty: 1 });
              }}
            />
          </>
        )}

        {onWritten && !written && (
          <>
            <PendingPart
              what="your writing task"
              failed={failed.includes("written")}
              notice={notice}
              onRetry={retry}
            />
            <button
              type="button"
              onClick={() => setSkippedWriting(true)}
              className="mt-3 h-11 w-full rounded-full text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              Skip the writing this time
            </button>
          </>
        )}

        {onWritten && written && (
          <>
            <WrittenArgument
              lessonId={meta?.id ?? `lesson-${lessonNumber}`}
              lessonTitle={lesson.title}
              objective={lesson.subtitle}
              written={written}
              companion={companion}
              onGraded={(total, attempt, max, scores) => {
                setArgumentGrade(total);
                if (attempt === 1) recordArgument(total, max);
                recordWrittenScore(meta?.id ?? `lesson-${lessonNumber}`, total, max, scores);
              }}
            />
            {argumentGrade === null && !skippedWriting && (
              <button
                type="button"
                onClick={() => setSkippedWriting(true)}
                className="mt-3 h-10 w-full rounded-full text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
              >
                Skip the writing this time
              </button>
            )}
          </>
        )}

        {onSummary && (
          <div className="mt-5 space-y-4">
            {(lesson.keyPoints ?? []).map((point, i) => (
              <div
                key={point}
                className="flex animate-rise-in items-start gap-3 rounded-2xl bg-card p-3 text-sm font-semibold shadow-soft"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-success/15 p-0.5 text-success" />
                {point}
              </div>
            ))}
            <PracticeChat
              slug={slug}
              lessonIndex={lessonNumber}
              topic={course.topic}
              lessonTitle={lesson.title}
              lessonText={practiceText}
              earlierLessons={course.lessons.slice(0, lessonNumber - 1).map((l) => l.title)}
              companion={companion}
              signedIn={!!userId}
              onDone={handlePracticeDone}
            />
          </div>
        )}

        <div className="sticky bottom-3 z-20 mt-6">
          {/* Hidden until the drill is answered, so the card isn't cluttered. */}
          {canContinue && (
            <Button
              onClick={() => (onSummary ? finishLesson() : setPage((p) => p + 1))}
              disabled={completing}
              className="h-12 w-full animate-pop-in rounded-full bg-hero-gradient text-base font-semibold shadow-card transition-transform enabled:hover:scale-[1.02] enabled:active:scale-95"
            >
              {nextLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {onExercise &&
            hasWrittenPage &&
            exercises.length > 3 &&
            exerciseIndex < 3 &&
            [0, 1, 2].every((i) => attempts[i]?.score === 1) && (
              <button
                type="button"
                onClick={() => setPage(writtenPage)}
                className="mt-3 h-10 w-full rounded-full text-sm font-bold text-primary-text"
              >
                You've got this — skip ahead to the written task
              </button>
            )}

          <AiDisclaimer
            className="mt-4"
            fitness={needsFitnessDisclaimer(`${course.topic} ${lesson.title}`)}
          />
          <ReportContentButton
            context={{
              courseSlug: slug,
              courseTopic: course.topic,
              lessonIndex: lessonNumber,
              lessonTitle: lesson.title,
              excerpt: currentExercise
                ? describeExercise(currentExercise)
                : (lesson.concept?.body ?? lesson.title),
            }}
          />
          {page > 0 && !completing && (
            <button
              onClick={() => setPage((p) => p - 1)}
              className="mt-2 h-10 w-full rounded-full text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              Back a step
            </button>
          )}
        </div>
      </div>

      {completing && (
        <div
          role="status"
          aria-live="polite"
          className="lesson-complete-overlay absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background/95 px-8 text-center backdrop-blur-sm"
        >
          <span className="lesson-complete-halo absolute h-72 w-72 rounded-full" />
          <SuccessBurst />
          <div className="lesson-complete-content relative z-30">
            <CompanionAvatar
              companion={{ ...companion, expression: "excited" }}
              size={112}
              pose="cheer"
            />
            <p className="mt-5 text-sm font-bold text-primary-text">Lesson complete</p>
            <h2 className="mt-2 text-3xl leading-tight">You trained your reasoning.</h2>
            <p className="mt-3 text-sm font-semibold text-muted-foreground">
              +100 XP · Progress saved
            </p>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}
