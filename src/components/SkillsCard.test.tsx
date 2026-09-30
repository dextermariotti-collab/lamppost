// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UNITS } from "@/lib/curriculum";
import type { UnitMastery } from "@/lib/mastery";
import { SkillsCard } from "./SkillsCard";

vi.mock("@/components/ThinkingGraph", () => ({
  ThinkingGraph: ({ done }: { done: ReadonlySet<number> }) => <div>graph of {done.size} lessons</div>,
}));

afterEach(cleanup);

const mastery = (index: number, accuracy: number, answered: number): UnitMastery => ({
  unitId: UNITS[index]!.id,
  title: UNITS[index]!.title,
  emoji: UNITS[index]!.emoji,
  accuracy,
  answered,
});
const empty = UNITS.map((_, i) => mastery(i, 0, 0));

describe("Skills card", () => {
  it("lists all seven skills as not started, with a promise of what fills them in", () => {
    render(<SkillsCard units={empty} done={new Set()} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(UNITS.length);
    expect(screen.getAllByText("Not started")).toHaveLength(UNITS.length);
    expect(screen.getByText(/appears after a few answers/)).toBeTruthy();
  });

  it("prints no status at all until the learner's answers have been read", () => {
    render(<SkillsCard units={null} done={new Set()} />);
    expect(screen.queryByText("Not started")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(UNITS.length);
  });

  it("names the strongest skill and the one worth another look, in words", () => {
    const units = empty.map((u, i) =>
      i === 0 ? mastery(0, 0.82, 6) : i === 2 ? mastery(2, 0.58, 4) : u,
    );
    render(<SkillsCard units={units} done={new Set([0, 1, 2, 3, 4])} />);
    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]!).getByText("Strongest")).toBeTruthy();
    expect(within(rows[0]!).getByText("82%")).toBeTruthy();
    expect(within(rows[2]!).getByText("Worth another look")).toBeTruthy();
    expect(within(rows[2]!).getByText("58%")).toBeTruthy();
    expect(within(rows[1]!).queryByText(/Strongest|Worth another look/)).toBeNull();
  });

  it("switches to the map of how the skills connect, and back", () => {
    render(<SkillsCard units={empty} done={new Set([0, 1, 2, 3, 4, 5, 6])} />);
    const map = screen.getByRole("button", { name: "Map" });
    const list = screen.getByRole("button", { name: "List" });
    expect(list.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(map);
    expect(map.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("graph of 7 lessons")).toBeTruthy();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    fireEvent.click(list);
    expect(screen.getAllByRole("listitem")).toHaveLength(UNITS.length);
  });
});
