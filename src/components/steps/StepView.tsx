import type { StepResult } from "@/lib/steps/scoring";
import type { LessonStep } from "@/lib/steps/types";
import { ArgumentBuilder } from "./ArgumentBuilder";
import { CauseExplorer } from "./CauseExplorer";
import { ChoiceStep } from "./ChoiceStep";
import { ConfidenceSlider } from "./ConfidenceSlider";
import { EvidenceUpdater } from "./EvidenceUpdater";
import { FillTheGap } from "./FillTheGap";
import { NoteStep } from "./NoteStep";
import { SortIt } from "./SortIt";
import { SpotTheFlaw } from "./SpotTheFlaw";
import { WhichIsStronger } from "./WhichIsStronger";

/** Renders whichever kind of step this is. Give it a `key` per step so state resets between them. */
export function StepView({
  step,
  onResolve,
}: {
  step: LessonStep;
  onResolve: (result: StepResult) => void;
}) {
  switch (step.kind) {
    case "flaw":
      return <SpotTheFlaw step={step} onResolve={onResolve} />;
    case "builder":
      return <ArgumentBuilder step={step} onResolve={onResolve} />;
    case "sort":
      return <SortIt step={step} onResolve={onResolve} />;
    case "confidence":
      return <ConfidenceSlider step={step} onResolve={onResolve} />;
    case "stronger":
      return <WhichIsStronger step={step} onResolve={onResolve} />;
    case "updater":
      return <EvidenceUpdater step={step} onResolve={onResolve} />;
    case "cause":
      return <CauseExplorer step={step} onResolve={onResolve} />;
    case "gap":
      return <FillTheGap step={step} onResolve={onResolve} />;
    case "choice":
      return <ChoiceStep step={step} onResolve={onResolve} />;
    case "note":
      return <NoteStep step={step} onResolve={onResolve} />;
  }
}
