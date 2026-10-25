// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnswerFeedbackHost, celebrateAnswer } from "@/components/AnswerFeedback";
import { rewardsHeld } from "@/lib/reward-hold";
import type { LessonStep } from "@/lib/steps/types";
import { choiceSample } from "@/test/steps";
import { LessonPlayer } from "./LessonPlayer";

afterEach(cleanup);

const steps: LessonStep[] = [{ id: "a", kind: "note", prompt: "First card." }];
const twoSteps: LessonStep[] = [
  { id: "a", kind: "note", prompt: "First card." },
  { id: "b", kind: "note", prompt: "Second card." },
];

const banner = () => screen.queryByTestId("answer-banner");

describe("LessonPlayer", () => {
  it("pins Continue above the home indicator with the shared sticky-action", () => {
    render(<LessonPlayer steps={steps} onStepResolved={vi.fn()} onComplete={vi.fn()} />);
    const bar = screen.getByRole("button", { name: /continue/i }).parentElement!;
    expect(bar.classList.contains("sticky-action")).toBe(true);
    expect(bar.className).not.toMatch(/\bbottom-\d/);
  });

  it("keeps Continue the last thing on the screen, with anything else above it", () => {
    render(
      <LessonPlayer
        steps={steps}
        aboveAction={<p>Report this content</p>}
        onStepResolved={vi.fn()}
        onComplete={vi.fn()}
      />,
    );
    const bar = screen.getByRole("button", { name: /continue/i }).parentElement!;
    expect(bar.nextElementSibling).toBeNull();
    expect(bar.previousElementSibling?.textContent).toBe("Report this content");
  });

  it("moves the keyboard to Continue when answering leaves focus on a control that just closed", () => {
    render(<LessonPlayer steps={[choiceSample]} onStepResolved={vi.fn()} onComplete={vi.fn()} />);
    const answer = screen.getByRole("button", { name: /^The pool should open later/ });
    answer.focus();
    fireEvent.click(answer);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /continue/i }));
  });

  it("leaves focus alone when it is still on something the learner can use", () => {
    render(<LessonPlayer steps={[choiceSample]} onStepResolved={vi.fn()} onComplete={vi.fn()} />);
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    elsewhere.focus();
    fireEvent.click(screen.getByRole("button", { name: /^The pool should open later/ }));
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });

  it("takes a step's verdict down when the learner moves on, so it never sits over the next one", () => {
    render(<AnswerFeedbackHost />);
    render(<LessonPlayer steps={twoSteps} onStepResolved={vi.fn()} onComplete={vi.fn()} />);
    act(() => celebrateAnswer({ correct: true, xp: 25, combo: 5, bonus: 15 }));
    expect(banner()).not.toBeNull();
    expect(rewardsHeld()).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText("Second card.")).toBeTruthy();
    expect(banner()).toBeNull();
    expect(rewardsHeld()).toBe(false);
  });

  it("takes the last step's verdict down when the steps are over", () => {
    render(<AnswerFeedbackHost />);
    const player = render(
      <LessonPlayer steps={steps} onStepResolved={vi.fn()} onComplete={vi.fn()} />,
    );
    act(() => celebrateAnswer({ correct: true, xp: 25 }));
    expect(banner()).not.toBeNull();

    player.unmount();
    expect(banner()).toBeNull();
    expect(rewardsHeld()).toBe(false);
  });
});
