// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  drillsLoad: true,
  navigate: vi.fn(),
  playCue: vi.fn(),
  saveIntent: vi.fn(),
  unlockLessons: vi.fn(),
  reports: [] as {
    courseTopic?: string;
    lessonTitle?: string;
    lessonIndex?: number;
    excerpt?: string;
  }[],
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
vi.mock("@/components/ReportContentButton", () => ({
  ReportContentButton: ({ context }: { context: (typeof h.reports)[number] }) => {
    h.reports.push(context);
    return <button type="button">Report this content</button>;
  },
}));
/** The AI-written drill the stand-in serves. */
const claimDrill = {
  kind: "claim",
  passage: "The Linden pool should open an hour earlier. Most swimmers arrive before work.",
  options: ["The pool should open earlier", "Most swimmers arrive before work", "Pools are busy"],
  correct: 0,
  explanation: "Everything else supports the first sentence.",
};
vi.mock("@/components/exercises/DrillVariant", async () => {
  const { useEffect } = await import("react");
  return {
    DrillVariant: ({
      onAnswer,
      onShown,
      skip,
    }: {
      onAnswer: (...args: unknown[]) => void;
      onShown?: (exercise: unknown) => void;
      skip?: { label: string; onSkip: () => void };
    }) => {
      // Loads as the real one does once the server answers, unless a test holds it back.
      useEffect(() => {
        if (h.drillsLoad) onShown?.(claimDrill);
      }, [onShown]);
      return (
        <div>
          <button type="button" onClick={() => onAnswer(1, 3, "a", claimDrill, 2, 0.5)}>
            Right, with the nudge
          </button>
          <button type="button" onClick={() => onAnswer(0, 3, "b", claimDrill, 2, 1)}>
            Wrong
          </button>
          {skip && (
            <button type="button" onClick={skip.onSkip}>
              {skip.label}
            </button>
          )}
        </div>
      );
    },
  };
});

import { Route } from "./onboarding";
import { LESSONS } from "@/lib/curriculum";
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

afterEach(() => {
  cleanup();
  h.drillsLoad = true;
});

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

describe("Onboarding: reporting a placement drill", () => {
  it("offers a report under a drill as soon as it is shown, quoting its prompt and options", () => {
    h.reports = [];
    toPlacement();
    expect(screen.getByRole("button", { name: "Report this content" })).toBeTruthy();
    expect(h.reports.at(-1)).toEqual({
      courseTopic: "Placement drill",
      lessonTitle: LESSONS[0]!.title,
      lessonIndex: 1,
      excerpt: expect.stringContaining(claimDrill.passage),
    });
    for (const option of claimDrill.options) expect(h.reports.at(-1)!.excerpt).toContain(option);
  });

  it("names the drill's own lesson, and puts the report away when moving on", () => {
    h.reports = [];
    toPlacement();
    click("Right, with the nudge");
    h.drillsLoad = false;
    click(/next drill/i);
    expect(screen.queryByRole("button", { name: "Report this content" })).toBeNull();
    click("Right, with the nudge");
    expect(h.reports.at(-1)).toMatchObject({ lessonTitle: LESSONS[2]!.title, lessonIndex: 3 });
  });
});
