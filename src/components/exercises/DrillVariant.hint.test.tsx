// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDrillVariant: vi.fn(),
  struggling: false,
  finish: null as null | ((given: unknown, score: number) => void),
}));
vi.mock("@/lib/drills.functions", () => ({ getDrillVariant: mocks.getDrillVariant }));
vi.mock("@/lib/rating", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rating")>()),
  needsHelp: () => mocks.struggling,
}));
vi.mock("./ExerciseRunner", () => ({
  ExerciseRunner: ({ onAnswer }: { onAnswer: (given: unknown, score: number) => void }) => {
    mocks.finish = onAnswer;
    return <p>the drill</p>;
  },
}));

import { DrillVariant } from "./DrillVariant";

const drill = {
  ok: true as const,
  variant: 4,
  kind: "flaw" as const,
  difficulty: 2,
  exercise: { kind: "flaw" },
};

const mount = (onAnswer = vi.fn()) => {
  render(
    <DrillVariant
      lessonId="claims-the-actual-claim"
      kind="flaw"
      seen={[]}
      index={0}
      total={4}
      onAnswer={onAnswer}
    />,
  );
  return onAnswer;
};
const settle = () => act(async () => vi.advanceTimersByTimeAsync(0));
const answer = (score: number) => act(async () => mocks.finish?.("choice", score));

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  mocks.struggling = false;
  mocks.getDrillVariant.mockResolvedValue(drill);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("DrillVariant hints", () => {
  it("offers no hint while the skill is going fine, and never a hint token", async () => {
    mount();
    await settle();
    expect(screen.queryByRole("button", { name: /nudge/i })).toBeNull();
    expect(screen.queryByText(/hint token/i)).toBeNull();
  });

  it("offers a nudge when the skill keeps catching the learner out, at a 44px target", async () => {
    mocks.struggling = true;
    mount();
    await settle();
    const button = screen.getByRole("button", { name: /give me a nudge \(half xp\)/i });
    expect(button.className).toMatch(/\bh-11\b/);
  });

  it("shows the guiding question and halves what the drill pays, not whether it was right", async () => {
    mocks.struggling = true;
    const onAnswer = mount();
    await settle();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /nudge/i })));
    expect(screen.getByText(/guiding question/i)).toBeTruthy();
    expect(screen.getByText(/half xp/i)).toBeTruthy();

    await answer(1);
    expect(onAnswer).toHaveBeenCalledWith(1, 4, "choice", drill.exercise, 2, 0.5);
  });

  it("pays in full without the nudge", async () => {
    mocks.struggling = true;
    const onAnswer = mount();
    await settle();
    await answer(1);
    expect(onAnswer).toHaveBeenCalledWith(1, 4, "choice", drill.exercise, 2, 1);
  });
});
