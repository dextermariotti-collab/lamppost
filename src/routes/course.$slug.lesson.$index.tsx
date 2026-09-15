import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import aiBot from "@/assets/ai-bot.png";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { ReportContentButton } from "@/components/ReportContentButton";
import { useCompanion, useSessionUser } from "@/lib/companion-store";
import { PhoneFrame } from "@/components/PhoneFrame";
import { PracticeChat } from "@/components/PracticeChat";
import { PredictionCard } from "@/components/PredictionCard";
import { SpotTheFlawCard } from "@/components/SpotTheFlawCard";
import { SuccessBurst } from "@/components/SuccessBurst";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { clampBrief } from "@/lib/course-brief";
import { useStoredCourse } from "@/lib/course-store";
import { lessonQuizzes, titleFromSlug } from "@/lib/courses";
import { needsFitnessDisclaimer } from "@/lib/moderation";
import { usePredictionAttempt } from "@/lib/prediction-store";
import { useFlawAttempt } from "@/lib/flaw-store";
import { useProgress } from "@/lib/progress";
import type { PracticeClose } from "@/lib/practice";

export const Route = createFileRoute("/course/$slug/lesson/$index")({
  head: ({ params }) => {
    const topic = titleFromSlug(params.slug);
    return {
      meta: [
        { title: `Lesson ${params.index} — ${topic} | Lamppost` },
        {
          name: "description",
          content: `An in-depth AI-written ${topic} lesson with quizzes on Lamppost.`,
        },
        { property: "og:title", content: `${topic} lesson ${params.index} — Lamppost` },
        { property: "og:description", content: `Read, practise and quiz yourself on ${topic}.` },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: `/course/${params.slug}/lesson/${params.index}` }],
    };
  },
  component: LessonScreen,
});

function LessonScreen() {
  const { slug, index } = Route.useParams();
  const navigate = useNavigate();
  const { course, hydrated } = useStoredCourse(slug);
  const { companion } = useCompanion();
  const { completeLesson, recordPractice } = useProgress();
  const { userId } = useSessionUser();
  const { attempt: predictionAttempt, record: recordPrediction } = usePredictionAttempt(
    slug,
    Math.max(Number(index) || 1, 1),
  );
  const { attempt: flawAttempt, record: recordFlaw } = useFlawAttempt(
    slug,
    Math.max(Number(index) || 1, 1),
  );
  /** Page 0..n-1 are content parts, the last page is the quiz set. */
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [completing, setCompleting] = useState(false);
  /** The explain-it-back beat closes the lesson, after the quiz. */
  const [practiceDone, setPracticeDone] = useState(false);

  useEffect(() => {
    setPage(0);
    setAnswers({});
    setCompleting(false);
    setPracticeDone(false);
  }, [index]);

  useEffect(() => {
    if (hydrated && !course) {
      navigate({
        to: "/setup",
        search: clampBrief({ topic: slug.replace(/-/g, " ") }),
        replace: true,
      });
    }
  }, [hydrated, course, slug, navigate]);

  if (!course) {
    return (
      <PhoneFrame showNav={false}>
        <div className="space-y-4 px-5 py-8">
          <div className="h-8 w-2/3 animate-pulse rounded-full bg-primary-soft" />
          <div className="h-24 animate-pulse rounded-3xl bg-muted" />
          <div className="h-52 animate-pulse rounded-3xl bg-muted" />
        </div>
      </PhoneFrame>
    );
  }

  const lessonNumber = Math.min(Math.max(Number(index) || 1, 1), course.lessons.length);
  const lesson = course.lessons[lessonNumber - 1]!;
  const parts = lesson.parts && lesson.parts.length > 0 ? lesson.parts : [];
  const quizzes = lessonQuizzes(lesson);
  /** Pages: reading parts, then the spot-the-flaw drill, then the quiz set. */
  const flaw = lesson.flaw;
  const flawPage = flaw ? parts.length : -1;
  const onFlaw = flaw ? page === flawPage : false;
  const totalPages = parts.length + (flaw ? 1 : 0) + 1;
  const onQuiz = page >= parts.length + (flaw ? 1 : 0);
  const answeredAll = quizzes.every((_, i) => answers[i] !== undefined);
  /** The predict-before-reveal beat closes the first reading part. */
  const prediction = lesson.prediction;
  const showPrediction = !onQuiz && !onFlaw && page === 0 && parts.length > 1 && !!prediction;
  const predictionPending = showPrediction && predictionAttempt === undefined;
  const flawPending = onFlaw && flawAttempt === undefined;

  const stepPct = Math.round(
    ((lessonNumber - 1 + Math.min(page + 1, totalPages) / totalPages) / course.lessons.length) * 100,
  );

  /** After the quiz, the learner explains the lesson back in their own words. */
  const showPractice = onQuiz && answeredAll && !practiceDone && !completing;
  const practiceText = [
    lesson.intro ?? "",
    ...parts.map((p) => `${p.title}: ${p.body}`),
    ...(lesson.keyPoints ?? []),
  ]
    .filter(Boolean)
    .join("\n\n");

  const handlePracticeDone = (close: PracticeClose | null) => {
    if (close) recordPractice(close.verdict, close.connectionMade);
    setPracticeDone(true);
    finishLesson();
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
          <span aria-hidden>{lesson.emoji}</span> Lesson {lessonNumber}
        </span>
        <h1 className="mt-3 text-3xl leading-tight">{lesson.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lesson.subtitle}</p>

        {page === 0 && (
          <div className="relative mt-4 animate-rise-in overflow-hidden rounded-3xl bg-primary-soft p-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
              <Sparkles className="h-3 w-3" /> Written for you
            </span>
            <p className="mt-2 max-w-[72%] text-sm font-semibold text-accent-foreground">
              {lesson.intro ??
                `This lesson was written by AI just for you, based on your ${course.topic.toLowerCase()} goals.`}
            </p>
            <img
              src={aiBot}
              alt=""
              aria-hidden
              width={816}
              height={816}
              className="pointer-events-none absolute right-2 bottom-2 h-16 w-16 animate-float object-contain"
            />
          </div>
        )}

        {onFlaw ? (
          <SpotTheFlawCard
            drill={flaw!}
            companion={companion}
            choice={flawAttempt?.choice}
            onPick={(i) => recordFlaw(i, i === flaw!.correct)}
          />
        ) : !onQuiz ? (
          <>
            <article key={page} className="mt-5 animate-rise-in rounded-3xl bg-card p-5 shadow-card">
              <p className="text-[11px] font-semibold text-primary">
                Part {page + 1} of {parts.length}
              </p>
              <h2 className="mt-1 text-xl leading-snug">{parts[page]!.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed font-semibold text-foreground/85">
                {parts[page]!.body}
              </p>
            </article>
            {showPrediction && (
              <PredictionCard
                prediction={prediction!}
                companion={companion}
                choice={predictionAttempt?.choice}
                onPick={(i) => recordPrediction(i, i === prediction!.correct)}
              />
            )}
          </>
        ) : (
          <div className="mt-5 space-y-4">
            {lesson.keyPoints && lesson.keyPoints.length > 0 && (
              <ul className="space-y-2">
                {lesson.keyPoints.map((point, i) => (
                  <li
                    key={point}
                    className="flex animate-rise-in items-start gap-3 rounded-2xl bg-card p-3 text-sm font-semibold shadow-soft"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-success/15 p-0.5 text-success" />
                    {point}
                  </li>
                ))}
              </ul>
            )}

            {quizzes.map((quiz, qi) => {
              const picked = answers[qi];
              const isCorrect = picked === quiz.correct;
              return (
                <div
                  key={quiz.question}
                  className="relative animate-rise-in rounded-3xl bg-card p-4 shadow-card"
                  style={{ animationDelay: `${qi * 90}ms` }}
                >
                  <div className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hero-gradient text-sm font-semibold text-primary-foreground">
                      Q{quizzes.length > 1 ? qi + 1 : ""}
                    </span>
                    <h2 className="text-base leading-snug">{quiz.question}</h2>
                  </div>

                  <div className="mt-4 space-y-2">
                    {quiz.options.map((option, i) => {
                      const isPicked = picked === i;
                      const isAnswer = i === quiz.correct;
                      const state =
                        picked === undefined
                          ? "border-border hover:border-primary/50 hover:-translate-y-0.5"
                          : isAnswer
                            ? "border-success bg-success/10"
                            : isPicked
                              ? "border-destructive bg-destructive/10 animate-wiggle"
                              : "border-border opacity-60";
                      return (
                        <Button
                          key={option}
                          type="button"
                          variant="outline"
                          onClick={() =>
                            picked === undefined &&
                            setAnswers((prev) => ({ ...prev, [qi]: i }))
                          }
                          className={`relative h-auto min-h-12 w-full justify-start whitespace-normal rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold shadow-none transition-all ${state} ${
                            picked !== undefined && isAnswer ? "animate-correct-answer" : ""
                          }`}
                        >
                          <span className="font-semibold text-primary">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="flex-1">{option}</span>
                          {picked !== undefined && isAnswer && (
                            <Check className="h-5 w-5 animate-pop-in rounded-full bg-success p-1 text-success-foreground" />
                          )}
                          {picked !== undefined && isPicked && !isAnswer && (
                            <X className="h-5 w-5 animate-pop-in rounded-full bg-destructive p-1 text-destructive-foreground" />
                          )}
                          {isPicked && isAnswer && <SuccessBurst compact />}
                        </Button>
                      );
                    })}
                  </div>

                  {picked !== undefined && (
                    <div className="relative mt-4 animate-pop-in rounded-2xl bg-primary-soft p-3 pr-20">
                      <p className="text-sm font-semibold text-accent-foreground">
                        {isCorrect ? "Nailed it! " : "Not quite. "}
                        {quiz.explanation}
                      </p>
                      {isCorrect && (
                        <p className="mt-1 text-xs font-semibold text-primary">+50 XP · +10 💎</p>
                      )}
                      <CompanionAvatar
                        companion={companion}
                        size={72}
                        className={`pointer-events-none absolute -right-1 -bottom-1 ${
                          isCorrect ? "animate-pop-in" : ""
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showPractice && (
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
        )}

        <div className="mt-6">
          <Button
            onClick={() => (onQuiz ? finishLesson() : setPage((p) => p + 1))}
            disabled={(onQuiz && !answeredAll) || predictionPending || completing}
            className={`h-12 w-full rounded-full bg-hero-gradient text-base font-semibold shadow-card transition-transform enabled:hover:scale-[1.02] enabled:active:scale-95 ${showPractice ? "hidden" : ""}`}
          >
            {onQuiz
              ? lessonNumber < course.lessons.length
                ? "Continue"
                : "Finish course"
              : showPrediction
                ? "See it in action"
                : page + 1 === parts.length
                  ? "Take the quiz"
                  : "Next page"}
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
              excerpt: onQuiz
                ? quizzes.map((q) => `${q.question} :: ${q.options.join(" | ")}`).join("\n")
                : (parts[page]?.body ?? lesson.intro ?? ""),
            }}
          />
          {!onQuiz && page > 0 && (
            <button
              onClick={() => setPage((p) => p - 1)}
              className="mt-2 h-10 w-full rounded-full text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              Back a page
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
            <h2 className="mt-2 text-3xl leading-tight">You lit the next step.</h2>
            <p className="mt-3 text-sm font-semibold text-muted-foreground">+100 XP · Progress saved</p>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}
