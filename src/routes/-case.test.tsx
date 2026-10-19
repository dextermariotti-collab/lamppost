// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DAILY_CASES } from "@/content/cases";
import { LESSONS } from "@/lib/curriculum";
import type { StepResult } from "@/lib/steps/scoring";
import type { LessonStep } from "@/lib/steps/types";

const h = vi.hoisted(() => ({
  trackDrillResult: vi.fn(),
  playCue: vi.fn(),
  completeCase: vi.fn(),
}));

vi.mock("@/lib/daily-case", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/daily-case")>();
  const { DAILY_CASES: cases } = await import("@/content/cases");
  return {
    ...real,
    useDailyCase: () => ({
      pick: { case: cases[0]!, repeat: false, done: false },
      result: undefined,
      hydrated: true,
      wantsNew: false,
      record: () => true,
    }),
  };
});
vi.mock("@/lib/daily-case-ai", () => ({ useAiCaseTopUp: () => false }));
vi.mock("@/lib/progress", () => ({
  useProgress: () => ({ doneLessons: new Set<number>(), completeCase: h.completeCase }),
}));
vi.mock("@/lib/review-drills", () => ({ trackDrillResult: h.trackDrillResult }));
vi.mock("@/lib/rating", () => ({ recordDrillOutcome: vi.fn() }));
vi.mock("@/lib/feedback", () => ({ playCue: h.playCue }));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ScreenHeader", () => ({ ScreenHeader: () => null }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>,
}));
/** Stands in for the step player: each button resolves one question, the last finishes. */
vi.mock("@/components/lesson/LessonPlayer", () => ({
  LessonPlayer: ({
    steps,
    onStepResolved,
    onComplete,
  }: {
    steps: LessonStep[];
    onStepResolved: (i: number, step: LessonStep, r: StepResult) => void;
    onComplete: (r: StepResult[]) => void;
  }) => {
    const miss: StepResult = {
      score: 0,
      answer: null,
      wrongAttempts: 1,
      hintUsed: false,
      revealed: false,
    };
    return (
      <div>
        {steps.map((step, i) => (
          <button key={step.id} type="button" onClick={() => onStepResolved(i, step, miss)}>
            Miss question {i + 1}
          </button>
        ))}
        <button type="button" onClick={() => onComplete(steps.map(() => miss))}>
          Finish
        </button>
      </div>
    );
  },
}));

import { Route } from "./case";
import { rewardsHeld } from "@/lib/reward-hold";

const Screen = Route.options.component as () => ReactNode;
afterEach(cleanup);

describe("Today's case", () => {
  it("sends a missed question back to reviews as its lesson's first drill, whatever its place in the case", () => {
    render(<Screen />);
    const item = DAILY_CASES[0]!;
    for (const i of [0, 1, 2]) {
      fireEvent.click(screen.getByRole("button", { name: `Miss question ${i + 1}` }));
      const { lessonId } = item.questions[i]!;
      const plan = LESSONS.find((l) => l.id === lessonId)!.drills;
      expect(h.trackDrillResult).toHaveBeenLastCalledWith(lessonId, plan[0], 0, undefined);
    }
  });

  it("plays one cue per question, from its own verdict", () => {
    render(<Screen />);
    fireEvent.click(screen.getByRole("button", { name: "Miss question 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Miss question 1" }));
    expect(h.playCue).toHaveBeenCalledTimes(1);
    expect(h.playCue).toHaveBeenCalledWith("wrong");
  });

  it("holds badges and level-ups until the case is finished", () => {
    render(<Screen />);
    expect(rewardsHeld()).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(screen.getByText("Case finished")).toBeTruthy();
    expect(rewardsHeld()).toBe(false);
  });
});
