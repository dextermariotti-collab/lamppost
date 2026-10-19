// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LESSONS } from "@/lib/curriculum";

const h = vi.hoisted(() => ({
  playCue: vi.fn(),
  doneLessons: new Set<number>(),
}));

vi.mock("@/lib/feedback", () => ({ playCue: h.playCue }));
vi.mock("@/lib/progress", () => ({
  useProgress: () => ({ doneLessons: h.doneLessons, hydrated: true }),
}));
vi.mock("@/lib/unit-checks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/unit-checks")>()),
  useUnitChecks: () => ({ checks: {}, hydrated: true }),
  recordCheck: vi.fn(),
}));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ScreenHeader", () => ({ ScreenHeader: () => null }));
vi.mock("@/components/BeforeAfterTable", () => ({ BeforeAfterTable: () => null }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock("@/components/CheckQuestion", () => ({
  CheckQuestion: ({ onAnswered }: { onAnswered: (correct: boolean) => void }) => (
    <div>
      <button type="button" onClick={() => onAnswered(true)}>
        Answer right
      </button>
      <button type="button" onClick={() => onAnswered(false)}>
        Answer wrong
      </button>
    </div>
  ),
}));

import { Route as UnitCheckRoute } from "./check.$unitId.$phase";
import { Route as FinalCheckRoute } from "./final-check";
import { rewardsHeld } from "@/lib/reward-hold";

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const claims = () => new Set(LESSONS.flatMap((l, i) => (l.unitId === "claims" ? [i] : [])));

beforeEach(() => {
  h.doneLessons = new Set();
});
afterEach(cleanup);

describe("Unit check", () => {
  const Screen = UnitCheckRoute.options.component as () => ReactNode;
  beforeEach(() => {
    vi.spyOn(UnitCheckRoute, "useParams").mockReturnValue({ unitId: "claims", phase: "before" });
  });

  it("plays one cue per answer, from its own verdict", () => {
    render(<Screen />);
    click("Answer right");
    expect(h.playCue).toHaveBeenCalledTimes(1);
    expect(h.playCue).toHaveBeenCalledWith("correct");
    click(/next question/i);
    click("Answer wrong");
    expect(h.playCue).toHaveBeenLastCalledWith("wrong");
  });

  it("holds badges and level-ups until the result is shown", () => {
    render(<Screen />);
    expect(rewardsHeld()).toBe(true);
    for (let i = 0; i < 3; i++) {
      click("Answer right");
      click(i < 2 ? /next question/i : /see how you did/i);
    }
    expect(screen.getByText("3 of 3")).toBeTruthy();
    expect(rewardsHeld()).toBe(false);
  });
});

describe("Final check", () => {
  const Screen = FinalCheckRoute.options.component as () => ReactNode;

  it("plays one cue per answer and holds rewards until the before-and-after", () => {
    h.doneLessons = claims();
    render(<Screen />);
    expect(rewardsHeld()).toBe(true);
    for (let i = 0; i < 3; i++) {
      click(i === 1 ? "Answer wrong" : "Answer right");
      click(i < 2 ? /next question/i : /see before and after/i);
    }
    expect(h.playCue.mock.calls.map((c) => c[0])).toEqual(["correct", "wrong", "correct"]);
    expect(screen.getByRole("heading", { name: "Before and after" })).toBeTruthy();
    expect(rewardsHeld()).toBe(false);
  });
});
