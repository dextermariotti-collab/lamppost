import { createFileRoute, useParams } from "@tanstack/react-router";
import { AiLabel } from "@/components/AiLabel";
import { useQuery } from "@tanstack/react-query";
import { Loader2, PenLine, Swords, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/lib/account";
import { getDebate, markDebateSeen, submitDebateResponse } from "@/lib/debate.functions";
import { CRITERION_LABEL, WRITTEN_TASKS, type ArgumentGrade } from "@/lib/exercises";

export const Route = createFileRoute("/debate/$id")({
  head: () => ({
    meta: [
      { title: "Debate — Lamppost" },
      {
        name: "description",
        content:
          "Argue your assigned side of the motion in three to five sentences. Both cases are graded on the same rubric.",
      },
      { property: "og:title", content: "Debate — Lamppost" },
      { property: "og:description", content: "Make your case, then see it scored side by side." },
      { property: "og:type", content: "article" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DebateScreen,
});

const CRITERIA = WRITTEN_TASKS.case.criteria;

function GradeCard({ label, grade, tip }: { label: string; grade: ArgumentGrade; tip: string }) {
  return (
    <div className="rounded-3xl bg-card p-4 shadow-soft">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-sm font-bold text-primary-text">
          {grade.total}/{grade.max}
        </p>
      </div>
      <div className="mt-3 space-y-2">
        {CRITERIA.map((criterion) => {
          const row = grade.scores[criterion];
          return (
            <div key={criterion} className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-muted-foreground">
                {CRITERION_LABEL[criterion]}
              </p>
              <div className="flex gap-1" aria-label={`${row?.score ?? 0} out of 4`}>
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={`h-2 w-4 ${step <= (row?.score ?? 0) ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {tip && (
        <p className="mt-3 text-[13px] font-semibold leading-snug text-accent-foreground">
          Try this: {tip}
        </p>
      )}
    </div>
  );
}

function DebateScreen() {
  const { id } = useParams({ from: "/debate/$id" });
  const { signedIn } = useAccount();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["debate", id],
    queryFn: () => getDebate({ data: { id } }),
    enabled: signedIn,
  });

  useEffect(() => {
    if (data?.unseenResult) void markDebateSeen({ data: { id } }).catch(() => undefined);
  }, [data?.unseenResult, id]);

  const submit = () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    void submitDebateResponse({ data: { id, answer: text.trim() } })
      .then((result) => {
        if (!result.ok) setError(result.reason);
        else void refetch();
      })
      .catch(() => setError("That couldn't be submitted just now. Try again in a moment."))
      .finally(() => setBusy(false));
  };

  if (isLoading || !data) {
    return (
      <PhoneFrame>
        <ScreenHeader backTo="/debates" />
        <div className="flex justify-center py-20">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <p className="text-sm text-muted-foreground">This debate isn't available.</p>
          )}
        </div>
      </PhoneFrame>
    );
  }

  const opponentName = data.opponent.displayName ?? `@${data.opponent.handle}`;

  return (
    <PhoneFrame>
      <ScreenHeader backTo="/debates" />
      <div className="px-5 pb-10">
        <div className="flex items-center gap-2 text-primary-text">
          <Swords aria-hidden className="h-4 w-4" />
          <p className="text-xs font-bold">Debate · {data.topic}</p>
        </div>
        <h1 className="mt-2 text-2xl leading-tight">
          You're arguing {data.mySide === "for" ? "FOR" : "AGAINST"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {opponentName} argues {data.theirSide}.
        </p>

        <AiLabel className="mt-4" />
        <blockquote className="mt-2 rounded-2xl border-l-4 border-primary/40 bg-muted/50 px-4 py-3 text-[13px] font-semibold leading-relaxed">
          {data.passage}
        </blockquote>
        <p className="mt-3 text-sm font-semibold">{data.prompt}</p>

        {data.myTurn && (
          <>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={6}
              maxLength={3000}
              placeholder={WRITTEN_TASKS.case.placeholder}
              aria-label="Your case"
              className="mt-4 w-full resize-none rounded-2xl border-2 border-border bg-background px-4 py-3 text-sm font-semibold leading-relaxed outline-none focus-visible:border-primary"
            />
            <p className="mt-1 text-[12px] font-semibold text-muted-foreground">
              {text.trim()
                ? `${text.trim().split(/\s+/).length} words`
                : "Graded on reasoning only"}
            </p>
            {error && <p className="mt-2 text-[13px] font-semibold text-destructive">{error}</p>}
            <Button
              onClick={submit}
              disabled={busy || text.trim().length < 40}
              className="mt-3 h-12 w-full rounded-sm text-base font-semibold"
            >
              <PenLine className="h-4 w-4" />
              {busy ? "Grading your case…" : "Submit my case"}
            </Button>
          </>
        )}

        {!data.myTurn && data.status === "open" && (
          <div className="mt-6 rounded-3xl bg-card p-5 text-center shadow-soft">
            <p className="text-sm font-bold">Your case is in</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Waiting for {opponentName} to write theirs. Results appear here as soon as they do.
            </p>
          </div>
        )}

        {data.status === "graded" && data.myGrade && data.theirGrade && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col items-center rounded-3xl bg-primary-soft p-5 text-center">
              <Trophy aria-hidden className="h-6 w-6 text-primary-text" />
              <p className="mt-2 text-lg font-bold">
                {data.winner === "you"
                  ? "You took it"
                  : data.winner === "them"
                    ? `${opponentName} took it`
                    : "Dead even"}
              </p>
              <p className="mt-1 text-sm font-semibold text-accent-foreground">
                {data.myGrade.total} — {data.theirGrade.total} on the same rubric
              </p>
            </div>

            <AiLabel note what="The scoring" />
            <GradeCard label="Your case" grade={data.myGrade} tip={data.myGrade.tip} />
            <GradeCard
              label={`${opponentName}'s case`}
              grade={data.theirGrade}
              tip={data.theirGrade.tip}
            />

            <div className="rounded-3xl border border-border p-4">
              <p className="text-xs font-bold text-primary-text">What they wrote</p>
              <p className="mt-1 text-[13px] font-semibold leading-relaxed text-muted-foreground">
                {data.theirAnswer}
              </p>
            </div>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
