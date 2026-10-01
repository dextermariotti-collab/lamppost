// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StreakFreezeCard } from "./StreakFreezeCard";

afterEach(cleanup);

describe("StreakFreezeCard", () => {
  it("says how many are held and what one does", () => {
    render(<StreakFreezeCard freezes={1} />);
    expect(screen.getByText(/1 held — a missed day won't reset your streak/)).toBeTruthy();
  });

  it("says plainly when none are held", () => {
    render(<StreakFreezeCard freezes={0} />);
    expect(screen.getByText(/None held right now/)).toBeTruthy();
  });

  it("explains how freezes are earned, and offers nothing to buy", () => {
    render(<StreakFreezeCard freezes={2} />);
    expect(screen.getByText(/one free every 7 days of streak, up to 2/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.body.textContent).not.toMatch(/gem/i);
  });
});
