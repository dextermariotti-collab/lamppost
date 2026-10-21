// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recordAiConsent } from "@/lib/ai-consent";
import { COMPANION_PRESETS } from "@/lib/companions";

process.env["TZ"] = "America/New_York";

const mocks = vi.hoisted(() => ({ turn: vi.fn() }));

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/practice.functions", () => ({
  practiceTurn: mocks.turn,
  MAX_PRACTICE_ANSWER_CHARS: 1500,
}));
vi.mock("@/components/ReportContentButton", () => ({
  ReportContentButton: ({ context }: { context: { courseTopic?: string; excerpt?: string } }) => (
    <button type="button" data-topic={context.courseTopic} data-excerpt={context.excerpt}>
      Report this content
    </button>
  ),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    search,
    children,
    className,
  }: {
    to: string;
    search?: Record<string, string>;
    children?: ReactNode;
    className?: string;
  }) => (
    <a href={search ? `${to}?${new URLSearchParams(search)}` : to} className={className}>
      {children}
    </a>
  ),
}));

import { PracticeChat } from "./PracticeChat";

const RETURN_TO = "/course/critical-thinking/lesson/3?part=explain";
const access = {
  subscribed: false,
  usedThisWeek: 1,
  freeAllowance: 3,
  remaining: 2,
  canPractice: true,
};
const reply = (text: string) => ({
  ok: true,
  sessionId: "8f1d6c1e-5d0a-4a4b-9a55-0f5f2b6c0c11",
  reply: text,
  done: false,
  verdict: null,
  remembered: null,
  connectionMade: false,
  access,
});

function mount(signedIn = true) {
  const onDone = vi.fn();
  render(
    <PracticeChat
      slug="critical-thinking"
      lessonIndex={3}
      topic="Critical thinking"
      lessonTitle="A lesson"
      lessonText="The idea."
      earlierLessons={[]}
      signedIn={signedIn}
      returnTo={RETURN_TO}
      onDone={onDone}
    />,
  );
  return onDone;
}

beforeEach(() => {
  window.localStorage.clear();
  recordAiConsent();
  mocks.turn.mockReset();
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("PracticeChat for a signed-out learner", () => {
  it("makes finishing the lesson the main action and sign-in a link back to this lesson", () => {
    const onDone = mount(false);
    fireEvent.click(screen.getByRole("button", { name: "Finish the lesson" }));
    expect(onDone).toHaveBeenCalledWith(null);

    const signIn = screen.getByRole("link", { name: /Sign in to explain it back/ });
    const href = new URL(signIn.getAttribute("href")!, "https://lamppost.example");
    expect(href.pathname).toBe("/auth");
    expect(href.searchParams.get("redirect")).toBe(RETURN_TO);
    expect(mocks.turn).not.toHaveBeenCalled();
  });
});

describe("PracticeChat before the learner has agreed to AI", () => {
  beforeEach(() => window.localStorage.clear());

  it("asks first, and Not now sends nothing", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Explain it back/ }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(mocks.turn).not.toHaveBeenCalled();
  });

  it("starts the chat once they continue", async () => {
    mocks.turn.mockResolvedValue(reply("Tell me the idea in your words."));
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Explain it back/ }));
    await screen.findByRole("dialog");
    expect(mocks.turn).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Continue" })));
    expect(mocks.turn).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("log").textContent).toContain("Tell me the idea in your words.");
  });
});

describe("PracticeChat's tutor", () => {
  it("speaks as the guide, never as the learner's companion", async () => {
    mocks.turn.mockResolvedValue(reply("Tell me the idea in your words."));
    mount();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Explain it back/ })));
    const page = document.body.textContent ?? "";
    for (const preset of COMPANION_PRESETS) expect(page).not.toContain(preset.name);
    expect(screen.getAllByText(/guide/i).length).toBeGreaterThan(0);
  });

  it("puts the guide's replies in a live log so a screen reader hears them", async () => {
    mocks.turn.mockResolvedValue(reply("Tell me the idea in your words."));
    mount();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Explain it back/ })));
    expect(screen.getByRole("log").textContent).toContain("Tell me the idea in your words.");
  });

  it("sends a reply once when Retry follows a failure", async () => {
    mocks.turn
      .mockResolvedValueOnce(reply("Tell me the idea in your words."))
      .mockResolvedValueOnce({ ok: false, reason: "The guide couldn't answer just now." })
      .mockResolvedValueOnce(reply("Good. Now connect it."));
    mount();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Explain it back/ })));

    fireEvent.change(screen.getByLabelText("Your explanation"), {
      target: { value: "A claim needs a reason." },
    });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Send/ })));
    expect(screen.getByRole("alert").textContent).toMatch(/couldn't answer/);
    expect(screen.getAllByText("A claim needs a reason.")).toHaveLength(1);

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Retry/ })));
    await waitFor(() => expect(screen.getByText("Good. Now connect it.")).toBeTruthy());

    const retried = mocks.turn.mock.calls[2]![0].data;
    expect(retried.answer).toBe("A claim needs a reason.");
    expect(retried.sessionId).toBe(reply("").sessionId);
    expect(screen.getAllByText("A claim needs a reason.")).toHaveLength(1);
  });

  it("sends only which lesson it is and what the learner wrote", async () => {
    mocks.turn
      .mockResolvedValueOnce(reply("Tell me the idea in your words."))
      .mockResolvedValueOnce(reply("Good. Now connect it."));
    mount();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Explain it back/ })));
    fireEvent.change(screen.getByLabelText("Your explanation"), {
      target: { value: "A claim needs a reason." },
    });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Send/ })));

    const lesson = { slug: "critical-thinking", lessonIndex: 3, lessonTitle: "A lesson" };
    expect(mocks.turn.mock.calls[0]![0].data).toEqual({
      context: lesson,
      answer: "",
      sessionId: null,
    });
    // The server reads the conversation from its own record and builds the lesson's context
    // itself, so neither the transcript, the lesson text nor a companion name is sent.
    expect(mocks.turn.mock.calls[1]![0].data).toEqual({
      context: lesson,
      answer: "A claim needs a reason.",
      sessionId: reply("").sessionId,
    });
  });

  it("lets the learner report what the guide said, from inside the chat", async () => {
    mocks.turn
      .mockResolvedValueOnce(reply("Tell me the idea in your words."))
      .mockResolvedValueOnce(reply("Good. Now connect it."));
    mount();
    expect(screen.queryByRole("button", { name: /report this content/i })).toBeNull();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Explain it back/ })));
    fireEvent.change(screen.getByLabelText("Your explanation"), {
      target: { value: "A claim needs a reason." },
    });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Send/ })));

    const report = screen.getByRole("button", { name: /report this content/i });
    expect(report.dataset["topic"]).toBe("Tutor chat");
    expect(report.dataset["excerpt"]).toContain("Tell me the idea in your words.");
    expect(report.dataset["excerpt"]).toContain("Good. Now connect it.");
    // Only the AI's side goes in the report, not what the learner wrote.
    expect(report.dataset["excerpt"]).not.toContain("A claim needs a reason.");
  });

  it("says plainly when this week's sessions come back, and sells nothing", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-21T15:00:00Z"));
    mocks.turn.mockResolvedValue({
      ok: false,
      upgrade: true,
      reason: "You've used this week's free practice sessions.",
    });
    mount();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Explain it back/ })));

    const page = document.body.textContent ?? "";
    // The allowance restarts at Monday 00:00 UTC: Sunday evening in New York.
    expect(page).toContain("They start again Sunday at 8:00 PM");
    expect(page).not.toMatch(/premium|unlock|unlimited|subscribe|on sale|plan/i);
    expect(document.querySelector('a[href*="premium"]')).toBeNull();
  });
});
