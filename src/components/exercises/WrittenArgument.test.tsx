// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recordAiConsent } from "@/lib/ai-consent";
import { DEFAULT_COMPANION } from "@/lib/companions";

const mocks = vi.hoisted(() => ({
  gradeArgument: vi.fn(),
}));

vi.mock("@/lib/argument.functions", () => ({ gradeArgument: mocks.gradeArgument }));
vi.mock("@/components/ReportContentButton", () => ({
  ReportContentButton: ({
    context,
  }: {
    context: { courseTopic?: string; lessonIndex?: number; excerpt?: string };
  }) => (
    <button
      type="button"
      data-topic={context.courseTopic}
      data-lesson={context.lessonIndex}
      data-excerpt={context.excerpt}
    >
      Report this content
    </button>
  ),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

import { WrittenArgument } from "./WrittenArgument";

const written = {
  type: "critique" as const,
  prompt: "Name the flaw in this argument.",
  passage: "Everyone I know loves it, so it must be good for everyone.",
  guidance: "Name the flaw.",
};

const grade = {
  ok: true as const,
  onTopic: true,
  grade: {
    scores: {
      flaw: { score: 3, feedback: "You named the bandwagon." },
      why: { score: 3, feedback: "Good reason." },
      fix: { score: 2, feedback: "A fix is missing." },
    },
    tip: "Add one sentence on the fix.",
    total: 8,
    max: 12,
  },
};

function mount() {
  return render(
    <WrittenArgument
      lessonId="claims-the-actual-claim"
      lessonTitle="What is actually claimed"
      objective="Restate the claim."
      written={written}
      companion={DEFAULT_COMPANION}
      onGraded={() => undefined}
    />,
  );
}

const ANSWER =
  "This is the bandwagon fallacy because popularity among friends does not show it is good for everyone, so the conclusion does not follow.";

beforeEach(() => {
  window.localStorage.clear();
  recordAiConsent();
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});

describe("WrittenArgument and the AI", () => {
  beforeEach(() => {
    mocks.gradeArgument.mockReset();
    mocks.gradeArgument.mockResolvedValue(grade);
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(cleanup);

  it("asks before the first answer goes to the grader, and Not now keeps it here", async () => {
    window.localStorage.clear();
    mount();
    fireEvent.change(screen.getByLabelText("Your argument"), { target: { value: ANSWER } });
    fireEvent.click(screen.getByRole("button", { name: /Submit for feedback/ }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(mocks.gradeArgument).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Your argument") as HTMLTextAreaElement).value).toBe(ANSWER);

    fireEvent.click(screen.getByRole("button", { name: /Submit for feedback/ }));
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
    });
    expect(mocks.gradeArgument).toHaveBeenCalledTimes(1);
    expect(mocks.gradeArgument.mock.calls[0]![0].data.answer).toBe(ANSWER);
  });

  it("lets the learner report the feedback, naming the lesson", async () => {
    mount();
    expect(screen.queryByRole("button", { name: /report this content/i })).toBeNull();
    fireEvent.change(screen.getByLabelText("Your argument"), { target: { value: ANSWER } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Submit for feedback/ }));
    });
    const report = await screen.findByRole("button", { name: /report this content/i });
    expect(report.dataset["topic"]).toBe("Writing feedback");
    expect(report.dataset["lesson"]).toBe("1");
    expect(report.dataset["excerpt"]).toContain("Add one sentence on the fix.");
    expect(report.dataset["excerpt"]).toContain("You named the bandwagon.");
    expect(report.dataset["excerpt"]).not.toContain(ANSWER);
  });
});

/**
 * Regression: the grader takes ~15s. Its loading panel used to sit at the very
 * bottom of the card, underneath the lesson's sticky footer (AI disclaimer,
 * report and back controls), so the learner saw next to nothing while waiting.
 * The loading state must be prominent and stay up for the whole wait.
 */
describe("WrittenArgument while the grader is working", () => {
  let finish: (value: unknown) => void;
  let fail: (error: unknown) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    mocks.gradeArgument.mockReset();
    mocks.gradeArgument.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          finish = resolve;
          fail = reject;
        }),
    );
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  async function submit() {
    mount();
    fireEvent.change(screen.getByLabelText("Your argument"), { target: { value: ANSWER } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Submit for feedback/ }));
    });
  }

  it("shows a loading status straight away, ahead of the submit button", async () => {
    await submit();
    const status = screen.getByRole("status");
    expect(status.textContent).toMatch(/Reading your argument/);
    const button = screen.getByRole("button", { name: /Grading|Reading/ });
    // The status sits before the button in the page, so the sticky footer can't cover it.
    expect(status.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button).toHaveProperty("disabled", true);
  });

  it.each([1, 5, 10, 15, 30, 60])(
    "is still up after %is, and keeps telling them so",
    async (seconds) => {
      await submit();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(seconds * 1000);
      });
      const status = screen.getByRole("status");
      expect(status).toBeTruthy();
      expect(status.getAttribute("aria-busy")).toBe("true");
      expect(status.textContent?.length).toBeGreaterThan(10);
      expect(screen.queryByText(/Try this/)).toBeNull();
    },
  );

  it("moves through phases so a long wait never looks frozen", async () => {
    await submit();
    const seen = new Set<string>();
    for (let s = 0; s <= 25; s++) {
      seen.add(screen.getByRole("status").textContent ?? "");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole("status").textContent).toMatch(/longer than usual|still working/i);
  });

  it("locks the answer while grading and removes the status only when the grade arrives", async () => {
    await submit();
    expect((screen.getByLabelText("Your argument") as HTMLTextAreaElement).readOnly).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(14_000);
    });
    expect(screen.getByRole("status")).toBeTruthy();
    await act(async () => {
      finish(grade);
    });
    expect(screen.queryByText(/Reading your argument/)).toBeNull();
    expect(screen.getByText(/Try this: Add one sentence on the fix/)).toBeTruthy();
    expect(screen.getByText(/written by an AI, which can make mistakes/)).toBeTruthy();
    // Each criterion's bar is read out as its score.
    const bars = screen.getAllByRole("img", { name: /: \d out of 4$/ });
    expect(bars.length).toBeGreaterThan(0);
    expect(screen.getAllByRole("img", { name: /3 out of 4/ }).length).toBeGreaterThan(0);
  });

  it("returns to an editable form with the error if grading fails", async () => {
    await submit();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    await act(async () => {
      fail(new Error("network"));
    });
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("alert").textContent).toMatch(/Grading couldn't run just now/);
    expect((screen.getByLabelText("Your argument") as HTMLTextAreaElement).readOnly).toBe(false);
  });
});
