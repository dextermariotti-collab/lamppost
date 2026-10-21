import { Link } from "@tanstack/react-router";
import { GuideMark } from "@/components/LineBullet";
import { AiConsentSheet } from "@/components/AiConsentSheet";
import { AiLabel } from "@/components/AiLabel";
import { ReportContentButton } from "@/components/ReportContentButton";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CalendarClock, RefreshCw, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAiConsentGate } from "@/lib/ai-consent";
import {
  FREE_WEEKLY_PRACTICE,
  MAX_PRACTICE_TURNS,
  nextPracticeReset,
  savePracticeResult,
  VERDICT_COPY,
  type PracticeClose,
  type PracticeTurn,
} from "@/lib/practice";
import {
  MAX_PRACTICE_ANSWER_CHARS,
  practiceTurn,
  type PracticeAccess,
} from "@/lib/practice.functions";

type Props = {
  slug: string;
  /** 1-based, as the lesson screens count. */
  lessonIndex: number;
  lessonTitle: string;
  signedIn: boolean;
  /** Where signing in comes back to: this lesson's path on this site. */
  returnTo: string;
  /** Called once the learner is done (finished or skipped). */
  onDone: (close: PracticeClose | null) => void;
};

type Phase = "intro" | "loading" | "chatting" | "closed" | "error" | "weekly-limit";

function reopensText(at: Date) {
  const day = at.toLocaleDateString("en-US", { weekday: "long" });
  const time = at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} at ${time}`;
}

export function PracticeChat({
  slug,
  lessonIndex,
  lessonTitle,
  signedIn,
  returnTo,
  onDone,
}: Props) {
  const takeTurn = useServerFn(practiceTurn);
  const consent = useAiConsentGate();
  const [phase, setPhase] = useState<Phase>("intro");
  /** Turns the server has answered. */
  const [transcript, setTranscript] = useState<PracticeTurn[]>([]);
  /** The learner's reply on its way, or the one that failed and Retry sends again. */
  const [unsent, setUnsent] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [access, setAccess] = useState<PracticeAccess | null>(null);
  const [close, setClose] = useState<PracticeClose | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [transcript, phase]);

  const send = useCallback(
    async (answer: string, id: string | null) => {
      setPhase("loading");
      setError("");
      setUnsent(answer.length > 0 ? answer : null);

      const result = await takeTurn({
        data: { context: { slug, lessonIndex, lessonTitle }, answer, sessionId: id },
      }).catch(() => null);

      if (!result || !result.ok) {
        if (result && "upgrade" in result && result.upgrade) {
          setUnsent(null);
          setPhase("weekly-limit");
          return;
        }
        setError(result?.reason ?? "Practice is unavailable right now. Tap retry in a moment.");
        setPhase("error");
        return;
      }

      setSessionId(result.sessionId);
      setAccess(result.access);
      setTranscript([
        ...transcript,
        ...(answer.length > 0 ? [{ role: "learner" as const, text: answer }] : []),
        { role: "tutor", text: result.reply },
      ]);
      setUnsent(null);
      setDraft("");

      if (result.done && result.verdict) {
        const closed: PracticeClose = {
          verdict: result.verdict,
          remembered: result.remembered ?? "",
          connectionMade: result.connectionMade,
        };
        savePracticeResult(slug, lessonIndex, closed);
        setClose(closed);
        setPhase("closed");
      } else {
        setPhase("chatting");
      }
    },
    [takeTurn, transcript, slug, lessonIndex, lessonTitle],
  );

  const shown: PracticeTurn[] =
    unsent !== null ? [...transcript, { role: "learner", text: unsent }] : transcript;
  const learnerTurns = transcript.filter((t) => t.role === "learner").length;
  const tutorSaid = [
    ...transcript.filter((t) => t.role === "tutor").map((t) => t.text),
    ...(close?.remembered ? [close.remembered] : []),
  ];

  if (!signedIn) {
    return (
      <Card>
        <Heading />
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This lesson is already saved on this device. Explaining it back is a short conversation
          with the guide, saved to an account, so it needs you to sign in.
        </p>
        <Button
          className="mt-4 h-12 w-full rounded-sm text-base font-bold"
          onClick={() => onDone(null)}
        >
          Finish the lesson
        </Button>
        <Link
          to="/auth"
          search={{ redirect: returnTo }}
          className="mt-2 flex min-h-11 w-full items-center justify-center text-sm font-bold text-primary-text underline-offset-4 hover:underline"
        >
          Sign in to explain it back
        </Link>
      </Card>
    );
  }

  if (phase === "weekly-limit") {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <CalendarClock aria-hidden className="mt-1 h-5 w-5 shrink-0 text-primary-text" />
          <div>
            <h3 className="font-sans text-base font-bold">
              That's this week's {FREE_WEEKLY_PRACTICE} explain-it-back sessions
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              They start again {reopensText(nextPracticeReset(new Date()))}. Lessons, reviews and
              notes don't need one, so carry on with those.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (phase === "intro") {
    return (
      <Card>
        <Heading />
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          No options to pick from. Explain this lesson in your own words, and the guide reacts to
          what you actually wrote, then asks you to connect it to something you already learned.
        </p>
        <Button
          className="mt-4 h-11 w-full justify-between px-4 font-bold"
          onClick={() => consent.ask(() => void send("", null))}
        >
          <span>Explain it back</span>
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={() => onDone(null)}
          className="mt-2 h-9 w-full text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip for now
        </button>
        <AiConsentSheet {...consent.sheet} />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <Heading />
        {access && !access.subscribed && (
          <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
            {access.remaining} of {access.freeAllowance} left
          </span>
        )}
      </div>

      <div role="log" aria-label="Conversation with the guide" className="mt-4 space-y-3">
        {shown.map((turn, i) => (
          <div
            key={`${i}-${turn.text.slice(0, 12)}`}
            className={`animate-rise-in ${turn.role === "learner" ? "flex justify-end" : "flex items-start gap-2"}`}
          >
            {turn.role === "tutor" && <GuideMark size={34} className="mt-0.5 shrink-0" />}
            <p
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm font-semibold leading-relaxed ${
                turn.role === "learner"
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary-soft text-accent-foreground"
              }`}
            >
              <span className="sr-only">{turn.role === "tutor" ? "The guide: " : "You: "}</span>
              {turn.text}
            </p>
          </div>
        ))}
        {phase === "loading" && (
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <GuideMark size={30} />
            <span className="animate-pulse">Reading your answer…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {tutorSaid.length > 0 && (
        <ReportContentButton
          className="mt-2"
          context={{
            courseSlug: slug,
            courseTopic: "Tutor chat",
            lessonIndex,
            lessonTitle,
            excerpt: tutorSaid.join("\n\n"),
          }}
        />
      )}

      {phase === "error" && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-3"
        >
          <p className="text-sm font-semibold text-foreground">{error}</p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="h-10 flex-1 font-bold"
              onClick={() => consent.ask(() => void send(unsent ?? "", sessionId))}
            >
              <RefreshCw aria-hidden className="h-4 w-4" /> Retry
            </Button>
            <Button variant="ghost" className="h-10 font-bold" onClick={() => onDone(null)}>
              Skip
            </Button>
          </div>
        </div>
      )}

      {phase === "closed" && close && (
        <div className="mt-4 animate-pop-in rounded-2xl bg-primary-soft p-4">
          <p className="text-xs font-semibold text-primary-text">
            {VERDICT_COPY[close.verdict].label}
          </p>
          <p className="mt-1 text-sm font-semibold text-accent-foreground">
            {VERDICT_COPY[close.verdict].blurb}
          </p>
          {close.remembered && (
            <p className="mt-3 border-l-2 border-primary pl-3 text-sm font-semibold italic text-foreground">
              {close.remembered}
            </p>
          )}
          {close.connectionMade && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-text">
              <Sparkles aria-hidden className="h-3.5 w-3.5" /> Connection bonus · +40 XP
            </p>
          )}
          <Button className="mt-4 h-11 w-full font-bold" onClick={() => onDone(close)}>
            Continue
          </Button>
        </div>
      )}

      {(phase === "chatting" || phase === "loading") && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim().length === 0 || phase === "loading") return;
            const answer = draft.trim();
            consent.ask(() => void send(answer, sessionId));
          }}
          className="mt-4"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={MAX_PRACTICE_ANSWER_CHARS}
            placeholder="Explain it in your own words…"
            aria-label="Your explanation"
            className="w-full resize-none rounded-2xl border-2 border-border bg-background px-3.5 py-3 text-sm font-semibold outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold text-muted-foreground">
              Exchange {Math.min(learnerTurns + 1, MAX_PRACTICE_TURNS)} of {MAX_PRACTICE_TURNS}
            </span>
            <Button
              type="submit"
              disabled={draft.trim().length === 0 || phase === "loading"}
              className="h-10 font-bold"
            >
              Send <Send aria-hidden className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
      <AiConsentSheet {...consent.sheet} />
    </Card>
  );
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <section className="mt-5 animate-rise-in rounded-3xl bg-card p-5 shadow-card">{children}</section>
);

const Heading = () => (
  <div className="flex items-start gap-3">
    <GuideMark size={36} className="mt-0.5" />
    <div>
      <p className="legend text-muted-foreground">With your guide</p>
      <h3 className="mt-1 font-sans text-lg font-bold leading-snug">Explain it back</h3>
      <AiLabel note what="The guide's side of this chat" className="mt-1.5" />
    </div>
  </div>
);
