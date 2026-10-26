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
/**
 * The first question is answered right; a placement question can be answered either way. Each
 * shows its prompt, so a test can see which lesson's question is on screen.
 */
vi.mock("@/components/steps/StepView", () => ({
  StepView: ({
    step,
    onResolve,
  }: {
    step: { id: string; prompt: string };
    onResolve: (r: { score: number }) => void;
  }) =>
    step.id.startsWith("placement-") ? (
      <div>
        <p>{step.prompt}</p>
        <button type="button" onClick={() => onResolve({ score: 1 })}>
          Right
        </button>
        <button type="button" onClick={() => onResolve({ score: 0 })}>
          Wrong
        </button>
      </div>
    ) : (
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
/** Each lesson's script: a note, then its closing case, which is what placement asks. */
vi.mock("@/lib/steps/use-lesson-script", () => ({
  useLessonScript: (_unitId: string | undefined, lessonId: string | undefined) =>
    !lessonId || !h.drillsLoad
      ? { status: "loading" }
      : {
          status: "ready",
          script: {
            lessonId,
            steps: [
              { id: "intro", kind: "note", prompt: "A note." },
              { id: `placement-${lessonId}`, kind: "choice", prompt: `The case for ${lessonId}` },
            ],
          },
        },
}));

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

  it("asks each lesson's closing case, stops after two misses, and holds rewards until it ends", () => {
    toPlacement();
    expect(rewardsHeld()).toBe(true);
    expect(screen.getByText(`The case for ${LESSONS[0]!.id}`)).toBeTruthy();
    click("Right");
    expect(h.playCue).toHaveBeenLastCalledWith("correct");
    click(/next question/i);
    expect(screen.getByText(`The case for ${LESSONS[2]!.id}`)).toBeTruthy();
    click("Wrong");
    click(/next question/i);
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

  it("offers Start at lesson 1 instead of the check", () => {
    toPlacement();
    click("Start at lesson 1");
    expect(h.saveIntent).toHaveBeenLastCalledWith({ placementScore: null, placementSkipped: true });
    expect(h.unlockLessons).not.toHaveBeenCalled();
    expect(h.navigate).toHaveBeenCalledWith({ to: "/", replace: true });
  });
});

describe("Onboarding: reporting a placement question", () => {
  it("offers a report under a question, quoting it and naming its lesson", () => {
    h.reports = [];
    toPlacement();
    expect(screen.getByRole("button", { name: "Report this content" })).toBeTruthy();
    expect(h.reports.at(-1)).toEqual({
      courseTopic: "Placement question",
      lessonTitle: LESSONS[0]!.title,
      lessonIndex: 1,
      excerpt: expect.stringContaining(`The case for ${LESSONS[0]!.id}`),
    });
  });

  it("offers nothing to report while a question is loading, and names the next one's lesson", () => {
    h.reports = [];
    toPlacement();
    click("Right");
    h.drillsLoad = false;
    click(/next question/i);
    expect(screen.queryByRole("button", { name: "Report this content" })).toBeNull();
    expect(screen.getByText(/loading the question/i)).toBeTruthy();
  });
});
