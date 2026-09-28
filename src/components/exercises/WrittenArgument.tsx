import { Loader2, PenLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { Button } from "@/components/ui/button";
import type { Companion } from "@/lib/companions";
import {
  CRITERION_LABEL,
  WRITTEN_TASKS,
  argumentXpFor,
  type ArgumentGrade,
  type RubricCriterion,
  type WrittenPrompt,
} from "@/lib/exercises";
import { weakestCriterion } from "@/lib/mastery";
import { gradeArgument, saveArgumentAttempt } from "@/lib/argument.functions";

/** What the grader is "doing", by seconds waited — so a 15–30s wait never looks frozen. */
function gradingPhase(elapsed: number) {
  if (elapsed < 4) return "Reading your argument…";
  if (elapsed < 10) return "Checking it against each criterion…";
  if (elapsed < 20) return "Writing your feedback…";
  return "Still working — this is taking longer than usual. Your answer is safe.";
}

/**
 * Shown for the whole time the grader runs (usually 10–20s). It sits directly
 * above the submit button, in the flow of the page, rather than at the bottom of
 * the card where the lesson's sticky footer used to cover it.
 */
function GradingProgress({ companion, elapsed }: { companion: Companion; elapsed: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, []);

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mt-4 flex items-end gap-2"
    >
      <CompanionAvatar companion={companion} size={56} animate pose="peek" className="shrink-0" />
      <div className="flex-1 space-y-2 rounded-2xl rounded-bl-sm border-2 border-primary/30 bg-primary-soft px-4 py-3">
        <p className="flex items-center gap-2 text-[14px] font-bold text-foreground">
          <Loader2 aria-hidden className="h-4 w-4 shrink-0 animate-spin" />
          {gradingPhase(elapsed)}
        </p>
        <p className="text-[12px] font-semibold text-muted-foreground">
          Grading usually takes 10–20 seconds · {elapsed}s
        </p>
        {[80, 95, 70].map((w) => (
          <div
            key={w}
            className="h-2.5 animate-pulse rounded-full bg-primary/25"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The lesson's final step: write a short argument, get a rubric score with one
 * specific sentence per criterion, then revise once if you want to.
 */
export function WrittenArgument({
  lessonId,
  lessonTitle,
  objective,
  written,
  companion,
  signedIn,
  onGraded,
}: {
  lessonId: string;
  lessonTitle: string;
  objective: string;
  written: WrittenPrompt;
  companion: Companion;
  signedIn: boolean;
  onGraded: (
    total: number,
    attempt: number,
    max: number,
    scores: Partial<Record<RubricCriterion, number>>,
  ) => void;
}) {
  const [text, setText] = useState("");
  const [attempt, setAttempt] = useState(1);
  const [grade, setGrade] = useState<ArgumentGrade | null>(null);
  const [onTopic, setOnTopic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [revising, setRevising] = useState(false);
  const task = WRITTEN_TASKS[written.type];
  const [focus, setFocus] = useState<RubricCriterion | null>(null);

  // Read after hydration: the weakest criterion lives in local history.
  useEffect(() => setFocus(weakestCriterion(task.criteria)?.criterion ?? null), [task.criteria]);

  // Seconds waited, for the status line. Runs only while the grader is working.
  useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const tick = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => window.clearInterval(tick);
  }, [busy]);

  const submit = () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    void gradeArgument({
      data: {
        lessonId,
        lessonTitle,
        objective,
        taskType: written.type,
        passage: written.passage,
        prompt: written.prompt,
        answer: text.trim(),
        attempt,
        ...(focus ? { focus: CRITERION_LABEL[focus] } : {}),
      },
    })
      .then((result) => {
        if (!result.ok) {
          setError(result.reason);
          return;
        }
        setGrade(result.grade);
        setOnTopic(result.onTopic);
        setRevising(false);
        const perCriterion: Partial<Record<RubricCriterion, number>> = {};
        for (const criterion of task.criteria) {
          const row = result.grade.scores[criterion];
          if (row) perCriterion[criterion] = row.score;
        }
        onGraded(result.grade.total, attempt, result.grade.max, perCriterion);
        if (signedIn) {
          void saveArgumentAttempt({
            data: {
              lessonId,
              lessonTitle,
              attempt,
              answer: text.trim(),
              scores: result.grade.scores,
              tip: result.grade.tip,
              total: result.grade.total,
              max: result.grade.max,
            },
          }).catch(() => undefined);
        }
      })
      .catch(() => setError("Grading couldn't run just now. Try again in a moment."))
      .finally(() => setBusy(false));
  };

  const showEditor = !grade || revising;

  return (
    <section className="mt-5 animate-rise-in rounded-3xl bg-card p-5 shadow-card">
      <p className="text-[11px] font-semibold text-primary-text">{task.label}</p>
      <h2 className="mt-1 text-xl leading-snug">{written.prompt}</h2>
      <blockquote className="mt-3 rounded-2xl border-l-4 border-primary/40 bg-muted/50 px-4 py-3 text-[13px] font-semibold leading-relaxed text-foreground">
        {written.passage}
      </blockquote>
      {/* written.guidance describes what a strong answer does, so it stays hidden
          until after submission — shown before, it hands over the answer. */}

      {showEditor && focus && (
        <p className="mt-3 text-[13px] font-bold text-primary-text">
          This time, focus on {CRITERION_LABEL[focus].toLowerCase()} — it's been your weakest part.
        </p>
      )}

      {showEditor && (
        <>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            readOnly={busy}
            rows={written.type === "restate" || written.type === "testable" ? 3 : 6}
            maxLength={3000}
            placeholder={task.placeholder}
            aria-label="Your argument"
            className="mt-4 w-full resize-none rounded-2xl border-2 border-border bg-background px-4 py-3 text-sm font-semibold leading-relaxed text-foreground outline-none focus-visible:border-primary"
          />
          <div className="mt-1 flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
            <span>
              {text.trim()
                ? `${text.trim().split(/\s+/).length} words`
                : "Grades reasoning, not spelling"}
            </span>
            {attempt === 2 && <span>Revision</span>}
          </div>
          {error && <p className="mt-2 text-[13px] font-semibold text-destructive">{error}</p>}
          {busy && <GradingProgress companion={companion} elapsed={elapsed} />}
          <Button
            type="button"
            onClick={submit}
            disabled={
              busy ||
              text.trim().length <
                (written.type === "restate" || written.type === "testable" ? 12 : 20)
            }
            className="sticky-action mt-3 h-12 w-full rounded-full text-base font-semibold"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
            {busy ? "Grading…" : attempt === 2 ? "Resubmit" : "Submit for feedback"}
          </Button>
        </>
      )}

      {grade && !revising && (
        <div className="mt-4 space-y-3 animate-pop-in">
          <div className="flex items-end gap-2">
            <CompanionAvatar companion={companion} size={56} className="shrink-0" />
            <div className="flex-1 rounded-2xl rounded-bl-sm border-2 border-primary/30 bg-primary-soft px-4 py-2.5">
              <p className="text-[13px] font-bold text-foreground">
                {onTopic
                  ? `${grade.total} of ${grade.max} · +${argumentXpFor(grade.total, grade.max)} XP`
                  : "That answered a different question."}
              </p>
              <p className="mt-1 text-[13px] font-semibold leading-snug text-accent-foreground">
                Try this: {grade.tip}
              </p>
            </div>
          </div>

          {task.criteria.map((criterion) => {
            const row = grade.scores[criterion] ?? {
              score: 1,
              feedback: "Nothing here yet to grade on this criterion.",
            };
            return (
              <div key={criterion} className="rounded-2xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold text-foreground">
                    {CRITERION_LABEL[criterion]}
                  </p>
                  <div className="flex gap-1" aria-label={`${row.score} out of 4`}>
                    {[1, 2, 3, 4].map((step) => (
                      <span
                        key={step}
                        className={`h-2 w-5 rounded-full ${
                          step <= row.score ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-1.5 text-[13px] font-semibold leading-snug text-muted-foreground">
                  {row.feedback}
                </p>
              </div>
            );
          })}

          {written.guidance && (
            <div className="rounded-2xl border border-dashed border-primary/40 p-3">
              <p className="text-[11px] font-bold text-primary-text">What a strong answer does</p>
              <p className="mt-1 text-[13px] font-semibold leading-snug text-muted-foreground">
                {written.guidance}
              </p>
            </div>
          )}

          {attempt === 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAttempt(2);
                setRevising(true);
              }}
              className="h-11 w-full rounded-full font-semibold"
            >
              Revise and resubmit once
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
