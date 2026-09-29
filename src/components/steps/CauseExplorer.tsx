import { useMemo, useState } from "react";
import { describeCorrelations, slopeOf, strengthWord } from "@/lib/steps/checks";
import type { StepResult } from "@/lib/steps/scoring";
import type { CauseStep } from "@/lib/steps/types";
import { OptionList } from "./OptionList";
import { StepFrame } from "./StepFrame";
import { useStepEngine } from "./useStepEngine";

const W = 320;
const H = 210;
const PAD = { l: 40, r: 12, t: 12, b: 34 };

/** Different SHAPES per group as well as different colours, so groups differ without colour. */
const SHAPES = ["circle", "square", "triangle"] as const;
const COLOURS = ["var(--primary)", "var(--flame)", "var(--success)"];

function Mark({
  shape,
  x,
  y,
  colour,
}: {
  shape: (typeof SHAPES)[number];
  x: number;
  y: number;
  colour: string;
}) {
  if (shape === "square")
    return <rect x={x - 4.5} y={y - 4.5} width={9} height={9} fill={colour} />;
  if (shape === "triangle")
    return <polygon points={`${x},${y - 5.5} ${x - 5},${y + 4} ${x + 5},${y + 4}`} fill={colour} />;
  return <circle cx={x} cy={y} r={4.5} fill={colour} />;
}

/**
 * A scatter chart of two things that move together. Switch on the hidden variable and the
 * points split into groups, each drawn with its own shape and its own trend line: inside every
 * group the link is gone. Then say what is really going on.
 */
export function CauseExplorer({
  step,
  onResolve,
}: {
  step: CauseStep;
  onResolve: (result: StepResult) => void;
}) {
  const engine = useStepEngine(onResolve);
  const [split, setSplit] = useState(false);
  const [everSplit, setEverSplit] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const known = engine.phase === "right" || engine.phase === "revealed" ? step.correct : null;

  const view = useMemo(() => describeCorrelations(step), [step]);
  const scale = useMemo(() => {
    const all = step.groups.flatMap((g) => g.points);
    const xs = all.map(([x]) => x);
    const ys = all.map(([, y]) => y);
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
    const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
    const px = (x: number) => PAD.l + ((x - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r);
    const py = (y: number) => H - PAD.b - ((y - y0) / (y1 - y0 || 1)) * (H - PAD.t - PAD.b);
    return { x0, x1, px, py };
  }, [step]);

  const trend = (points: readonly (readonly [number, number])[]) => {
    const slope = slopeOf(points);
    if (slope === null) return null;
    const mx = points.reduce((s, [x]) => s + x, 0) / points.length;
    const my = points.reduce((s, [, y]) => s + y, 0) / points.length;
    const xs = points.map(([x]) => x);
    const a = Math.min(...xs);
    const b = Math.max(...xs);
    return {
      x1: scale.px(a),
      y1: scale.py(my + slope * (a - mx)),
      x2: scale.px(b),
      y2: scale.py(my + slope * (b - mx)),
    };
  };

  const allPoints = step.groups.flatMap((g) => g.points);
  const overallLine = trend(allPoints);

  const summary = split
    ? `Inside each group: ${view.perGroup.map((g) => `${g.label} — ${strengthWord(g.r)}`).join("; ")}.`
    : `Overall: a ${strengthWord(view.overall)}.`;

  return (
    <StepFrame
      label={step.label ?? "Correlation or cause?"}
      prompt={step.prompt}
      hint={step.hint}
      engine={engine}
      onRetry={() => setPicked(null)}
      onShowAnswer={() => {
        setPicked(step.correct);
        engine.reveal({ choice: step.correct }, step.why);
      }}
    >
      <p className="mb-3 text-sm font-semibold">{step.scenario}</p>

      <figure className="rounded-2xl border border-border p-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Scatter chart of ${step.yLabel} against ${step.xLabel}. ${summary}`}
          className="w-full"
        >
          <line
            x1={PAD.l}
            y1={H - PAD.b}
            x2={W - PAD.r}
            y2={H - PAD.b}
            stroke="currentColor"
            strokeOpacity={0.4}
          />
          <line
            x1={PAD.l}
            y1={PAD.t}
            x2={PAD.l}
            y2={H - PAD.b}
            stroke="currentColor"
            strokeOpacity={0.4}
          />
          <text
            x={(PAD.l + W - PAD.r) / 2}
            y={H - 8}
            textAnchor="middle"
            fontSize={11}
            fill="currentColor"
          >
            {step.xLabel}
          </text>
          <text
            x={12}
            y={(PAD.t + H - PAD.b) / 2}
            textAnchor="middle"
            fontSize={11}
            fill="currentColor"
            transform={`rotate(-90 12 ${(PAD.t + H - PAD.b) / 2})`}
          >
            {step.yLabel}
          </text>
          {step.groups.map((g, gi) =>
            g.points.map(([x, y], i) => (
              <Mark
                key={`${g.id}-${i}`}
                shape={split ? SHAPES[gi % 3]! : "circle"}
                colour={split ? COLOURS[gi % 3]! : "currentColor"}
                x={scale.px(x)}
                y={scale.py(y)}
              />
            )),
          )}
          {!split && overallLine && (
            <line {...overallLine} stroke="currentColor" strokeWidth={2} strokeDasharray="6 4" />
          )}
          {split &&
            step.groups.map((g, gi) => {
              const line = trend(g.points);
              return line ? (
                <line
                  key={g.id}
                  {...line}
                  stroke={COLOURS[gi % 3]!}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
              ) : null;
            })}
        </svg>

        {split && (
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs font-semibold">
            {step.groups.map((g, gi) => (
              <li key={g.id} className="flex items-center gap-1.5">
                <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden>
                  <Mark shape={SHAPES[gi % 3]!} colour={COLOURS[gi % 3]!} x={6} y={6.5} />
                </svg>
                {g.label}
              </li>
            ))}
          </ul>
        )}
        <figcaption
          className="px-2 pb-1 pt-2 text-xs font-semibold text-muted-foreground"
          aria-live="polite"
        >
          {summary}
        </figcaption>
      </figure>

      <button
        type="button"
        role="switch"
        aria-checked={split}
        onClick={() => {
          setSplit((s) => !s);
          setEverSplit(true);
        }}
        className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border-2 border-border px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span>Show the hidden variable: {step.hiddenLabel}</span>
        <span
          aria-hidden
          className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${split ? "bg-primary" : "bg-muted"}`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${split ? "translate-x-5" : ""}`}
          />
        </span>
      </button>

      {everSplit ? (
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold">{step.question}</p>
          <OptionList
            name="What is going on"
            options={step.options}
            picked={picked}
            correct={known}
            locked={engine.done}
            onPick={(i) => {
              setPicked(i);
              if (i === step.correct) engine.right({ choice: i }, step.why);
              else engine.wrong(step.options[i]!.whyNot ?? "That isn't what the chart shows.");
            }}
          />
        </div>
      ) : (
        <p className="mt-3 text-center text-xs font-semibold text-muted-foreground">
          Try the switch to see what the chart was hiding.
        </p>
      )}
    </StepFrame>
  );
}
