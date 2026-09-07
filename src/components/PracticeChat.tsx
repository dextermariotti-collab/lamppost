import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Lock, RefreshCw, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { Button } from "@/components/ui/button";
import { companionName, type Companion } from "@/lib/companions";
import {
  FREE_WEEKLY_PRACTICE,
  MAX_PRACTICE_TURNS,
  savePracticeResult,
  VERDICT_COPY,
  type PracticeClose,
  type PracticeTurn,
} from "@/lib/practice";
import { practiceTurn, type PracticeAccess } from "@/lib/practice.functions";

type Props = {
  slug: string;
  lessonIndex: number;
  topic: string;
  lessonTitle: string;
  lessonText: string;
  earlierLessons: string[];
  companion: Companion;
  signedIn: boolean;
  /** Called once the learner is done (finished or skipped). */
  onDone: (close: PracticeClose | null) => void;
};

type Phase = "intro" | "loading" | "chatting" | "closed" | "error" | "upgrade";

export function PracticeChat({
  slug,
  lessonIndex,
  topic,
  lessonTitle,
  lessonText,
  earlierLessons,
  companion,
  signedIn,
  onDone,
}: Props) {
  const takeTurn = useServerFn(practiceTurn);
  const [phase, setPhase] = useState<Phase>("intro");
  const [transcript, setTranscript] = useState<PracticeTurn[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [access, setAccess] = useState<PracticeAccess | null>(null);
  const [close, setClose] = useState<PracticeClose | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const name = companionName(companion);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [transcript, phase]);

  const send = useCallback(
    async (answer: string, id: string | null) => {
      setPhase("loading");
      setError("");
      const pending: PracticeTurn[] =
        answer.length > 0 ? [...transcript, { role: "learner", text: answer }] : transcript;
      if (answer.length > 0) setTranscript(pending);

      const result = await takeTurn({
        data: {
          context: {
            slug,
            lessonIndex,
            topic,
            lessonTitle,
            lessonText: lessonText.slice(0, 6000),
            earlierLessons,
            companionName: name,
          },
          transcript,
          answer,
          sessionId: id,
        },
      }).catch(() => null);

      if (!result || !result.ok) {
        if (result && "upgrade" in result && result.upgrade) {
          setPhase("upgrade");
          return;
        }
        setError(result?.reason ?? "Practice is unavailable right now. Tap retry in a moment.");
        setPhase("error");
        return;
      }

      setSessionId(result.sessionId);
      setAccess(result.access);
      setTranscript([...pending, { role: "tutor", text: result.reply }]);
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
    [takeTurn, transcript, slug, lessonIndex, topic, lessonTitle, lessonText, earlierLessons, name],
  );

  const learnerTurns = transcript.filter((t) => t.role === "learner").length;

  if (!signedIn) {
    return (
      <Card>
        <Heading name={name} />
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Practice sessions are saved to your account so {name} remembers how you explained things.
          Create an account or sign in to try it.
        </p>
        <div className="mt-4 flex gap-2">
          <Button asChild className="h-11 flex-1 font-bold">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button variant="outline" className="h-11 font-bold" onClick={() => onDone(null)}>
            Skip
          </Button>
        </div>
      </Card>
    );
  }

  if (phase === "upgrade") {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <Lock className="mt-1 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h3 className="font-sans text-base font-bold">You've used this week's practice</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Every course, lesson and review stays free and complete. Lamppost Practice unlocks
              unlimited explain-it-back sessions with {name} — {FREE_WEEKLY_PRACTICE} a week are on
              the house.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button asChild className="h-11 flex-1 font-bold">
            <Link to="/premium">See Lamppost Practice</Link>
          </Button>
          <Button variant="outline" className="h-11 font-bold" onClick={() => onDone(null)}>
            Skip
          </Button>
        </div>
      </Card>
    );
  }

  if (phase === "intro") {
    return (
      <Card>
        <Heading name={name} />
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          No options to pick from. {name} asks you to explain this lesson in your own words, then
          reacts to what you actually wrote — and pushes you to connect it to something you already
          learned.
        </p>
        <Button
          className="mt-4 h-11 w-full justify-between px-4 font-bold"
          onClick={() => void send("", null)}
        >
          <span>Explain it back</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <button
          onClick={() => onDone(null)}
          className="mt-2 h-9 w-full text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip for now
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <Heading name={name} />
        {access && !access.subscribed && (
          <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
            {access.remaining} of {access.freeAllowance} left
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {transcript.map((turn, i) => (
          <div
            key={`${i}-${turn.text.slice(0, 12)}`}
            className={`animate-rise-in ${turn.role === "learner" ? "flex justify-end" : "flex items-start gap-2"}`}
          >
            {turn.role === "tutor" && (
              <CompanionAvatar companion={companion} size={34} className="mt-0.5 shrink-0" />
            )}
            <p
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm font-semibold leading-relaxed ${
                turn.role === "learner"
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary-soft text-accent-foreground"
              }`}
            >
              {turn.text}
            </p>
          </div>
        ))}
        {phase === "loading" && (
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <CompanionAvatar companion={companion} size={30} />
            <span className="animate-pulse">{name} is reading your answer…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {phase === "error" && (
        <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm font-semibold text-foreground">{error}</p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="h-10 flex-1 font-bold"
              onClick={() => void send(draft.trim(), sessionId)}
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
            <Button variant="ghost" className="h-10 font-bold" onClick={() => onDone(null)}>
              Skip
            </Button>
          </div>
        </div>
      )}

      {phase === "closed" && close && (
        <div className="mt-4 animate-pop-in rounded-2xl bg-primary-soft p-4">
          <p className="text-xs font-semibold text-primary">
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
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Connection bonus · +40 XP
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
            void send(draft.trim(), sessionId);
          }}
          className="mt-4"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
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
              Send <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <section className="mt-5 animate-rise-in rounded-3xl bg-card p-5 shadow-card">{children}</section>
);

const Heading = ({ name }: { name: string }) => (
  <div>
    <p className="text-[11px] font-semibold text-primary">
      Practice with {name}
    </p>
    <h3 className="mt-1 font-sans text-lg font-bold leading-snug">Explain it back</h3>
  </div>
);
