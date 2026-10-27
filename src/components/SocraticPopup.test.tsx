// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COMPANION } from "@/lib/companions";

const mocks = vi.hoisted(() => ({ socraticLine: vi.fn() }));
vi.mock("@/lib/socratic.functions", () => ({ socraticLine: mocks.socraticLine }));

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

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

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
    fireEvent.click(await screen.findByText(/tap to answer/i));
    fireEvent.change(screen.getByLabelText(/reply to your companion/i), {
      target: { value: "Because the data is thin." },
    });
    fireEvent.click(screen.getByLabelText(/send reply/i));
    await waitFor(() => expect(screen.getByText(/needs a breather/i)).toBeTruthy());
  });
});
