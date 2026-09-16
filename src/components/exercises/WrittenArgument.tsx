import { PenLine } from "lucide-react";
import { useState } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { Button } from "@/components/ui/button";
import type { Companion } from "@/lib/companions";
import {
  CRITERION_LABEL,
  RUBRIC_CRITERIA,
  argumentXpFor,
  type ArgumentGrade,
  type WrittenPrompt,
} from "@/lib/exercises";
import { gradeArgument, saveArgumentAttempt } from "@/lib/argument.functions";

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
  onGraded: (total: number, attempt: number) => void;
}) {
  const [text, setText] = useState("");
  const [attempt, setAttempt] = useState(1);
  const [grade, setGrade] = useState<ArgumentGrade | null>(null);
  const [onTopic, setOnTopic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revising, setRevising] = useState(false);

  const submit = () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    void gradeArgument({
      data: {
        lessonId,
        lessonTitle,
        objective,
        prompt: written.prompt,
        answer: text.trim(),
        attempt,
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
        onGraded(result.grade.total, attempt);
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
      <p className="text-[11px] font-semibold text-primary">Make the case</p>
      <h2 className="mt-1 text-xl leading-snug">{written.prompt}</h2>
      {written.guidance && (
        <p className="mt-2 text-[13px] font-semibold text-muted-foreground">{written.guidance}</p>
      )}

      {showEditor && (
        <>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            maxLength={3000}
            placeholder="Three to five sentences. Make a claim, back it, then handle the strongest objection."
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
          <Button
            type="button"
            onClick={submit}
            disabled={busy || text.trim().length < 20}
            className="mt-3 h-12 w-full rounded-full text-base font-semibold"
          >
            <PenLine className="h-4 w-4" />
            {busy ? "Reading your argument…" : attempt === 2 ? "Resubmit" : "Submit for feedback"}
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
                  ? `${grade.total} of 16 · +${argumentXpFor(grade.total)} XP`
                  : "That answered a different question."}
              </p>
              <p className="mt-1 text-[13px] font-semibold leading-snug text-accent-foreground">
                Try this: {grade.tip}
              </p>
            </div>
          </div>

          {RUBRIC_CRITERIA.map((criterion) => {
            const row = grade.scores[criterion];
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
