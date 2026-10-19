import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AiLabel } from "@/components/AiLabel";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { LineBullet } from "@/components/LineBullet";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { DAILY_CASES } from "@/content/cases";
import { LESSONS, unitById } from "@/lib/curriculum";
import {
  CASE_SOURCES,
  caseUnits,
  caseXp,
  isAiCase,
  studiedUnits,
  useDailyCase,
  type DailyCase,
} from "@/lib/daily-case";
import { useAiCaseTopUp } from "@/lib/daily-case-ai";
import { playCue } from "@/lib/feedback";
import { useProgress } from "@/lib/progress";
import { recordDrillOutcome } from "@/lib/rating";
import { trackDrillResult } from "@/lib/review-drills";
import { holdRewards } from "@/lib/reward-hold";
import { reviewKindFor, statedConfidence } from "@/lib/steps/attempts";
import type { StepResult } from "@/lib/steps/scoring";
import type { LessonStep } from "@/lib/steps/types";

export const Route = createFileRoute("/case")({
  head: () => ({
    meta: [
      { title: "Today's case — Lamppost" },
      {
        name: "description",
        content:
          "One real-world text a day, and three questions about it from three different thinking skills. About three minutes, and it counts toward your streak.",
      },
      { property: "og:title", content: "Today's case — Lamppost" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CaseScreen,
});

/**
 * Today's case: read one real-world text, answer three questions about it from three different
 * units. Each answer feeds the review queue and the skill ratings like a lesson step does, and
 * the finished case counts for the day and the streak once.
 */
function CaseScreen() {
  const { doneLessons, completeCase } = useProgress();
  const { pick, result, hydrated, wantsNew, record } = useDailyCase(DAILY_CASES, doneLessons);
  const writing = useAiCaseTopUp(wantsNew);
  const [finished, setFinished] = useState<StepResult[] | null>(null);

  return (
    <PhoneFrame>
      <ScreenHeader
        title="Today's case"
        description="One real-world text, three questions from three different lines. About three minutes."
        backTo="/"
      />
      <div className="px-5 pb-10">
        {!hydrated || !pick ? null : writing ? (
          <p className="sign p-5 text-sm text-muted-foreground" role="status">
            You've read every case so far, so today's is being written. This takes a moment.
          </p>
        ) : finished ? (
          <CaseFinished item={pick.case} results={finished} />
        ) : pick.done ? (
          <CaseDone item={pick.case} right={result?.right ?? null} total={result?.total ?? 3} />
        ) : (
          <CasePlayer
            key={pick.case.id}
            item={pick.case}
            repeat={pick.repeat}
            studied={studiedUnits(doneLessons)}
            onComplete={(results) => {
              const right = results.filter((r) => r.score >= 1).length;
              if (record(pick.case.id, right, results.length)) completeCase(right);
              setFinished(results);
            }}
          />
        )}
      </div>
    </PhoneFrame>
  );
}

function CaseText({ item }: { item: DailyCase }) {
  const units = caseUnits(item);
  return (
    <section className="sign p-4" aria-labelledby="case-title">
      <div className="flex items-center justify-between gap-3">
        <p className="legend text-muted-foreground">{CASE_SOURCES[item.source]}</p>
        <span className="flex gap-1">
          {units.map((u) => (
            <LineBullet key={u} unitId={u} size="sm" />
          ))}
          <span className="sr-only">Lines: {units.map((u) => unitById(u).title).join(", ")}</span>
        </span>
      </div>
      <h2 id="case-title" className="mt-1.5 text-lg leading-snug">
        {item.title}
      </h2>
      <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{item.text}</p>
      {isAiCase(item) && <AiLabel note what="This case" className="mt-3" />}
    </section>
  );
}

function CasePlayer({
  item,
  repeat,
  studied,
  onComplete,
}: {
  item: DailyCase;
  repeat: boolean;
  studied: ReadonlySet<string>;
  onComplete: (results: StepResult[]) => void;
}) {
  const units = caseUnits(item);
  // Each question is labeled with its unit, so the mix of skills is visible as it happens.
  const steps = useMemo<LessonStep[]>(
    () =>
      item.questions.map((q, i) => ({
        ...q.step,
        label: `${unitById(units[i]!).title}${studied.has(units[i]!) ? "" : " · new line"}`,
      })),
    [item, units, studied],
  );
  const answered = useRef(new Set<number>());

  // Badges and level-ups wait until the case is over rather than landing on a question.
  useEffect(() => holdRewards(), []);

  const onStepResolved = (index: number, _step: LessonStep, result: StepResult) => {
    if (answered.current.has(index)) return;
    answered.current.add(index);
    const lessonId = item.questions[index]!.lessonId;
    const meta = LESSONS.find((l) => l.id === lessonId);
    playCue(result.score >= 1 ? "correct" : "wrong");
    const confidence = statedConfidence(result.answer);
    // A case question isn't one of its lesson's steps, so its place in the case says nothing about
    // which drill it is: a miss always comes back as the lesson's first planned drill.
    const kind = meta ? reviewKindFor(meta.drills, 0) : null;
    if (kind) trackDrillResult(lessonId, kind, result.score, confidence);
    recordDrillOutcome(lessonId, {
      score: result.score,
      difficulty: 2,
      ...(confidence !== undefined ? { confidence } : {}),
    });
  };

  return (
    <>
      {repeat && (
        <p className="mb-3 text-xs text-muted-foreground">
          You've read every case so far, so here is one from a while back. See what you notice the
          second time.
        </p>
      )}
      <CaseText item={item} />
      <div className="-mx-5 mt-5">
        <LessonPlayer
          steps={steps}
          stopUnits={units}
          onStepResolved={onStepResolved}
          onComplete={onComplete}
          finalLabel="Finish the case"
        />
      </div>
    </>
  );
}

function CaseFinished({ item, results }: { item: DailyCase; results: StepResult[] }) {
  const units = caseUnits(item);
  const right = results.filter((r) => r.score >= 1).length;
  return (
    <>
      <p className="legend text-muted-foreground">Case finished</p>
      <h2 className="mt-1 text-[28px] leading-tight">{item.title}</h2>
      <dl className="mt-4 grid grid-cols-2 border-y-2 border-edge">
        <div className="py-3">
          <dt className="legend text-muted-foreground">Right</dt>
          <dd className="mt-1 font-mono text-lg font-bold">
            {right} of {results.length}
          </dd>
        </div>
        <div className="border-l border-border py-3 pl-3">
          <dt className="legend text-muted-foreground">XP earned</dt>
          <dd className="mt-1 font-mono text-lg font-bold">+{caseXp(right)}</dd>
        </div>
      </dl>
      <ul className="mt-4 space-y-2">
        {item.questions.map((q, i) => {
          const ok = (results[i]?.score ?? 0) >= 1;
          return (
            <li key={q.step.id} className="flex items-center gap-2.5 text-sm font-semibold">
              <LineBullet unitId={units[i]!} />
              <span className="min-w-0 flex-1">{unitById(units[i]!).title}</span>
              {ok ? (
                <Check aria-label="Right" className="h-4 w-4 text-success" strokeWidth={3} />
              ) : (
                <X
                  aria-label="Missed, so it comes back in reviews"
                  className="h-4 w-4 text-destructive"
                  strokeWidth={3}
                />
              )}
            </li>
          );
        })}
      </ul>
      {right < results.length && (
        <p className="mt-2 text-xs text-muted-foreground">
          What you missed comes back in your reviews as a fresh drill.
        </p>
      )}
      <section className="sign mt-5 p-4">
        <p className="legend text-muted-foreground">To carry away</p>
        <p className="mt-1 text-[15px] font-bold leading-snug">{item.takeaway}</p>
      </section>
      <p className="mt-4 text-sm text-muted-foreground">A new case is ready tomorrow.</p>
      <Button asChild className="mt-4 h-12 w-full rounded-sm text-base font-bold">
        <Link to="/">Back to home</Link>
      </Button>
    </>
  );
}

function CaseDone({
  item,
  right,
  total,
}: {
  item: DailyCase;
  right: number | null;
  total: number;
}) {
  return (
    <>
      <p className="legend text-muted-foreground">
        {right === null ? "Done for today" : `Done for today · ${right} of ${total} right`}
      </p>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        A new case is ready tomorrow. Here's today's again, if you want another look.
      </p>
      <CaseText item={item} />
      <section className="mt-4 border-l-4 border-primary pl-4">
        <p className="legend text-muted-foreground">To carry away</p>
        <p className="mt-1 text-[15px] font-bold leading-snug">{item.takeaway}</p>
      </section>
      <Button asChild className="mt-6 h-12 w-full rounded-sm text-base font-bold">
        <Link to="/">Back to home</Link>
      </Button>
    </>
  );
}
