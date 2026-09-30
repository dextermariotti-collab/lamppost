import { useState } from "react";
import { ThinkingGraph } from "@/components/ThinkingGraph";
import { UNITS } from "@/lib/curriculum";
import type { UnitMastery } from "@/lib/mastery";
import { skillNotes, type SkillNote } from "@/lib/progress-view";

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
  completed,
}: {
  /** Null until the browser has read the learner's answers. */
  units: UnitMastery[] | null;
  completed: number;
}) {
  const [view, setView] = useState<"list" | "map">("list");
  const anyAnswered = units?.some((unit) => unit.answered > 0) ?? false;
  const notes = units ? skillNotes(units) : {};
  const rows =
    units ?? UNITS.map((u) => ({ unitId: u.id, title: u.title, accuracy: 0, answered: 0 }));

  return (
    <section
      aria-labelledby="skills-heading"
      className="mt-4 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="skills-heading" className="text-lg">
          Skills
        </h2>
        <div role="group" aria-label="Show skills as" className="flex rounded-full bg-muted p-0.5">
          {(["list", "map"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className={`min-h-11 rounded-full px-4 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                view === option ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              {option === "list" ? "List" : "Map"}
            </button>
          ))}
        </div>
      </div>

      {view === "map" ? (
        <div className="mt-3">
          <ThinkingGraph completed={completed} />
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
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 text-sm font-bold">
                      {unit.title}
                      {note && (
                        <span
                          className={`ml-2 inline-block rounded-full px-2 py-0.5 align-middle text-[11px] font-bold ${NOTE[note].className}`}
                        >
                          {NOTE[note].text}
                        </span>
                      )}
                    </p>
                    <p className="shrink-0 text-xs font-bold text-muted-foreground">
                      {units === null ? "" : started ? `${pct}%` : "Not started"}
                    </p>
                  </div>
                  <div aria-hidden className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
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
