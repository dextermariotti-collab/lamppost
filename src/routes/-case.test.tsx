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
  /** Today's case when a test wants a different one from the library's first. */
  today: null as null | import("@/lib/daily-case").DailyCase,
  repeat: false,
  wantsNew: false,
  writing: false,
  record: vi.fn((_id: string, _right: number, _total: number) => true),
}));

vi.mock("@/lib/daily-case", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/daily-case")>();
  const { DAILY_CASES: cases } = await import("@/content/cases");
  return {
    ...real,
    useDailyCase: () => ({
      pick: { case: h.today ?? cases[0]!, repeat: h.repeat, done: false },
      result: undefined,
      hydrated: true,
      wantsNew: h.wantsNew,
      record: h.record,
    }),
  };
});
vi.mock("@/lib/daily-case-ai", () => ({ useAiCaseTopUp: () => h.writing }));
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
vi.mock("@/components/ReportContentButton", () => ({
  ReportContentButton: ({
    context,
  }: {
    context: { courseTopic?: string; lessonTitle?: string; excerpt?: string };
  }) => (
    <button
      type="button"
      data-topic={context.courseTopic}
      data-title={context.lessonTitle}
      data-excerpt={context.excerpt}
    >
      Report this content
    </button>
  ),
}));
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
afterEach(() => {
  cleanup();
  h.today = null;
  h.repeat = false;
  h.wantsNew = false;
  h.writing = false;
  h.record.mockClear();
});

const shownTitle = () => document.getElementById("case-title")?.textContent;

describe("Today's case across midnight", () => {
  it("keeps the case in progress when the day turns over, and records that one", () => {
    const [first, next] = [DAILY_CASES[0]!, DAILY_CASES[1]!];
    const { rerender } = render(<Screen />);
    fireEvent.click(screen.getByRole("button", { name: "Miss question 1" }));
    expect(shownTitle()).toBe(first.title);

    h.today = next;
    rerender(<Screen />);
    expect(shownTitle()).toBe(first.title);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(h.record).toHaveBeenCalledWith(first.id, 0, 3);
    expect(screen.getByRole("heading", { name: first.title })).toBeTruthy();
  });
});

describe("Today's case while an AI one is being written", () => {
  const aiCase = { ...DAILY_CASES[0]!, id: "ai-2026-10-21", title: "Written for today" };

  it("waits for it rather than starting an old case in its place", () => {
    h.repeat = true;
    h.wantsNew = true;
    h.today = DAILY_CASES[1]!;
    const { rerender } = render(<Screen />);
    expect(screen.getByRole("status").textContent).toMatch(/being written/);
    expect(screen.queryByRole("button", { name: "Finish" })).toBeNull();

    h.writing = true;
    rerender(<Screen />);
    expect(screen.queryByRole("button", { name: "Finish" })).toBeNull();

    h.writing = false;
    h.wantsNew = false;
    h.repeat = false;
    h.today = aiCase;
    rerender(<Screen />);
    expect(shownTitle()).toBe("Written for today");
  });

  it("plays the old case if no new one could be written", () => {
    h.repeat = true;
    h.wantsNew = true;
    h.today = DAILY_CASES[1]!;
    const { rerender } = render(<Screen />);
    h.writing = true;
    rerender(<Screen />);
    h.writing = false;
    rerender(<Screen />);
    expect(shownTitle()).toBe(DAILY_CASES[1]!.title);
    expect(screen.getByText(/here is one from a while back/)).toBeTruthy();
  });
});

describe("Today's case, when an AI wrote it", () => {
  const aiCase = { ...DAILY_CASES[0]!, id: "ai-2026-10-20", title: "A case an AI wrote" };

  it("can be reported while it is read and once it is finished", () => {
    h.today = aiCase;
    render(<Screen />);
    const report = screen.getByRole("button", { name: /report this content/i });
    expect(report.dataset["topic"]).toBe("AI daily case");
    expect(report.dataset["title"]).toBe("A case an AI wrote");
    expect(report.dataset["excerpt"]).toContain(aiCase.text);
    expect(report.dataset["excerpt"]).toContain(aiCase.questions[0]!.step.prompt);
    expect(screen.getByText(/written by an AI/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(screen.getByText("Case finished")).toBeTruthy();
    expect(screen.getByRole("button", { name: /report this content/i })).toBeTruthy();
  });

  it("isn't offered for a written case, which no AI wrote", () => {
    render(<Screen />);
    expect(screen.queryByRole("button", { name: /report this content/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(screen.queryByRole("button", { name: /report this content/i })).toBeNull();
  });
});

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
