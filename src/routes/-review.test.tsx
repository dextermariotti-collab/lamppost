// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduledDrill } from "@/lib/review-drills";

const h = vi.hoisted(() => ({
  items: [] as unknown[],
  /** Lessons whose script fails to load. */
  broken: new Set<string>(),
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
vi.mock("@/components/LineBullet", () => ({ GuideMark: () => null, LineBullet: () => null }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>,
}));
/** A step answered right, right after a hint, or wrong; it shows its prompt. */
vi.mock("@/components/steps/StepView", () => ({
  StepView: ({ step, onResolve }: { step: { prompt: string }; onResolve: (r: object) => void }) => {
    const result = (over: object) => ({
      score: 1,
      answer: null,
      wrongAttempts: 0,
      hintUsed: false,
      revealed: false,
      ...over,
    });
    return (
      <div>
        <p>{step.prompt}</p>
        <button type="button" onClick={() => onResolve(result({}))}>
          Right
        </button>
        <button type="button" onClick={() => onResolve(result({ score: 0.5, hintUsed: true }))}>
          Right, with the hint
        </button>
        <button type="button" onClick={() => onResolve(result({ score: 0.5, wrongAttempts: 1 }))}>
          Wrong
        </button>
      </div>
    );
  },
}));
/** Each lesson's script: a note, then six questions (two for each of its first planned kinds). */
vi.mock("@/content/lessons", () => ({
  loadLessonScript: async (_unitId: string, lessonId: string) =>
    h.broken.has(lessonId)
      ? { ok: false, reason: "missing" }
      : {
          ok: true,
          script: {
            lessonId,
            steps: [
              { id: "n", kind: "note", prompt: "A note." },
              ...[1, 2, 3, 4, 5, 6].map((n) => ({
                id: `q${n}`,
                kind: "choice",
                prompt: `Question ${n} of ${lessonId}`,
              })),
            ],
          },
        },
}));

import { Route } from "./review";
import { LESSONS } from "@/lib/curriculum";
import { REVIEW_XP } from "@/lib/progress-core";
import { rewardsHeld } from "@/lib/reward-hold";

const Screen = Route.options.component as () => ReactNode;
const A = LESSONS[0]!;
const B = LESSONS[1]!;
const drill = (lesson: (typeof LESSONS)[number], over: Partial<ScheduledDrill> = {}) =>
  ({
    key: `${lesson.id}#${lesson.drills[0]}`,
    lessonId: lesson.id,
    kind: lesson.drills[0],
    seen: [],
    unitTitle: "Claims",
    lessonTitle: lesson.title,
    lessonIndex: LESSONS.indexOf(lesson),
    reason: "missed",
    overdueDays: 0,
    ...over,
  }) as unknown as ScheduledDrill;
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const started = () => screen.findByRole("button", { name: "Right" });

beforeEach(() => {
  h.items = [drill(A), drill(B)];
  h.broken = new Set();
  h.reports = [];
  vi.clearAllMocks();
});
afterEach(cleanup);

describe("Daily review", () => {
  it("asks a question from each due lesson's own steps", async () => {
    render(<Screen />);
    await started();
    expect(screen.getByText(`Question 1 of ${A.id}`)).toBeTruthy();
    click("Right");
    click(/continue/i);
    expect(screen.getByText(`Question 1 of ${B.id}`)).toBeTruthy();
  });

  it("asks a step of the item's own kind not served last time", async () => {
    // Lesson 1 plans five kinds, so its first kind is asked by graded steps 1 and 6 (positions 1
    // and 6, served as 101 and 106). The first was served last time.
    h.items = [drill(A, { seen: [101] })];
    render(<Screen />);
    await started();
    expect(screen.getByText(`Question 6 of ${A.id}`)).toBeTruthy();
    click("Right");
    expect(h.grade).toHaveBeenCalledWith(`${A.id}#${A.drills[0]}`, true, 106);
  });

  it("counts a right answer after a hint as right, and pays and shows half", async () => {
    render(<Screen />);
    await started();
    click("Right, with the hint");
    expect(h.grade).toHaveBeenCalledWith(expect.any(String), true, expect.any(Number));
    expect(h.recordReview).toHaveBeenCalledWith(true, 0.5);
    expect(h.celebrateAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ correct: true, xp: REVIEW_XP.correct / 2 }),
    );
    expect(h.playCue).toHaveBeenCalledTimes(1);
    expect(h.playCue).toHaveBeenCalledWith("correct");
  });

  it("counts a question needing a second try as missed, and plays the miss cue once", async () => {
    render(<Screen />);
    await started();
    click("Wrong");
    expect(h.recordReview).toHaveBeenCalledWith(false, 1);
    expect(h.celebrateAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ correct: false, xp: REVIEW_XP.wrong }),
    );
    expect(h.playCue).toHaveBeenCalledTimes(1);
    expect(h.playCue).toHaveBeenCalledWith("wrong");
  });

  it("holds badges and level-ups until the review is over", async () => {
    render(<Screen />);
    await started();
    expect(rewardsHeld()).toBe(true);
    click("Wrong");
    click(/continue/i);
    click("Wrong");
    click(/finish review/i);
    expect(screen.getByText("Review complete")).toBeTruthy();
    expect(rewardsHeld()).toBe(false);
  });

  it("leaves a lesson that can't be loaded ungraded and due, and says so", async () => {
    h.broken = new Set([A.id, B.id]);
    render(<Screen />);
    expect(await screen.findByRole("heading", { name: "No questions answered" })).toBeTruthy();
    expect(h.grade).not.toHaveBeenCalled();
    expect(document.body.textContent).toMatch(/still due and come back in a later review/);
  });

  it("says nothing is due when nothing is", async () => {
    h.items = [];
    render(<Screen />);
    expect(await screen.findByText("Nothing due right now")).toBeTruthy();
  });
});

describe("Daily review: the summary", () => {
  const finishWith = async (...moves: ("right" | "wrong")[]) => {
    h.items = moves.map((_, i) => drill(LESSONS[i]!));
    render(<Screen />);
    await started();
    for (const move of moves) {
      click(move === "right" ? "Right" : "Wrong");
      click(/continue|finish review/i);
    }
  };
  const summary = () => document.body.textContent ?? "";

  it("tells right and missed apart, and says what happens to each", async () => {
    await finishWith("right", "wrong");
    expect(screen.getByText("Review complete")).toBeTruthy();
    expect(summary()).toContain("1 right · 1 missed");
    expect(summary()).toContain("The one you missed comes back tomorrow.");
  });

  it("only says missed ones come back tomorrow when one was missed", async () => {
    await finishWith("right", "right");
    expect(summary()).toContain("2 right · 0 missed");
    expect(summary()).not.toMatch(/tomorrow/i);
    expect(summary()).toContain("Each one comes back later, further apart.");
  });

  it("counts several misses in the plural", async () => {
    await finishWith("wrong", "wrong");
    expect(summary()).toContain("The 2 you missed come back tomorrow.");
  });

  it("names a lesson that couldn't be loaded alongside the ones answered", async () => {
    h.items = [drill(A), drill(B)];
    h.broken = new Set([B.id]);
    render(<Screen />);
    await started();
    click("Right");
    click(/finish review/i);
    expect(summary()).toContain("1 right · 0 missed · 1 skipped");
    expect(summary()).toContain("One question couldn't be loaded.");
  });
});

describe("Daily review: reporting a question", () => {
  it("offers a report quoting the question on screen and naming its lesson", async () => {
    render(<Screen />);
    await started();
    expect(h.reports.at(-1)).toEqual({
      courseTopic: "Review question",
      lessonTitle: A.title,
      lessonIndex: 1,
      excerpt: expect.stringContaining(`Question 1 of ${A.id}`),
    });
    click("Right");
    click(/continue/i);
    await waitFor(() =>
      expect(h.reports.at(-1)).toMatchObject({ lessonTitle: B.title, lessonIndex: 2 }),
    );
  });

  it("takes the answer banner down when moving to the next question", async () => {
    render(<Screen />);
    await started();
    click("Wrong");
    const before = h.clearAnswerFeedback.mock.calls.length;
    click(/continue/i);
    expect(h.clearAnswerFeedback.mock.calls.length).toBeGreaterThan(before);
  });
});
