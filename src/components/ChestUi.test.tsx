// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubProgress } from "@/test/progress";
import { CHEST_PRIZES } from "@/lib/rewards";

const h = vi.hoisted(() => ({ progress: null as unknown, day: "2026-09-29" }));

vi.mock("@/lib/progress", () => ({
  useProgress: () => h.progress,
  dayKey: () => h.day,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { ChestOdds } from "./ChestOdds";
import { ChestOffer } from "./ChestOffer";

const setProgress = (progress: ReturnType<typeof stubProgress>) => {
  h.progress = progress;
  return progress;
};

beforeEach(() => {
  h.day = "2026-09-29";
});
afterEach(cleanup);

describe("ChestOdds", () => {
  it("lists every prize with its chance, and the chances add up to 100", () => {
    render(<ChestOdds />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(CHEST_PRIZES.length);
    const shown = rows.map((row) =>
      Number(within(row).getAllByRole("cell")[0]!.textContent?.replace("%", "")),
    );
    expect(shown.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("says the odds don't change and chests can't be bought", () => {
    render(<ChestOdds />);
    expect(screen.getByText(/odds never change/i)).toBeTruthy();
    expect(screen.getByText(/can't be bought/i)).toBeTruthy();
  });
});

describe("ChestOffer", () => {
  const withOneChest = () =>
    setProgress(
      stubProgress({ history: { "2026-09-29": 1 }, chests: { day: "2026-09-29", opened: 0 } }),
    );

  it("shows nothing before the device has loaded, or when no chest is waiting", () => {
    setProgress(stubProgress({ history: { "2026-09-29": 1 } }, false));
    const { container, rerender } = render(<ChestOffer source="lesson" />);
    expect(container.textContent).toBe("");

    setProgress(stubProgress());
    rerender(<ChestOffer source="lesson" />);
    expect(container.textContent).toBe("");

    setProgress(
      stubProgress({ history: { "2026-09-29": 1 }, chests: { day: "2026-09-29", opened: 1 } }),
    );
    rerender(<ChestOffer source="lesson" />);
    expect(container.textContent).toBe("");
  });

  it("offers the chest, keeps the odds one tap away, and doesn't count down", () => {
    withOneChest();
    render(<ChestOffer source="review" />);
    expect(screen.getByRole("button", { name: /open the chest/i }).className).toMatch(/\bh-11\b/);
    expect(screen.getByText(/what can be inside/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /odds and chest history/i }).getAttribute("href")).toBe(
      "/rewards",
    );
    expect(document.body.textContent).not.toMatch(
      /expires|hurry|only \d+ left|last chance|ends in/i,
    );
  });

  it("opens with the source it was given and shows what was inside", async () => {
    const progress = withOneChest();
    progress.openChest.mockResolvedValue({
      ok: true,
      record: {
        day: "2026-09-29",
        source: "challenge",
        kind: "gems",
        amount: 10,
        converted: false,
      },
    });
    render(<ChestOffer source="challenge" />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /open the chest/i })));
    expect(progress.openChest).toHaveBeenCalledWith("challenge");
    expect(screen.getByRole("status").textContent).toBe("10 gems");
  });

  it("says so when a hint token was paid as gems because the pouch was full", async () => {
    const progress = withOneChest();
    progress.openChest.mockResolvedValue({
      ok: true,
      record: { day: "2026-09-29", source: "lesson", kind: "gems", amount: 5, converted: true },
    });
    render(<ChestOffer source="lesson" />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /open the chest/i })));
    expect(screen.getByRole("status").textContent).toMatch(/pouch was full/i);
  });

  it("can't be pressed twice while it is opening", async () => {
    const progress = withOneChest();
    let settle!: (value: unknown) => void;
    progress.openChest.mockReturnValue(new Promise((resolve) => (settle = resolve)));
    render(<ChestOffer source="lesson" />);
    const button = screen.getByRole("button", { name: /open the chest/i });
    fireEvent.click(button);
    expect(screen.getByRole("button").getAttribute("aria-busy")).toBe("true");
    fireEvent.click(screen.getByRole("button"));
    expect(progress.openChest).toHaveBeenCalledTimes(1);
    await act(async () =>
      settle({
        ok: true,
        record: { day: "2026-09-29", source: "lesson", kind: "gems", amount: 5, converted: false },
      }),
    );
  });

  it("tells the learner why a chest didn't open", async () => {
    const progress = withOneChest();
    progress.openChest.mockResolvedValue({
      ok: false,
      message: "There's no chest waiting right now.",
    });
    render(<ChestOffer source="lesson" />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /open the chest/i })));
    expect(screen.getByRole("alert").textContent).toBe("There's no chest waiting right now.");
  });
});
