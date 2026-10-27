// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDrillVariant: vi.fn() }));
vi.mock("@/lib/drills.functions", () => ({ getDrillVariant: mocks.getDrillVariant }));
vi.mock("./ExerciseRunner", () => ({ ExerciseRunner: () => <p>the drill</p> }));

import { DrillVariant } from "./DrillVariant";

const drill = {
  ok: true as const,
  variant: 4,
  kind: "flaw" as const,
  difficulty: 2,
  exercise: { kind: "flaw" },
};

const mount = () =>
  render(
    <DrillVariant
      lessonId="claims-the-actual-claim"
      kind="flaw"
      seen={[]}
      index={0}
      total={4}
      onAnswer={() => undefined}
    />,
  );

/** Lets the mocked server call settle and any retry timers it schedules run. */
const settle = () => act(async () => vi.advanceTimersByTimeAsync(0));

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("DrillVariant when the server can't give a drill", () => {
  it("shows the wait, stops asking, and offers a button when a limit was reached", async () => {
    mocks.getDrillVariant.mockResolvedValue({
      ok: false,
      reason: "That's a lot of new drills for now. Try again in about 10 minutes.",
      limited: true,
      retryAfterSeconds: 600,
    });
    mount();
    await settle();
    expect(screen.getByRole("status").textContent).toMatch(/try again in about 10 minutes/i);
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(mocks.getDrillVariant).toHaveBeenCalledTimes(1);

    mocks.getDrillVariant.mockResolvedValue(drill);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await settle();
    expect(mocks.getDrillVariant).toHaveBeenCalledTimes(2);
    expect(screen.getByText("the drill")).toBeTruthy();
  });

  it("keeps quietly retrying an ordinary failure, then gives up politely", async () => {
    mocks.getDrillVariant.mockResolvedValue({ ok: false, reason: "still being prepared" });
    mount();
    await settle();
    expect(screen.queryByRole("status")).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(120_000));
    expect(screen.getByRole("status").textContent).toMatch(/taking longer than usual/i);
    const calls = mocks.getDrillVariant.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(120_000));
    expect(mocks.getDrillVariant.mock.calls.length).toBe(calls);
  });

  it("recovers on its own from a blip without ever showing a message", async () => {
    mocks.getDrillVariant
      .mockResolvedValueOnce({ ok: false, reason: "still being prepared" })
      .mockResolvedValue(drill);
    mount();
    await settle();
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByText("the drill")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
