// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadUnitNotes } from "@/content/notes";
import { UNITS } from "@/lib/curriculum";
import type { LessonStep } from "@/lib/steps/types";
import { LessonPlayer } from "./LessonPlayer";
import { NotesView } from "./NotesView";

afterEach(cleanup);

describe("NotesView", () => {
  it("draws every lesson's notes as a page with its sections in order", async () => {
    let drawn = 0;
    for (const unit of UNITS) {
      for (const notes of Object.values(await loadUnitNotes(unit.id))) {
        const { unmount } = render(<NotesView notes={notes} />);
        const headings = screen
          .getAllByRole("heading", { level: 2 })
          .map((h) => h.textContent?.trim());
        expect(headings).toEqual([
          "The idea",
          "Words worth knowing",
          "A worked example",
          "Where it gets subtle",
          "A question to carry",
          "Try it this week",
        ]);
        expect(screen.getByText(notes.ask)).toBeTruthy();
        expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(
          notes.example.moves.length,
        );
        unmount();
        drawn += 1;
      }
    }
    expect(drawn).toBe(35);
  });
});

describe("LessonPlayer intro", () => {
  const steps: LessonStep[] = [
    { id: "a", kind: "note", prompt: "First card." },
    {
      id: "b",
      kind: "choice",
      prompt: "Second step?",
      why: "Because.",
      options: [{ text: "Yes" }, { text: "No", whyNot: "Not this." }],
      correct: 0,
    },
  ];

  it("shows the opener above the first step only", () => {
    render(
      <LessonPlayer
        steps={steps}
        onStepResolved={vi.fn()}
        onComplete={vi.fn()}
        intro={<p>Why this lesson matters.</p>}
      />,
    );
    expect(screen.getByText("Why this lesson matters.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.queryByText("Why this lesson matters.")).toBeNull();
    expect(screen.getByText("Second step?")).toBeTruthy();
  });
});
