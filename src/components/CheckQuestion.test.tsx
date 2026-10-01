// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UNIT_CHECKS } from "@/content/unit-checks";
import { CheckQuestion } from "./CheckQuestion";

afterEach(cleanup);

const item = UNIT_CHECKS["claims"]!.before[0]!; // the speed bump post; the claim is option 1
const mount = () => {
  const onAnswered = vi.fn();
  render(<CheckQuestion item={item} number={1} total={3} onAnswered={onAnswered} />);
  return onAnswered;
};

describe("CheckQuestion", () => {
  it("asks the question with its scenario, as a heading", () => {
    mount();
    expect(screen.getByRole("heading", { name: item.prompt })).toBeTruthy();
    expect(screen.getByText(/Our street needs a speed bump/)).toBeTruthy();
    expect(screen.getByText("Question 1 of 3")).toBeTruthy();
  });

  it("counts only the first answer, and locks the rest", () => {
    const onAnswered = mount();
    fireEvent.click(screen.getByRole("button", { name: /Drivers use the street/ }));
    expect(onAnswered).toHaveBeenCalledWith(false);
    const buttons = screen.getAllByRole("button");
    expect(buttons.every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /needs a speed bump/ }));
    expect(onAnswered).toHaveBeenCalledTimes(1);
  });

  it("marks a miss in words, shows the right answer, and says why", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Two cats/ }));
    const status = screen.getByRole("status").textContent ?? "";
    expect(status).toContain("Not this one");
    expect(status).toContain("evidence offered for the main point");
    expect(status).toContain(item.why);
    expect(screen.getByRole("button", { name: /needs a speed bump.*Correct/ })).toBeTruthy();
  });

  it("says so when the first answer is right", () => {
    const onAnswered = mount();
    fireEvent.click(screen.getByRole("button", { name: /needs a speed bump/ }));
    expect(onAnswered).toHaveBeenCalledWith(true);
    expect(screen.getByRole("status").textContent).toContain("Right");
  });
});
