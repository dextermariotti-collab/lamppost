import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { ReportContentButton } from "@/components/ReportContentButton";
import { useCompanion, useSessionUser } from "@/lib/companion-store";
import { PhoneFrame } from "@/components/PhoneFrame";
import { PracticeChat } from "@/components/PracticeChat";
import { SocraticPopup } from "@/components/SocraticPopup";
import { ExerciseRunner } from "@/components/exercises/ExerciseRunner";
import { WrittenArgument } from "@/components/exercises/WrittenArgument";
import { SuccessBurst } from "@/components/SuccessBurst";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { CURRICULUM_SLUG, TOTAL_LESSONS, lessonAt, unitById } from "@/lib/curriculum";
import { useCurriculumCourse, useCurriculumLesson } from "@/lib/curriculum-store";
import { describeExercise } from "@/lib/exercises";
import { useLessonAttempts } from "@/lib/exercise-store";
import { needsFitnessDisclaimer } from "@/lib/moderation";
import { useProgress } from "@/lib/progress";
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
  const { lesson, meta, loading, error, retry, ready } = useCurriculumLesson(lessonNumber - 1);
  const { companion } = useCompanion();
  const { completeLesson, recordPractice, recordExercise, recordArgument } = useProgress();
  const { userId } = useSessionUser();
  const { attempts, record } = useLessonAttempts(meta?.id ?? `lesson-${lessonNumber}`);

  /** Page 0 = concept card, 1..n = exercises, then written argument, then summary. */
  const [page, setPage] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [socratic, setSocratic] = useState<{ index: number; correct: boolean } | null>(null);
  const [argumentGrade, setArgumentGrade] = useState<number | null>(null);
  const [skippedWriting, setSkippedWriting] = useState(false);

  useEffect(() => {
    setPage(0);
    setCompleting(false);
    setSocratic(null);
    setArgumentGrade(null);
    setSkippedWriting(false);
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
          <p className="text-xs font-bold text-primary">
            {unitById(meta?.unitId ?? "claims").title}
          </p>
          <h1 className="mt-1 text-2xl leading-tight">{meta?.title ?? "Loading lesson"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{meta?.objective}</p>

          {error ? (
            <div className="mt-6 rounded-3xl bg-card p-5 shadow-soft">
              <p className="text-sm font-semibold text-foreground">{error}</p>
              <Button onClick={retry} className="mt-4 w-full rounded-full">
                Try again
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-4" aria-busy={loading}>
              <p className="text-sm font-semibold text-muted-foreground">
                Building your drills…
              </p>
              <div className="h-24 animate-pulse rounded-3xl bg-muted" />
              <div className="h-52 animate-pulse rounded-3xl bg-muted" />
            </div>
          )}
        </div>
      </PhoneFrame>
    );
  }

  const exercises = lesson.exercises ?? [];
  const written = lesson.written;
  const writtenPage = exercises.length + 1;
  const summaryPage = writtenPage + (written ? 1 : 0);
  const totalPages = summaryPage + 1;

  const onConcept = page === 0;
  const onExercise = page >= 1 && page <= exercises.length;
  const exerciseIndex = page - 1;
  const currentExercise = onExercise ? exercises[exerciseIndex] : undefined;
  const currentAttempt = onExercise ? attempts[exerciseIndex] : undefined;
  const onWritten = !!written && page === writtenPage;
  const onSummary = page === summaryPage;

  const stepPct = Math.round(
    ((lessonNumber - 1 + Math.min(page + 1, totalPages) / totalPages) / TOTAL_LESSONS) * 100,
  );

  const answerExercise = (answer: unknown, score: number) => {
    const fresh = record(exerciseIndex, answer, score);
    if (fresh) recordExercise(score);
    const correct = score === 1;
    if (!correct || Math.random() < SOCRATIC_CHANCE) {
      setSocratic({ index: exerciseIndex, correct });
    }
  };

  const finishLesson = () => {
    if (completing) return;
    completeLesson(slug, course.topic, lessonNumber - 1, course.lessons.length);
    setCompleting(true);
    window.setTimeout(() => {
      if (lessonNumber < course.lessons.length) {
        navigate({
          to: "/course/$slug/lesson/$index",
          params: { slug, index: String(lessonNumber + 1) },
        });
      } else {
        navigate({ to: "/course/$slug", params: { slug } });
      }
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
    : onWritten
      ? argumentGrade !== null || skippedWriting
      : true;

  const nextLabel = onConcept
    ? "Start training"
    : onExercise
      ? exerciseIndex + 1 === exercises.length
        ? written
          ? "Write your argument"
          : "See the summary"
        : "Next drill"
      : onWritten
        ? "See the summary"
        : lessonNumber < course.lessons.length
          ? "Continue"
          : "Finish course";

  return (
    <PhoneFrame showNav={false}>
      <ScreenHeader
        backTo="/course/$slug"
        right={
          <span className="text-xs font-bold text-muted-foreground">
            Lesson {lessonNumber} of {course.lessons.length}
          </span>
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
            <p className="text-[11px] font-semibold text-primary">The idea</p>
            <h2 className="mt-1 text-xl leading-snug">
              {lesson.concept?.title ?? lesson.title}
            </h2>
            <p className="mt-3 text-[15px] font-semibold leading-relaxed text-foreground/85">
              {lesson.concept?.body}
            </p>
            {lesson.concept?.example && (
              <div className="mt-4 flex gap-3 rounded-2xl bg-primary-soft p-4">
                <Lightbulb aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-[14px] font-semibold leading-relaxed text-accent-foreground">
                  {lesson.concept.example}
                </p>
              </div>
            )}
            <p className="mt-4 text-[13px] font-semibold text-muted-foreground">
              {exercises.length} drills ahead. You do the reasoning — I'll push back.
            </p>
          </article>
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

        {onWritten && written && (
          <>
            <WrittenArgument
              lessonId={meta?.id ?? `lesson-${lessonNumber}`}
              lessonTitle={lesson.title}
              objective={lesson.subtitle}
              written={written}
              companion={companion}
              signedIn={!!userId}
              onGraded={(total, attempt) => {
                setArgumentGrade(total);
                if (attempt === 1) recordArgument(total);
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

        <div className="mt-6">
          <Button
            onClick={() => (onSummary ? finishLesson() : setPage((p) => p + 1))}
            disabled={!canContinue || completing}
            className="h-12 w-full rounded-full bg-hero-gradient text-base font-semibold shadow-card transition-transform enabled:hover:scale-[1.02] enabled:active:scale-95"
          >
            {nextLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
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
            <p className="mt-5 text-sm font-bold text-primary">Lesson complete</p>
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
