import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";
import { useState } from "react";
import { AiLabel } from "@/components/AiLabel";
import { LineBullet } from "@/components/LineBullet";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { CURRICULUM_SLUG, LESSONS, lessonIndexOf } from "@/lib/curriculum";
import {
  LOOK_SOURCES,
  LOOK_TEXT,
  lookInputProblem,
  type LookResult,
  type LookSource,
} from "@/lib/look-closer";
import { lookCloser } from "@/lib/look-closer.functions";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/look")({
  head: () => ({
    meta: [
      { title: "Check something you saw — Lamppost" },
      {
        name: "description",
        content:
          "Paste a post, an ad, a headline or a chatbot answer and get the questions from your lessons that matter most for it.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LookScreen,
});

/**
 * "Check something you saw": the lessons' questions, pointed at a text the learner found. It
 * shows where to look and how to check, and leaves the verdict to them.
 */
function LookScreen() {
  const [text, setText] = useState("");
  const [source, setSource] = useState<LookSource>("post");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookResult | null>(null);
  const ready = lookInputProblem(text) === null;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const reply = await lookCloser({ data: { text, source } });
      if (reply.ok) setResult(reply.result);
      else setError(reply.reason);
    } catch {
      setError("That didn't go through. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PhoneFrame>
      <ScreenHeader
        title="Check something you saw"
        description="Paste a post, an ad, a headline or a chatbot answer. You'll get the questions from your lessons that matter most for it. Whether it's true is your call."
        backTo="/"
      />
      <div className="px-5 pb-10">
        {result ? (
          <LookAnswer
            text={text}
            result={result}
            onAgain={() => {
              setResult(null);
              setText("");
            }}
          />
        ) : (
          <>
            <fieldset>
              <legend className="legend text-muted-foreground">Where it's from</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(LOOK_SOURCES) as LookSource[]).map((key) => (
                  <label
                    key={key}
                    className={`flex min-h-10 cursor-pointer items-center rounded-sm border-2 px-3 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring ${
                      source === key
                        ? "border-foreground bg-primary text-primary-foreground"
                        : "border-edge bg-card text-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name="source"
                      value={key}
                      checked={source === key}
                      onChange={() => setSource(key)}
                      className="sr-only"
                    />
                    {LOOK_SOURCES[key]}
                  </label>
                ))}
              </div>
            </fieldset>

            <label htmlFor="look-text" className="legend mt-5 block text-muted-foreground">
              The text
            </label>
            <textarea
              id="look-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              readOnly={busy}
              rows={7}
              maxLength={LOOK_TEXT.max}
              placeholder="Paste it here, or type out the part that caught your eye."
              className="mt-2 w-full resize-none rounded-sm border-2 border-edge bg-card px-4 py-3 text-[15px] leading-relaxed text-foreground outline-none focus-visible:border-foreground"
            />
            <p className="mt-1 text-right font-mono text-xs text-muted-foreground">
              {text.trim().length} / {LOOK_TEXT.max}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              What you paste is sent to an AI service to write the questions, and isn't saved. Don't
              paste anything private.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
                {error}
              </p>
            )}
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={!ready || busy}
              className="mt-4 h-12 w-full justify-between rounded-sm px-4 text-base font-bold disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
            >
              {busy ? "Looking closer…" : "Look closer"}
              <Search aria-hidden className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>
    </PhoneFrame>
  );
}

function LookAnswer({
  text,
  result,
  onAgain,
}: {
  text: string;
  result: LookResult;
  onAgain: () => void;
}) {
  const { doneLessons } = useProgress();
  return (
    <>
      <details className="sign p-4">
        <summary className="legend cursor-pointer text-muted-foreground">What you pasted</summary>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{text}</p>
      </details>

      <section className="mt-5" aria-labelledby="look-claim">
        <p className="legend text-muted-foreground">What it wants you to accept</p>
        <h2 id="look-claim" className="mt-1 text-xl leading-snug">
          {result.claim}
        </h2>
      </section>

      <section className="mt-6" aria-labelledby="look-questions">
        <h2 id="look-questions" className="legend text-muted-foreground">
          Questions to ask of it
        </h2>
        <ol className="mt-2 border-y-2 border-edge">
          {result.lenses.map((lens) => {
            const lesson = LESSONS.find((l) => l.id === lens.lessonId)!;
            const index = lessonIndexOf(lesson.id);
            return (
              <li key={lens.lessonId} className="border-b border-border py-4 last:border-b-0">
                <p className="legend flex items-center gap-2 text-muted-foreground">
                  <LineBullet unitId={lesson.unitId} />
                  {doneLessons.has(index) ? (
                    <Link
                      to="/notes/$lessonId"
                      params={{ lessonId: lesson.id }}
                      className="underline underline-offset-2"
                    >
                      {lesson.title}
                    </Link>
                  ) : (
                    <Link
                      to="/course/$slug/lesson/$index"
                      params={{ slug: CURRICULUM_SLUG, index: String(index + 1) }}
                      className="underline underline-offset-2"
                    >
                      {lesson.title}
                    </Link>
                  )}
                </p>
                <p className="mt-2 text-[15px] font-bold leading-snug">{lens.question}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{lens.lookFor}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="sign mt-6 p-4" aria-labelledby="look-check">
        <h2 id="look-check" className="legend text-muted-foreground">
          Check it elsewhere
        </h2>
        <p className="mt-1 text-[15px] leading-relaxed">{result.check}</p>
      </section>

      <AiLabel note what="This" className="mt-4" />
      <p className="mt-2 text-xs text-muted-foreground">
        It points to the questions; it doesn't say whether the text is true. That's yours to decide.
      </p>

      <Button
        type="button"
        onClick={onAgain}
        className="mt-6 h-12 w-full justify-between rounded-sm px-4 text-base font-bold"
      >
        Look at something else
        <ArrowRight aria-hidden className="h-5 w-5" />
      </Button>
    </>
  );
}
