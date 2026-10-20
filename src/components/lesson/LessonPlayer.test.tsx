// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LessonStep } from "@/lib/steps/types";
import { LessonPlayer } from "./LessonPlayer";

afterEach(cleanup);

const steps: LessonStep[] = [{ id: "a", kind: "note", prompt: "First card." }];

describe("LessonPlayer", () => {
  it("pins Continue above the home indicator with the shared sticky-action", () => {
    render(<LessonPlayer steps={steps} onStepResolved={vi.fn()} onComplete={vi.fn()} />);
    const bar = screen.getByRole("button", { name: /continue/i }).parentElement!;
    expect(bar.classList.contains("sticky-action")).toBe(true);
    expect(bar.className).not.toMatch(/\bbottom-\d/);
  });
});
