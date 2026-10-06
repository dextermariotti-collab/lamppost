import { useState } from "react";
import { LineBullet } from "@/components/LineBullet";
import { ThinkingGraph } from "@/components/ThinkingGraph";
import { UNITS } from "@/lib/curriculum";
import type { UnitMastery } from "@/lib/mastery";
import { skillNotes, type SkillNote } from "@/lib/progress-view";
import { unitAccent } from "@/lib/unit-accent";

const NOTE: Record<SkillNote, { text: string; className: string }> = {
  strongest: { text: "Strongest", className: "bg-primary-soft text-primary-text" },
  review: {
    text: "Worth another look",
    className: "border border-flame/40 bg-flame/10 text-foreground",
  },
};

/**
 * How well each of the seven skills is going, from drills actually answered. The strongest
 * skill and any that need another look are named in words, not only by the length of a bar.
 * "Map" shows the same skills as the graph of how they connect.
 */
export function SkillsCard({
  units,
  done,
}: {
  /** Null until the browser has read the learner's answers. */
  units: UnitMastery[] | null;
  /** Lesson indexes finished, for the map. */
  done: ReadonlySet<number>;
}) {
  const [view, setView] = useState<"list" | "map">("list");
  const anyAnswered = units?.some((unit) => unit.answered > 0) ?? false;
  const notes = units ? skillNotes(units) : {};
  const rows =
    units ?? UNITS.map((u) => ({ unitId: u.id, title: u.title, accuracy: 0, answered: 0 }));

  return (
    <section aria-labelledby="skills-heading" className="sign mt-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="skills-heading" className="text-lg">
          Skills
        </h2>
        <div role="group" aria-label="Show skills as" className="flex border-2 border-edge">
          {(["list", "map"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className={`legend min-h-10 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                view === option ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {option === "list" ? "List" : "Map"}
            </button>
          ))}
        </div>
      </div>

      {view === "map" ? (
        <div className="mt-3">
          <ThinkingGraph done={done} />
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            {anyAnswered
              ? "How often you get each unit’s drills right."
              : "Accuracy on each unit’s drills appears after a few answers."}
          </p>
          <ul className="mt-3 space-y-3.5">
            {rows.map((unit) => {
              const started = units !== null && unit.answered > 0;
              const pct = Math.round(unit.accuracy * 100);
              const note = notes[unit.unitId];
              return (
                <li key={unit.unitId}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold">
                      <LineBullet unitId={unit.unitId} />
                      {unit.title}
                      {note && (
                        <span
                          className={`inline-block rounded-sm px-2 py-0.5 text-[11px] font-bold ${NOTE[note].className}`}
                        >
                          {NOTE[note].text}
                        </span>
                      )}
                    </p>
                    <p className="shrink-0 font-mono text-xs font-bold text-muted-foreground">
                      {units === null ? "" : started ? `${pct}%` : "Not started"}
                    </p>
                  </div>
                  <div aria-hidden className="mt-1.5 h-1.5 overflow-hidden bg-muted">
                    <div
                      className="h-full"
                      style={{
                        background: unitAccent(unit.unitId).color,
                        width: `${started ? pct : 0}%`,
                        transition: "width 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
