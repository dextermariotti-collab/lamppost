// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PartsStatus, PendingPart } from "./LessonParts";

afterEach(cleanup);

describe("PendingPart", () => {
  it("shows a skeleton and says what is being written while it is on its way", () => {
    render(
      <PendingPart what="this drill" failed={false} notice={null} onRetry={() => undefined} />,
    );
    expect(screen.getByRole("status").textContent).toMatch(/writing this drill/i);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says why, keeps their progress, and offers a 44px try-again when it gave up", () => {
    const onRetry = vi.fn();
    render(
      <PendingPart
        what="this drill"
        failed
        notice="Lesson preparation is getting a lot of use. Try again in about 5 minutes."
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole("alert").textContent).toMatch(/about 5 minutes/i);
    expect(screen.getByRole("alert").textContent).toMatch(/progress so far is kept/i);
    const button = screen.getByRole("button", { name: /try again/i });
    expect(button.className).toMatch(/\bh-11\b/);
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("falls back to a plain message when there is no notice", () => {
    render(<PendingPart what="this drill" failed notice={null} onRetry={() => undefined} />);
    expect(screen.getByRole("alert").textContent).toMatch(/longer than usual/i);
  });
});

describe("PartsStatus", () => {
  it("counts the drills that are ready", () => {
    render(
      <PartsStatus ready={2} total={4} complete={false} problem={null} onRetry={() => undefined} />,
    );
    expect(screen.getByRole("status").textContent).toMatch(/2 of 4/);
  });

  it("says nothing once everything is ready", () => {
    const { container } = render(
      <PartsStatus ready={4} total={4} complete={false} problem={null} onRetry={() => undefined} />,
    );
    expect(container.textContent).toBe("");
    cleanup();
    const done = render(
      <PartsStatus ready={4} total={4} complete problem="stale" onRetry={() => undefined} />,
    );
    expect(done.container.textContent).toBe("");
  });

  it("shows a problem with a way to retry instead of a count", () => {
    const onRetry = vi.fn();
    render(
      <PartsStatus
        ready={1}
        total={4}
        complete={false}
        problem="Come back in about 10 minutes."
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(/10 minutes/);
    expect(screen.getByRole("status").textContent).not.toMatch(/of 4/);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
