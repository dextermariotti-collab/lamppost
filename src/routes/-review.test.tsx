// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduledDrill } from "@/lib/review-drills";

const h = vi.hoisted(() => ({
  drillsLoad: true,
  items: [] as unknown[],
  grade: vi.fn(),
  recordReview: vi.fn(),
  celebrateAnswer: vi.fn(),
  clearAnswerFeedback: vi.fn(),
  playCue: vi.fn(),
  reports: [] as {
    courseTopic?: string;
    lessonTitle?: string;
    lessonIndex?: number;
    excerpt?: string;
  }[],
}));

vi.mock("@/lib/review-drills", () => ({
  useDueDrills: () => ({ items: h.items, hydrated: true, grade: h.grade }),
  useDrillSchedule: () => ({ items: [] }),
  nextReviewLine: () => "Nothing is scheduled.",
}));
vi.mock("@/lib/progress", () => ({ useProgress: () => ({ recordReview: h.recordReview }) }));
vi.mock("@/lib/rating", () => ({ recordDrillOutcome: vi.fn() }));
vi.mock("@/lib/feedback", () => ({ playCue: h.playCue }));
vi.mock("@/components/AnswerFeedback", () => ({
  celebrateAnswer: h.celebrateAnswer,
  clearAnswerFeedback: h.clearAnswerFeedback,
}));
vi.mock("@/components/ReportContentButton", () => ({
  ReportContentButton: ({ context }: { context: (typeof h.reports)[number] }) => {
    h.reports.push(context);
    return <button type="button">Report this content</button>;
  },
}));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ScreenHeader", () => ({ ScreenHeader: () => null }));
vi.mock("@/components/LineBullet", () => ({ GuideMark: () => null }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>,
}));
/** The AI-written drill the stand-in serves. */
const flawDrill = {
  kind: "flaw",
  claim: "Every bakery on Elm Street sells bread, so bread is sold only on Elm Street.",
  options: ["It reverses the claim", "It cites a survey", "It attacks the baker"],
  correct: 0,
  explanation: "All A are B doesn't make all B A.",
};

/** A stand-in drill: answer it right with the nudge, wrong, or skip it as the screen offers. */
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
        if (h.drillsLoad) onShown?.(flawDrill);
      }, [onShown]);
      return (
        <div>
          <button type="button" onClick={() => onAnswer(1, 7, "a", flawDrill, 2, 0.5)}>
            Right, with the nudge
          </button>
          <button type="button" onClick={() => onAnswer(0, 7, "b", flawDrill, 2, 1)}>
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
    lessonIndex: 0,
    reason: "missed",
    overdueDays: 0,
  }) as unknown as ScheduledDrill;
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

beforeEach(() => {
  h.items = [drill(1), drill(2)];
  h.reports = [];
  h.drillsLoad = true;
  vi.clearAllMocks();
});
afterEach(cleanup);

describe("Daily review", () => {
  it("counts a right answer after the nudge as right, and pays and shows half", () => {
    render(<Screen />);
    click("Right, with the nudge");
    expect(h.grade).toHaveBeenCalledWith(expect.any(String), true, 7);
    expect(h.recordReview).toHaveBeenCalledWith(true, 0.5);
    expect(h.celebrateAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ correct: true, xp: REVIEW_XP.correct / 2 }),
    );
    expect(h.playCue).toHaveBeenCalledTimes(1);
    expect(h.playCue).toHaveBeenCalledWith("correct");
  });

  it("shows what a missed review pays, and plays the miss cue once", () => {
    render(<Screen />);
    click("Wrong");
    expect(h.recordReview).toHaveBeenCalledWith(false, 1);
    expect(h.celebrateAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ correct: false, xp: REVIEW_XP.wrong }),
    );
    expect(h.playCue).toHaveBeenCalledTimes(1);
    expect(h.playCue).toHaveBeenCalledWith("wrong");
  });

  it("lets a drill that can't be fetched be skipped, ungraded, and says it stays due", () => {
    render(<Screen />);
    click("Skip this drill");
    expect(screen.getByText(/2 of 2/)).toBeTruthy();
    click("Skip this drill");
    expect(h.grade).not.toHaveBeenCalled();
    expect(h.recordReview).not.toHaveBeenCalled();
    expect(screen.getByText(/all 2 drills were skipped, so nothing was graded/i)).toBeTruthy();
    expect(screen.getByText(/still due and comes? back in a later review/i)).toBeTruthy();
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

describe("Daily review: the summary", () => {
  const finishWith = (...moves: ("right" | "wrong" | "skip")[]) => {
    h.items = moves.map((_, i) => drill(i + 1));
    render(<Screen />);
    for (const move of moves) {
      if (move === "skip") {
        click("Skip this drill");
        continue;
      }
      click(move === "right" ? "Right, with the nudge" : "Wrong");
      click(/next drill|finish review/i);
    }
  };
  const summary = () => document.body.textContent ?? "";

  it("doesn't call a review where every drill was skipped complete, or anything handled", () => {
    finishWith("skip", "skip", "skip", "skip", "skip");
    expect(screen.queryByText("Review complete")).toBeNull();
    expect(screen.getByRole("heading", { name: "No drills answered" })).toBeTruthy();
    expect(summary()).toContain("All 5 drills were skipped, so nothing was graded.");
    expect(summary()).not.toMatch(/handled|missed|tomorrow/i);
  });

  it("tells right, missed and skipped apart, and says what happens to each", () => {
    finishWith("right", "wrong", "skip");
    expect(screen.getByText("Review complete")).toBeTruthy();
    expect(summary()).toContain("1 right · 1 missed · 1 skipped");
    expect(summary()).toContain("The one you missed comes back tomorrow as a new scenario.");
    expect(summary()).toContain("The one you skipped is still due");
    expect(summary()).not.toMatch(/handled/);
  });

  it("only says missed ones come back tomorrow when one was missed", () => {
    finishWith("right", "right", "skip");
    expect(summary()).toContain("2 right · 0 missed · 1 skipped");
    expect(summary()).not.toMatch(/missed comes? back|tomorrow/i);
    cleanup();
    finishWith("right", "right");
    expect(summary()).toContain("2 right · 0 missed");
    expect(summary()).not.toMatch(/tomorrow|skipped/i);
    expect(summary()).toContain("Each one comes back later, further apart.");
  });

  it("counts several misses in the plural", () => {
    finishWith("wrong", "wrong");
    expect(summary()).toContain("0 right · 2 missed");
    expect(summary()).toContain("The 2 you missed come back tomorrow as new scenarios.");
  });
});

describe("Daily review: reporting a drill", () => {
  it("offers a report under a drill as soon as it is shown, quoting its prompt and options", () => {
    render(<Screen />);
    expect(screen.getByRole("button", { name: "Report this content" })).toBeTruthy();
    expect(h.reports.at(-1)).toEqual({
      courseTopic: "Review drill",
      lessonTitle: "The actual claim",
      lessonIndex: 1,
      excerpt: expect.stringContaining(flawDrill.claim),
    });
    for (const option of flawDrill.options) expect(h.reports.at(-1)!.excerpt).toContain(option);
  });

  it("offers nothing to report while a drill hasn't loaded", () => {
    h.drillsLoad = false;
    render(<Screen />);
    expect(screen.queryByRole("button", { name: "Report this content" })).toBeNull();
  });

  it("puts the report away with the drill when moving on", () => {
    render(<Screen />);
    click("Wrong");
    h.drillsLoad = false;
    click(/next drill/i);
    expect(screen.queryByRole("button", { name: "Report this content" })).toBeNull();
  });

  it("takes the answer banner down when moving to the next drill", () => {
    render(<Screen />);
    click("Wrong");
    expect(h.clearAnswerFeedback).not.toHaveBeenCalled();
    click(/next drill/i);
    expect(h.clearAnswerFeedback).toHaveBeenCalledTimes(1);
  });
});
