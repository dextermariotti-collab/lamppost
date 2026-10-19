// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduledDrill } from "@/lib/review-drills";

const h = vi.hoisted(() => ({
  items: [] as unknown[],
  grade: vi.fn(),
  recordReview: vi.fn(),
  celebrateAnswer: vi.fn(),
  playCue: vi.fn(),
}));

vi.mock("@/lib/review-drills", () => ({
  useDueDrills: () => ({ items: h.items, hydrated: true, grade: h.grade }),
  useDrillSchedule: () => ({ items: [] }),
  nextReviewLine: () => "Nothing is scheduled.",
}));
vi.mock("@/lib/progress", () => ({ useProgress: () => ({ recordReview: h.recordReview }) }));
vi.mock("@/lib/rating", () => ({ recordDrillOutcome: vi.fn() }));
vi.mock("@/lib/feedback", () => ({ playCue: h.playCue }));
vi.mock("@/components/AnswerFeedback", () => ({ celebrateAnswer: h.celebrateAnswer }));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ScreenHeader", () => ({ ScreenHeader: () => null }));
vi.mock("@/components/LineBullet", () => ({ GuideMark: () => null }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>,
}));
/** A stand-in drill: answer it right with the nudge, wrong, or skip it as the screen offers. */
vi.mock("@/components/exercises/DrillVariant", () => ({
  DrillVariant: ({
    onAnswer,
    skip,
  }: {
    onAnswer: (...args: unknown[]) => void;
    skip?: { label: string; onSkip: () => void };
  }) => (
    <div>
      <button type="button" onClick={() => onAnswer(1, 7, "a", {}, 2, 0.5)}>
        Right, with the nudge
      </button>
      <button type="button" onClick={() => onAnswer(0, 7, "b", {}, 2, 1)}>
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

import { Route } from "./review";
import { REVIEW_XP } from "@/lib/progress-core";
import { rewardsHeld } from "@/lib/reward-hold";

const Screen = Route.options.component as () => ReactNode;
const drill = (n: number): ScheduledDrill =>
  ({
    key: `claims-the-actual-claim#flaw-${n}`,
    lessonId: "claims-the-actual-claim",
    kind: "flaw",
    seen: [],
    unitTitle: "Claims",
    lessonTitle: "The actual claim",
    reason: "missed",
    overdueDays: 0,
  }) as unknown as ScheduledDrill;
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

beforeEach(() => {
  h.items = [drill(1), drill(2)];
});
afterEach(cleanup);

describe("Daily review", () => {
  it("counts a right answer after the nudge as right, and shows what a right review pays", () => {
    render(<Screen />);
    click("Right, with the nudge");
    expect(h.grade).toHaveBeenCalledWith(expect.any(String), true, 7);
    expect(h.recordReview).toHaveBeenCalledWith(true);
    expect(h.celebrateAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ correct: true, xp: REVIEW_XP.correct }),
    );
    expect(h.playCue).toHaveBeenCalledTimes(1);
    expect(h.playCue).toHaveBeenCalledWith("correct");
  });

  it("shows what a missed review pays, and plays the miss cue once", () => {
    render(<Screen />);
    click("Wrong");
    expect(h.celebrateAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ correct: false, xp: REVIEW_XP.wrong }),
    );
    expect(h.playCue).toHaveBeenCalledTimes(1);
    expect(h.playCue).toHaveBeenCalledWith("wrong");
  });

  it("lets a drill that can't be fetched be skipped, ungraded, and says it stays queued", () => {
    render(<Screen />);
    click("Skip this drill");
    expect(screen.getByText(/2 of 2/)).toBeTruthy();
    click("Skip this drill");
    expect(h.grade).not.toHaveBeenCalled();
    expect(h.recordReview).not.toHaveBeenCalled();
    expect(screen.getByText(/the 2 you skipped are still in your queue/i)).toBeTruthy();
  });

  it("names its progress bar and says how far along it is", () => {
    render(<Screen />);
    const bar = screen.getByRole("progressbar", { name: "Review progress" });
    expect(bar.getAttribute("aria-valuenow")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("2");
    click("Right, with the nudge");
    click(/next drill/i);
    expect(bar.getAttribute("aria-valuenow")).toBe("1");
    expect((bar.firstElementChild as HTMLElement).style.width).toBe("50%");
  });

  it("holds badges and level-ups until the review is over", () => {
    render(<Screen />);
    expect(rewardsHeld()).toBe(true);
    click("Wrong");
    click(/next drill/i);
    click("Wrong");
    click(/finish review/i);
    expect(screen.getByText("Review complete")).toBeTruthy();
    expect(rewardsHeld()).toBe(false);
  });
});
