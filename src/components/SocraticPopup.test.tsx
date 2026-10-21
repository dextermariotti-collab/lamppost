// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recordAiConsent } from "@/lib/ai-consent";
import { DEFAULT_COMPANION } from "@/lib/companions";

const mocks = vi.hoisted(() => ({ socraticLine: vi.fn() }));
vi.mock("@/lib/socratic.functions", () => ({ socraticLine: mocks.socraticLine }));
vi.mock("@/components/ReportContentButton", () => ({
  ReportContentButton: ({ context }: { context: { courseTopic?: string; excerpt?: string } }) => (
    <button type="button" data-topic={context.courseTopic} data-excerpt={context.excerpt}>
      Report this content
    </button>
  ),
}));

const limited = {
  ok: false as const,
  reason: "Lumi needs a breather. Questions are back in about 5 minutes.",
  limited: true as const,
  retryAfterSeconds: 300,
};

const exercise = {
  kind: "spotTheFlaw",
  question: "Q",
  options: ["a", "b"],
  correctIndex: 0,
  explanation: "why",
} as never;

async function mount(props: { correct?: boolean } = {}) {
  vi.resetModules();
  const { SocraticPopup } = await import("./SocraticPopup");
  return render(
    <SocraticPopup
      companion={DEFAULT_COMPANION}
      lessonTitle="A lesson"
      objective="Do the thing."
      exercise={exercise}
      answer={1}
      correct={props.correct ?? false}
      onDismiss={() => undefined}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
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
afterEach(cleanup);

const answerWith = (text: string) => {
  fireEvent.click(screen.getByText(/tap to answer/i));
  fireEvent.change(screen.getByLabelText(/reply to the guide/i), { target: { value: text } });
  fireEvent.click(screen.getByLabelText(/send reply/i));
};

describe("SocraticPopup and the AI", () => {
  it("asks before the learner's own reply is sent, and Not now sends nothing", async () => {
    window.localStorage.clear();
    mocks.socraticLine
      .mockResolvedValueOnce({ ok: true, line: "What would change your mind?" })
      .mockResolvedValueOnce({ ok: true, line: "Good: name the evidence." });
    await mount();
    await screen.findByText("What would change your mind?");
    answerWith("Because the data is thin.");
    fireEvent.click(await screen.findByRole("button", { name: "Not now" }));
    expect(mocks.socraticLine).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText(/send reply/i));
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
    });
    expect(mocks.socraticLine).toHaveBeenCalledTimes(2);
    expect(mocks.socraticLine.mock.calls[1]![0].data).toMatchObject({
      mode: "reply",
      reply: "Because the data is thin.",
    });
    expect(await screen.findByText("Good: name the evidence.")).toBeTruthy();
  });

  it("never sends a companion name: the guide speaks for itself", async () => {
    mocks.socraticLine.mockResolvedValue({ ok: true, line: "What would change your mind?" });
    await mount();
    await waitFor(() => expect(mocks.socraticLine).toHaveBeenCalled());
    expect(mocks.socraticLine.mock.calls[0]![0].data).not.toHaveProperty("companionName");
  });

  it("lets the learner report the question, and the answer to their reply", async () => {
    mocks.socraticLine
      .mockResolvedValueOnce({ ok: true, line: "What would change your mind?" })
      .mockResolvedValueOnce({ ok: true, line: "Good: name the evidence." });
    await mount();
    const report = await screen.findByRole("button", { name: /report this content/i });
    expect(report.dataset["topic"]).toBe("Follow-up question");
    expect(report.dataset["excerpt"]).toBe("What would change your mind?");

    answerWith("Because the data is thin.");
    await screen.findByText("Good: name the evidence.");
    const after = screen.getByRole("button", { name: /report this content/i });
    expect(after.dataset["excerpt"]).toContain("Good: name the evidence.");
    expect(after.dataset["excerpt"]).not.toContain("Because the data is thin.");
  });
});

describe("SocraticPopup when a limit was reached", () => {
  it("says so once, quietly, instead of failing silently", async () => {
    mocks.socraticLine.mockResolvedValue(limited);
    await mount();
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/needs a breather/i),
    );
    cleanup();
    // A second wrong answer in the same visit does not repeat the note.
    const { SocraticPopup } = await import("./SocraticPopup");
    render(
      <SocraticPopup
        companion={DEFAULT_COMPANION}
        lessonTitle="A lesson"
        objective="Do the thing."
        exercise={exercise}
        answer={1}
        correct={false}
        onDismiss={() => undefined}
      />,
    );
    await waitFor(() => expect(mocks.socraticLine).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("still shows nothing when the follow-up fails for any other reason", async () => {
    mocks.socraticLine.mockResolvedValue({ ok: false, reason: "No reply." });
    const { container } = await mount();
    await waitFor(() => expect(mocks.socraticLine).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("gives the wait, not a generic line, when the learner's reply is limited", async () => {
    mocks.socraticLine
      .mockResolvedValueOnce({ ok: true, line: "What would change your mind?" })
      .mockResolvedValueOnce(limited);
    await mount();
    await screen.findByText(/tap to answer/i);
    answerWith("Because the data is thin.");
    await waitFor(() => expect(screen.getByText(/needs a breather/i)).toBeTruthy());
  });
});
