import { useId, useState } from "react";
import { FeedbackPanel } from "@/components/steps/StepFrame";
import { OptionList } from "@/components/steps/OptionList";
import type { ChoiceStep } from "@/lib/steps/types";

/**
 * One question of a unit check. There is one go: the first pick is the answer, it is marked
 * right or wrong straight away, and the reason is shown, so the check measures and still teaches.
 */
export function CheckQuestion({
  item,
  number,
  total,
  onAnswered,
}: {
  item: ChoiceStep;
  number: number;
  total: number;
  onAnswered: (correct: boolean) => void;
}) {
  const headingId = useId();
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const right = picked === item.correct;
  const whyNot = picked !== null && !right ? item.options[picked]?.whyNot : undefined;

  return (
    <section aria-labelledby={headingId} className="sign animate-rise-in p-5">
      <p className="legend text-muted-foreground">
        Question {number} of {total}
      </p>
      <h2 id={headingId} className="mt-1 text-xl leading-snug">
        {item.prompt}
      </h2>
      {item.stimulus && (
        <blockquote className="mt-4 rounded-sm bg-primary-soft p-4 text-[15px] font-semibold leading-relaxed text-accent-foreground">
          {item.stimulus}
        </blockquote>
      )}
      <div className="mt-4">
        <OptionList
          name="Answers"
          options={item.options}
          picked={picked}
          correct={answered ? item.correct : null}
          locked={answered}
          onPick={(i) => {
            if (answered) return;
            setPicked(i);
            onAnswered(i === item.correct);
          }}
        />
      </div>
      <FeedbackPanel
        message={
          answered
            ? {
                tone: right ? "right" : "wrong",
                title: right ? "Right" : "Not this one",
                body: whyNot ? `${whyNot} ${item.why}` : item.why,
              }
            : null
        }
      />
    </section>
  );
}
