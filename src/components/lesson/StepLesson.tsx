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
import {
  CURRICULUM_SLUG,
  TOTAL_LESSONS,
  lessonPlace,
  unitById,
  type CurriculumLesson,
} from "@/lib/curriculum";
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
import type { LessonNotes } from "@/lib/lesson-notes";
import { LessonFinished } from "./LessonFinished";
import { LessonPlayer } from "./LessonPlayer";
import { NotesView } from "./NotesView";

/** What a step pays, the same as `applyExercise` in progress-core (bonus on top). */
const stepXp = (score: number) => Math.max(5, Math.round(25 * Math.min(Math.max(score, 0), 1)));

/** Coming back from signing in at "Explain it back" opens the lesson there, once it's done. */
const resumingAtExplain = () => {
  try {
    return new URLSearchParams(window.location.search).get("part") === "explain";
  } catch {
    return false;
  }
};

/** What each kind of step is listed as on the finished screen. */
const PRACTICED: Record<StepKind, string> = {
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
 * to the guide, then the finish. Every answer feeds the same places a generated drill always
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
  const position = lessonNumber - 1;
  const place = lessonPlace(position);

  const [phase, setPhase] = useState<Phase>("steps");
  const [results, setResults] = useState<Record<number, StepResult>>({});
  const [combo, setCombo] = useState(0);
  const [argumentGrade, setArgumentGrade] = useState<number | null>(null);
  const [skippedWriting, setSkippedWriting] = useState(false);
  const [completing, setCompleting] = useState(false);

  // XP and lessons done when the lesson opened, so the finish can show what this lesson earned,
  // whether it was the last stop on the whole map, and whether this was a replay.
  const xpAtStart = useRef<number | null>(null);
  const doneAtStart = useRef<number | null>(null);
  const wasDone = useRef(false);
  const xpNow = useRef(state.xp);
  const doneNow = useRef(doneLessons);
  xpNow.current = state.xp;
  doneNow.current = doneLessons;
  useEffect(() => {
    if (!hydrated) return;
    xpAtStart.current = xpNow.current;
    doneAtStart.current = doneNow.current.size;
    wasDone.current = doneNow.current.has(position);
    if (wasDone.current && resumingAtExplain()) setPhase("explain");
  }, [hydrated, meta.id, position]);

  // The lesson counts as soon as the writing is graded or skipped, so leaving at "Explain it
  // back" (to sign in, say) never loses it. Once, however many ways the learner gets there.
  const recorded = useRef(false);
  const recordLesson = () => {
    if (recorded.current) return;
    recorded.current = true;
    completeLesson(CURRICULUM_SLUG, course.topic, position, course.lessons.length);
  };

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
    // Right on a later try still ends on "Correct"; only full marks keep the run going.
    const right = !result.revealed;
    const firstTry = result.score === 1;
    const streakNow = firstTry ? combo + 1 : 0;
    setCombo(streakNow);
    const bonus = firstTry ? comboBonus(streakNow) : 0;
    if (fresh) recordExercise(result.score, bonus);
    playCue(right ? "correct" : "wrong");
    if (fresh && firstTry && streakNow >= 3) {
      celebrateAnswer({
        correct: true,
        xp: stepXp(result.score),
        combo: streakNow,
        bonus,
        note: "In a row",
      });
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
    recordLesson();
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
  /** This lesson is the last one left on the map, so finishing it finishes the course. */
  const lastStop =
    (doneAtStart.current ?? TOTAL_LESSONS) < TOTAL_LESSONS &&
    Array.from({ length: TOTAL_LESSONS }, (_, i) => i).every(
      (i) => i === position || doneLessons.has(i),
    );

  if (phase === "finished") {
    const practiced = Array.from(
      new Set(
        script.steps.flatMap((step, i) =>
          results[i] && PRACTICED[step.kind] ? [PRACTICED[step.kind]] : [],
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
        practiced={practiced}
        xpEarned={Math.max(state.xp - (xpAtStart.current ?? state.xp), 0)}
        wrote={argumentGrade !== null}
        takeaway={script.takeaway}
        tryIt={notes?.tryIt}
        mapComplete={
          doneLessons.size >= TOTAL_LESSONS && (doneAtStart.current ?? 0) < TOTAL_LESSONS
        }
        replay={wasDone.current}
      />
    );
  }

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
              {unit.title} / stop {place.stop} of {place.stops}
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
                {doneLessons.has(position)
                  ? "These notes stay on My Path, next to the lesson, for whenever you want them again."
                  : "Finish the lesson and these notes stay on My Path, next to it, for whenever you want them again."}
              </p>
              <div className="sticky-action mt-4">
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
                  recordLesson();
                }}
              />
              {/* In the flow, not pinned: the writing's own Submit is this part's one sticky bar. */}
              <div className="mt-6 space-y-2">
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
                      recordLesson();
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
                lessonTitle={meta.title}
                signedIn={!!userId}
                returnTo={`/course/${CURRICULUM_SLUG}/lesson/${lessonNumber}?part=explain`}
                onDone={(close: PracticeClose | null) => {
                  if (close) recordPractice(close.verdict, close.connectionMade);
                  finishLesson();
                }}
              />
              {/* Signed out, the card's own "Finish the lesson" is the one way on. */}
              {userId && (
                <Button
                  onClick={finishLesson}
                  disabled={completing}
                  className="h-12 w-full rounded-sm bg-hero-gradient text-base font-semibold shadow-card"
                >
                  {lastStop ? "Finish the course" : "Finish the lesson"}
                </Button>
              )}
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
