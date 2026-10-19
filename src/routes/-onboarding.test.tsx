// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  playCue: vi.fn(),
  saveIntent: vi.fn(),
  unlockLessons: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => h.navigate,
}));
vi.mock("@/lib/feedback", () => ({ playCue: h.playCue }));
vi.mock("@/lib/onboarding", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/onboarding")>()),
  saveIntent: h.saveIntent,
}));
vi.mock("@/lib/progress", () => ({
  useProgress: () => ({ unlockLessons: h.unlockLessons, setDailyGoal: vi.fn() }),
}));
vi.mock("@/lib/companion-store", () => ({ markOnboardingSeen: vi.fn() }));
vi.mock("@/components/LegalFooter", () => ({ LegalFooter: () => null }));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/steps/StepView", () => ({
  StepView: ({ onResolve }: { onResolve: (r: { score: number }) => void }) => (
    <button type="button" onClick={() => onResolve({ score: 1 })}>
      Answer the first question
    </button>
  ),
}));
vi.mock("@/components/exercises/DrillVariant", () => ({
  DrillVariant: ({
    onAnswer,
    skip,
  }: {
    onAnswer: (...args: unknown[]) => void;
    skip?: { label: string; onSkip: () => void };
  }) => (
    <div>
      <button type="button" onClick={() => onAnswer(1, 3, "a", {}, 2, 0.5)}>
        Right, with the nudge
      </button>
      <button type="button" onClick={() => onAnswer(0, 3, "b", {}, 2, 1)}>
        Wrong
      </button>
      {skip && (
        <button type="button" onClick={skip.onSkip}>
          {skip.label}
        </button>
      )}
    </div>
  ),
}));

import { Route } from "./onboarding";
import { rewardsHeld } from "@/lib/reward-hold";

const Screen = Route.options.component as () => ReactNode;
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

const toSetup = () => {
  render(<Screen />);
  click("Try one question");
  click("Answer the first question");
  click(/continue/i);
};
const toPlacement = () => {
  toSetup();
  fireEvent.click(screen.getByRole("radio", { name: /skip what i already know/i }));
  click("Start learning");
};

afterEach(cleanup);

describe("Onboarding", () => {
  it("says which step it is on in words, not only in dots", () => {
    render(<Screen />);
    expect(screen.getByText("Step 1 of 3")).toBeTruthy();
    click("Try one question");
    expect(screen.getByText("Step 2 of 3")).toBeTruthy();
  });

  it("plays one cue for the first question", () => {
    render(<Screen />);
    click("Try one question");
    click("Answer the first question");
    click("Answer the first question");
    expect(h.playCue).toHaveBeenCalledTimes(1);
    expect(h.playCue).toHaveBeenCalledWith("correct");
  });

  it("tells the truth about how long the placement check can run", () => {
    toSetup();
    expect(screen.queryByText(/five quick questions/i)).toBeNull();
    expect(screen.getByText(/up to 9 quick questions/i)).toBeTruthy();
  });

  it("counts a right answer after the nudge as right, and holds rewards until it ends", () => {
    toPlacement();
    expect(rewardsHeld()).toBe(true);
    click("Right, with the nudge");
    expect(h.playCue).toHaveBeenLastCalledWith("correct");
    click(/next drill/i);
    click("Wrong");
    click(/next drill/i);
    click("Wrong");
    expect(screen.getByRole("heading", { name: "1 of 3" })).toBeTruthy();
    click(/continue/i);
    expect(h.saveIntent).toHaveBeenLastCalledWith({
      placementScore: 1,
      placementSkipped: false,
    });
    cleanup();
    expect(rewardsHeld()).toBe(false);
  });

  it("offers Start at lesson 1 when a drill can't be fetched", () => {
    toPlacement();
    click("Start at lesson 1");
    expect(h.saveIntent).toHaveBeenLastCalledWith({ placementScore: null, placementSkipped: true });
    expect(h.unlockLessons).not.toHaveBeenCalled();
    expect(h.navigate).toHaveBeenCalledWith({ to: "/", replace: true });
  });
});
