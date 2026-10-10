import { ArrowRight, Flame } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { celebrateAnswer, comboBonus } from "@/components/AnswerFeedback";
import { LineBullet } from "@/components/LineBullet";
import { PhoneFrame } from "@/components/PhoneFrame";
import { PracticeChat } from "@/components/PracticeChat";
import { ReportContentButton } from "@/components/ReportContentButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { WrittenArgument } from "@/components/exercises/WrittenArgument";
import { useCompanion, useSessionUser } from "@/lib/companion-store";
import { CURRICULUM_SLUG, TOTAL_LESSONS, unitById, type CurriculumLesson } from "@/lib/curriculum";
import { useCurriculumCourse } from "@/lib/curriculum-store";
import { useLessonAttempts } from "@/lib/exercise-store";
import { recordWrittenScore } from "@/lib/mastery";
import type { PracticeClose } from "@/lib/practice";
import { useProgress } from "@/lib/progress";
import { recordDrillOutcome } from "@/lib/rating";
import { trackDrillResult } from "@/lib/review-drills";
import { holdRewards } from "@/lib/reward-hold";
import { playCue } from "@/lib/feedback";
import { scrollToTop } from "@/lib/scroll";
import { isGraded, reviewKindFor, statedConfidence, stepAttemptIndex } from "@/lib/steps/attempts";
import type { StepResult } from "@/lib/steps/scoring";
import type { LessonScript, LessonStep, StepKind } from "@/lib/steps/types";
import { notesText, type LessonNotes } from "@/lib/lesson-notes";
import { LessonFinished } from "./LessonFinished";
import { LessonPlayer } from "./LessonPlayer";
import { NotesView } from "./NotesView";

/** What each kind of step is listed as on the finished screen. */
const PRACTISED: Record<StepKind, string> = {
  flaw: "Spotting the flaw",
  builder: "Building an argument",
  sort: "Sorting claims",
  confidence: "Judging how sure to be",
  stronger: "Comparing arguments",
  updater: "Updating on evidence",
  cause: "Telling cause from correlation",
  gap: "Finding the missing assumption",
  choice: "Making the call",
  note: "",
};

type Phase = "steps" | "notes" | "write" | "explain" | "finished";

/**
 * One lesson, from the first step to the celebration: the interactive steps, then the idea in
 * full (the notes), then the short written argument (skippable), then explaining the idea back
 * to the companion, then the finish. Every answer feeds the same places a generated drill always
 * did: XP and combos, the attempt record (mastery, calibration), the review queue and the skill
 * rating.
 */
export function StepLesson({
  script,
  notes,
  meta,
  lessonNumber,
}: {
  script: LessonScript;
  /** The idea in full. A lesson without notes goes straight from the steps to the writing. */
  notes: LessonNotes | null;
  meta: CurriculumLesson;
  lessonNumber: number;
}) {
  const course = useCurriculumCourse();
  const { companion } = useCompanion();
  const { userId } = useSessionUser();
  const {
    state,
    hydrated,
    doneLessons,
    completeLesson,
    recordPractice,
    recordExercise,
    recordArgument,
  } = useProgress();
  const { record } = useLessonAttempts(meta.id);
  const unit = unitById(meta.unitId);

  const [phase, setPhase] = useState<Phase>("steps");
  const [results, setResults] = useState<Record<number, StepResult>>({});
  const [combo, setCombo] = useState(0);
  const [argumentGrade, setArgumentGrade] = useState<number | null>(null);
  const [skippedWriting, setSkippedWriting] = useState(false);
  const [completing, setCompleting] = useState(false);

  // XP and lessons done when the lesson opened, so the finish can show what this lesson earned
  // and whether it was the last stop on the whole map.
  const xpAtStart = useRef<number | null>(null);
  const doneAtStart = useRef<number | null>(null);
  const xpNow = useRef(state.xp);
  const doneNow = useRef(doneLessons.size);
  xpNow.current = state.xp;
  doneNow.current = doneLessons.size;
  useEffect(() => {
    if (!hydrated) return;
    xpAtStart.current = xpNow.current;
    doneAtStart.current = doneNow.current;
  }, [hydrated, meta.id]);

  // Level-ups and badges wait until the lesson is over rather than interrupting a step.
  const over = phase === "finished";
  useEffect(() => {
    if (over) return;
    return holdRewards();
  }, [over]);

  // Each new part of the lesson starts at its heading, not wherever the last one was scrolled to.
  const partHeading = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    if (phase === "steps" || phase === "finished") return;
    scrollToTop(partHeading.current);
    partHeading.current?.focus({ preventScroll: true });
  }, [phase]);

  const handleStepResolved = (index: number, step: LessonStep, result: StepResult) => {
    setResults((prev) => ({ ...prev, [index]: result }));
    if (!isGraded(step)) return;
    const fresh = record(stepAttemptIndex(index), result.answer, result.score);
    const correct = result.score === 1;
    const streakNow = correct ? combo + 1 : 0;
    setCombo(streakNow);
    const bonus = correct ? comboBonus(streakNow) : 0;
    if (fresh) recordExercise(result.score, bonus);
    playCue(correct ? "correct" : "wrong");
    if (correct && streakNow >= 3) {
      celebrateAnswer({ correct: true, xp: bonus, combo: streakNow, bonus, note: "In a row" });
    }

    const confidence = statedConfidence(result.answer);
    const gradedBefore = script.steps.slice(0, index).filter(isGraded).length;
    const kind = reviewKindFor(meta.drills, gradedBefore);
    if (kind) trackDrillResult(meta.id, kind, result.score, confidence);
    recordDrillOutcome(meta.id, {
      score: result.score,
      difficulty: 2,
      ...(confidence !== undefined ? { confidence } : {}),
    });
  };

  const finishLesson = () => {
    if (completing || phase === "finished") return;
    completeLesson(CURRICULUM_SLUG, course.topic, lessonNumber - 1, course.lessons.length);
    setCompleting(true);
    window.setTimeout(() => {
      setCompleting(false);
      setPhase("finished");
    }, 1450);
  };

  const gradedResults = script.steps.flatMap((step, i) =>
    isGraded(step) && results[i] ? [results[i]!] : [],
  );
  const answered = gradedResults.length;
  const accuracy =
    answered > 0
      ? Math.round((gradedResults.reduce((sum, r) => sum + r.score, 0) / answered) * 100)
      : 0;

  if (phase === "finished") {
    const practised = Array.from(
      new Set(
        script.steps.flatMap((step, i) =>
          results[i] && PRACTISED[step.kind] ? [PRACTISED[step.kind]] : [],
        ),
      ),
    );
    return (
      <LessonFinished
        meta={meta}
        lessonNumber={lessonNumber}
        totalLessons={course.lessons.length || TOTAL_LESSONS}
        accuracy={accuracy}
        answered={answered}
        practised={practised}
        xpEarned={Math.max(state.xp - (xpAtStart.current ?? state.xp), 0)}
        wrote={argumentGrade !== null}
        takeaway={script.takeaway}
        tryIt={notes?.tryIt}
        mapComplete={
          doneLessons.size >= TOTAL_LESSONS && (doneAtStart.current ?? 0) < TOTAL_LESSONS
        }
      />
    );
  }

  // The notes come first: the tutor sees at most 6,000 characters and they are the fullest account.
  const lessonText = [
    script.takeaway,
    ...(notes ? [notesText(notes)] : []),
    ...script.steps.flatMap((step) => (step.kind === "note" ? [step.prompt] : [step.why])),
  ].join("\n\n");

  return (
    <PhoneFrame showNav={false}>
      <ScreenHeader
        backTo="/courses"
        right={
          combo >= 2 ? (
            <span className="flex animate-pop-in items-center gap-1 rounded-sm bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary-text">
              <Flame aria-hidden className="h-3.5 w-3.5" />
              {combo} in a row
            </span>
          ) : (
            <span className="text-xs font-bold text-muted-foreground">
              Lesson {lessonNumber} of {course.lessons.length || TOTAL_LESSONS}
            </span>
          )
        }
      />

      {phase === "steps" ? (
        <>
          <div className="px-5 pb-3">
            <p className="legend flex items-center gap-2 text-muted-foreground">
              <LineBullet unitId={meta.unitId} />
              {unit.title} / stop {((lessonNumber - 1) % 5) + 1} of 5
            </p>
            <h1 className="mt-2 text-[26px] leading-[1.08]">{meta.title}</h1>
          </div>
          <LessonPlayer
            unitId={meta.unitId}
            steps={script.steps}
            onStepResolved={handleStepResolved}
            onComplete={() => setPhase(notes ? "notes" : "write")}
            finalLabel={notes ? "Read the idea in full" : "On to the writing"}
            intro={
              notes && (
                <p className="-mt-1 px-5 pb-3 text-sm leading-relaxed text-muted-foreground">
                  {notes.hook}
                </p>
              )
            }
          />
        </>
      ) : (
        <div className="px-5 pt-2 pb-8">
          {phase === "notes" && <p className="legend text-muted-foreground">The idea in full</p>}
          <h1 ref={partHeading} tabIndex={-1} className="text-2xl leading-tight outline-none">
            {meta.title}
          </h1>
          {phase === "notes" && notes && (
            <>
              <div className="mt-5">
                <NotesView notes={notes} />
              </div>
              <p className="mt-6 text-[13px] text-muted-foreground">
                These notes stay on My Path, next to the lesson, for whenever you want them again.
              </p>
              <div className="sticky bottom-3 z-20 mt-4">
                <Button
                  onClick={() => setPhase("write")}
                  className="h-12 w-full rounded-sm bg-hero-gradient text-base font-semibold shadow-card"
                >
                  On to the writing <ArrowRight aria-hidden className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
          {phase === "write" && (
            <>
              <WrittenArgument
                lessonId={meta.id}
                lessonTitle={meta.title}
                objective={meta.objective}
                written={{
                  type: meta.written,
                  prompt: script.written.prompt,
                  passage: script.written.passage,
                  ...(script.written.guidance ? { guidance: script.written.guidance } : {}),
                }}
                companion={companion}
                onGraded={(total, attempt, max, scores) => {
                  setArgumentGrade(total);
                  if (attempt === 1) recordArgument(total, max);
                  recordWrittenScore(meta.id, total, max, scores);
                }}
              />
              <div className="sticky bottom-3 z-20 mt-6 space-y-2">
                {(argumentGrade !== null || skippedWriting) && (
                  <Button
                    onClick={() => setPhase("explain")}
                    className="h-12 w-full animate-pop-in rounded-sm bg-hero-gradient text-base font-semibold shadow-card"
                  >
                    Explain it back <ArrowRight aria-hidden className="h-4 w-4" />
                  </Button>
                )}
                {argumentGrade === null && !skippedWriting && (
                  <button
                    type="button"
                    onClick={() => {
                      setSkippedWriting(true);
                      setPhase("explain");
                    }}
                    className="min-h-11 w-full rounded-sm text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Skip the writing this time
                  </button>
                )}
              </div>
            </>
          )}

          {phase === "explain" && (
            <div className="mt-4 space-y-4">
              <div className="sign p-4">
                <p className="legend text-muted-foreground">To carry away</p>
                <p className="mt-1 text-sm font-bold leading-snug">{script.takeaway}</p>
              </div>
              <PracticeChat
                slug={CURRICULUM_SLUG}
                lessonIndex={lessonNumber}
                topic={course.topic}
                lessonTitle={meta.title}
                lessonText={lessonText}
                earlierLessons={course.lessons.slice(0, lessonNumber - 1).map((l) => l.title)}
                companion={companion}
                signedIn={!!userId}
                onDone={(close: PracticeClose | null) => {
                  if (close) recordPractice(close.verdict, close.connectionMade);
                  finishLesson();
                }}
              />
              <Button
                onClick={finishLesson}
                disabled={completing}
                className="h-12 w-full rounded-sm bg-hero-gradient text-base font-semibold shadow-card"
              >
                {lessonNumber < (course.lessons.length || TOTAL_LESSONS)
                  ? "Finish the lesson"
                  : "Finish the course"}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="px-5 pb-6">
        <ReportContentButton
          context={{
            courseSlug: CURRICULUM_SLUG,
            courseTopic: course.topic,
            lessonIndex: lessonNumber,
            lessonTitle: meta.title,
            excerpt: meta.keyIdea,
          }}
        />
      </div>

      {completing && (
        <div
          role="status"
          aria-live="polite"
          className="lesson-complete-overlay lamp-pool absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background px-8"
        >
          <div className="sign w-full max-w-72 p-5">
            <p className="legend flex items-center gap-2 text-muted-foreground">
              <LineBullet unitId={meta.unitId} /> Lesson complete
            </p>
            <h2 className="mt-2 text-2xl leading-tight">{meta.title}</h2>
            <p className="mt-3 font-mono text-xs font-bold text-muted-foreground">Progress saved</p>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}
