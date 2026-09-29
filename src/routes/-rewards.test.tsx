// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COMPANION } from "@/lib/companions";
import { stubProgress } from "@/test/progress";

const h = vi.hoisted(() => ({ progress: null as unknown, userId: null as string | null }));

vi.mock("@/lib/progress", async () => {
  const { FREEZE_COST, MAX_FREEZES } = await import("@/lib/progress-core");
  return { useProgress: () => h.progress, dayKey: () => "2026-09-29", FREEZE_COST, MAX_FREEZES };
});
vi.mock("@/lib/companion-store", () => ({
  useCompanion: () => ({ companion: DEFAULT_COMPANION }),
  useSessionUser: () => ({ userId: h.userId, ready: true }),
}));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ScreenHeader", () => ({ ScreenHeader: () => null }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { Route } from "./rewards";

const Screen = Route.options.component as () => ReactNode;
const show = (overrides: Parameters<typeof stubProgress>[0] = {}) => {
  const progress = stubProgress(overrides);
  h.progress = progress;
  render(<Screen />);
  return progress;
};

beforeEach(() => {
  h.userId = null;
});
afterEach(cleanup);

describe("Rewards screen", () => {
  it("shows the balance and says gems can't be bought and nothing counts down", () => {
    show({ gems: 1234 });
    expect(screen.getByTestId("gem-balance").textContent).toBe("1,234");
    expect(screen.getByText(/can't be bought with money/i)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(
      /limited time|hurry|expires|only \d+ left|last chance/i,
    );
  });

  it("says where gems live: on the device for a guest, on the account when signed in", () => {
    show();
    expect(screen.getByText(/sign in and they're kept on your account/i)).toBeTruthy();
    cleanup();
    h.userId = "u1";
    show();
    expect(screen.getByText(/they're kept on your account, so they follow you/i)).toBeTruthy();
    expect(screen.queryByText(/sign in and/i)).toBeNull();
  });

  describe("chests", () => {
    it("opens the chest that was earned and says what was inside", async () => {
      const progress = stubProgress({ history: { "2026-09-29": 2 } });
      progress.openChest.mockResolvedValue({
        ok: true,
        record: { day: "2026-09-29", source: "lesson", kind: "hint", amount: 1, converted: false },
      });
      h.progress = progress;
      render(<Screen />);
      await act(async () => fireEvent.click(screen.getByRole("button", { name: /2 waiting/i })));
      expect(progress.openChest).toHaveBeenCalledWith("lesson");
      expect(screen.getByRole("status").textContent).toBe("Inside: 1 hint token");
    });

    it("says why there is no chest when nothing was finished", () => {
      show();
      expect(screen.getByText(/no chest waiting/i)).toBeTruthy();
      expect(screen.queryByRole("button", { name: /open/i })).toBeNull();
    });

    it("stops at three a day", () => {
      show({ history: { "2026-09-29": 5 }, chests: { day: "2026-09-29", opened: 3 } });
      expect(screen.getByText(/all three for today/i)).toBeTruthy();
      expect(screen.getByText(/opened today: 3 of 3/i)).toBeTruthy();
      expect(screen.queryByRole("button", { name: /open/i })).toBeNull();
    });

    it("keeps the odds on the page and lists the history", () => {
      show({
        chestHistory: [
          { day: "2026-09-29", source: "lesson", kind: "gems", amount: 5, converted: true },
          { day: "2026-09-28", source: "review", kind: "gems", amount: 20, converted: false },
        ],
      });
      expect(screen.getByRole("table")).toBeTruthy();
      const history = screen.getByRole("heading", { name: "History" })
        .nextElementSibling as HTMLElement;
      const items = within(history).getAllByRole("listitem");
      expect(items).toHaveLength(2);
      expect(items[0]!.textContent).toMatch(/5 gems.*pouch was full/i);
      expect(items[1]!.textContent).toMatch(/20 gems/);
    });

    it("says so when there is no history yet", () => {
      show();
      expect(screen.getByText(/no chests opened yet/i)).toBeTruthy();
    });
  });

  describe("hint tokens", () => {
    it("sells one when the learner can afford it", async () => {
      const progress = stubProgress({ gems: 50, hintTokens: 1 });
      progress.buyHint.mockResolvedValue({ ok: true });
      h.progress = progress;
      render(<Screen />);
      expect(screen.getByText(/you hold 1 of 5/i)).toBeTruthy();
      await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: /hint token for 20 gems/i })),
      );
      expect(progress.buyHint).toHaveBeenCalledTimes(1);
    });

    it("says how many more gems are needed, and can't be pressed, when short", () => {
      show({ gems: 12 });
      const button = screen.getByRole("button", { name: /8 more gems for a hint token/i });
      expect((button as HTMLButtonElement).disabled).toBe(true);
    });

    it("offers no purchase when the pouch is full", () => {
      show({ gems: 500, hintTokens: 5 });
      expect(screen.queryByRole("button", { name: /hint token for/i })).toBeNull();
    });

    it("says why a purchase didn't go through", async () => {
      const progress = stubProgress({ gems: 50 });
      progress.buyHint.mockResolvedValue({
        ok: false,
        message: "You don't have enough gems for that yet.",
      });
      h.progress = progress;
      render(<Screen />);
      await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: /hint token for 20 gems/i })),
      );
      expect(screen.getByRole("alert").textContent).toBe(
        "You don't have enough gems for that yet.",
      );
    });
  });

  describe("cosmetics", () => {
    const card = (name: string) => screen.getByText(name).closest("li") as HTMLElement;

    it("unlocks one the learner can afford", async () => {
      const progress = stubProgress({ gems: 90 });
      progress.unlockCosmetic.mockResolvedValue({ ok: true });
      h.progress = progress;
      render(<Screen />);
      await act(async () =>
        fireEvent.click(within(card("Headphones")).getByRole("button", { name: /unlock for 80/i })),
      );
      expect(progress.unlockCosmetic).toHaveBeenCalledWith("headphones");
    });

    it("shows the price gap for one that is out of reach", () => {
      show({ gems: 90 });
      const button = within(card("Little crown")).getByRole("button");
      expect(button.textContent).toBe("110 more gems");
      expect((button as HTMLButtonElement).disabled).toBe(true);
    });

    it("links owned ones to the companion screen instead of selling them again", () => {
      show({ gems: 500, cosmetics: ["bow"] });
      const owned = within(card("Bow")).getByRole("link", { name: /yours/i });
      expect(owned.getAttribute("href")).toBe("/companion");
      expect(within(card("Bow")).queryByRole("button")).toBeNull();
    });

    it("has every purchase button at a 44px target", () => {
      show({ gems: 500 });
      for (const button of screen.getAllByRole("button")) {
        expect(button.className, button.textContent ?? "").toMatch(/\bh-11\b/);
      }
    });
  });
});
