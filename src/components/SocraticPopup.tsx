import { Send, X } from "lucide-react";
import { GuideMark } from "@/components/LineBullet";
import { AiLabel } from "@/components/AiLabel";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { companionName, type Companion } from "@/lib/companions";
import { describeAnswer, describeExercise, type Exercise } from "@/lib/exercises";
import { isLimited } from "@/lib/rate-limit";
import { socraticLine } from "@/lib/socratic.functions";

/** The "needs a breather" note is shown once per visit, not after every answer. */
let limitNoted = false;

/**
 * The mascot's Socratic beat: after a wrong answer (and now and then after a
 * right one) it asks one short question about the learner's reasoning. Replying
 * is optional and never blocks progress.
 */
export function SocraticPopup({
  companion,
  lessonTitle,
  objective,
  exercise,
  answer,
  correct,
  onDismiss,
}: {
  companion: Companion;
  lessonTitle: string;
  objective: string;
  exercise: Exercise;
  answer: unknown;
  correct: boolean;
  onDismiss: () => void;
}) {
  const [question, setQuestion] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const asked = useRef(false);
  const name = companionName(companion);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void socraticLine({
      data: {
        mode: "question",
        companionName: name,
        lessonTitle,
        objective,
        exercise: describeExercise(exercise),
        learnerAnswer: describeAnswer(exercise, answer),
        correct,
        question: "",
        reply: "",
      },
    })
      .then((result) => {
        if (result.ok) setQuestion(result.line);
        else if (isLimited(result) && !limitNoted) {
          limitNoted = true;
          setNote(result.reason);
        }
      })
      .catch(() => undefined);
  }, [name, lessonTitle, objective, exercise, answer, correct]);

  if (!question) {
    if (!note) return null;
    return (
      <div
        role="status"
        className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-card px-4 py-3"
      >
        <p className="flex-1 text-[13px] font-semibold leading-snug text-muted-foreground">
          {note}
        </p>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const send = () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    void socraticLine({
      data: {
        mode: "reply",
        companionName: name,
        lessonTitle,
        objective,
        exercise: "",
        learnerAnswer: "",
        correct,
        question,
        reply: reply.trim(),
      },
    })
      .then((result) =>
        setFeedback(
          result.ok
            ? result.line
            : isLimited(result)
              ? result.reason
              : "Let's keep to the lesson for now.",
        ),
      )
      .catch(() => setFeedback("Let's keep to the lesson for now."))
      .finally(() => setSending(false));
  };

  return (
    <div className="mt-4 flex animate-rise-in items-end gap-2">
      <GuideMark size={60} className="shrink-0 animate-float" />
      <div className="flex-1 rounded-2xl rounded-bl-sm border-2 border-primary/30 bg-primary-soft px-4 py-3">
        <div className="flex items-start gap-2">
          <p
            aria-live="polite"
            className="flex-1 text-[13px] font-semibold leading-snug text-foreground"
          >
            {question}
          </p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </div>
        <AiLabel className="mt-1.5" />

        {feedback ? (
          <p className="mt-2 text-[13px] font-semibold leading-snug text-accent-foreground">
            {feedback}
          </p>
        ) : open ? (
          <div className="mt-2 flex items-end gap-2">
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={2}
              maxLength={600}
              placeholder="Optional — say what you think"
              aria-label="Reply to your companion"
              className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <Button
              type="button"
              size="sm"
              disabled={!reply.trim() || sending}
              onClick={send}
              aria-label="Send reply"
              className="h-9 shrink-0 rounded-sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-1.5 text-[12px] font-bold text-primary-text hover:underline"
          >
            Tap to answer (optional)
          </button>
        )}
      </div>
    </div>
  );
}
