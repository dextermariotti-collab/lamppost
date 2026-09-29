// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDrillVariant: vi.fn(),
  spendHint: vi.fn(),
  tokens: 2,
  finish: null as null | ((given: unknown, score: number) => void),
}));
vi.mock("@/lib/drills.functions", () => ({ getDrillVariant: mocks.getDrillVariant }));
vi.mock("@/lib/progress", () => ({
  useProgress: () => ({
    state: { hintTokens: mocks.tokens },
    hydrated: true,
    spendHint: mocks.spendHint,
  }),
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
  mocks.tokens = 2;
  mocks.getDrillVariant.mockResolvedValue(drill);
  mocks.spendHint.mockResolvedValue(true);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("DrillVariant hint tokens", () => {
  it("offers a token only to a learner who holds one, at a 44px target", async () => {
    mount();
    await settle();
    const button = screen.getByRole("button", { name: /use a hint token.*2 left/i });
    expect(button.className).toMatch(/\bh-11\b/);
    cleanup();

    mocks.tokens = 0;
    mount();
    await settle();
    expect(screen.queryByRole("button", { name: /hint token/i })).toBeNull();
  });

  it("spends one token, shows the hint, and keeps full XP", async () => {
    const onAnswer = mount();
    await settle();
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /use a hint token/i })),
    );
    expect(mocks.spendHint).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/keeps full xp/i)).toBeTruthy();
    expect(screen.getByText(/guiding question/i)).toBeTruthy();

    await answer(1);
    expect(onAnswer).toHaveBeenCalledWith(1, 4, "choice", drill.exercise, 2);
  });

  it("shows no hint and charges no XP when the token could not be spent", async () => {
    mocks.spendHint.mockResolvedValue(false);
    const onAnswer = mount();
    await settle();
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /use a hint token/i })),
    );
    expect(screen.queryByText(/guiding question/i)).toBeNull();

    await answer(1);
    expect(onAnswer).toHaveBeenCalledWith(1, 4, "choice", drill.exercise, 2);
  });
});
