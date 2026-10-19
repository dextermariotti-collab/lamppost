// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  signedIn: false,
  accountError: false,
  refetchAccount: vi.fn(),
  refetchFriends: vi.fn(),
}));

vi.mock("@/lib/progress", async () => {
  const { DEFAULT_STATE } = await import("@/lib/progress-core");
  // One object, as the real store gives: a fresh one each render would recount badges forever.
  const progress = {
    state: { ...DEFAULT_STATE, xp: 1200, streak: 9, longestStreak: 9, dailyGoal: 2 },
    streak: 9,
    doneLessons: new Set([0, 1, 2, 3]),
  };
  return { useProgress: () => progress };
});
vi.mock("@/lib/companion-store", () => ({
  useCompanion: () => ({
    companion: { preset: "fox", palette: "sunset", accessory: "none", expression: "happy" },
    signedIn: h.signedIn,
  }),
}));
vi.mock("@/lib/account", () => ({
  displayNameFor: () => "Learner",
  useAccount: () => ({
    data: undefined,
    isError: h.accountError,
    refetch: h.refetchAccount,
  }),
  useFriends: () => ({ data: undefined, isError: false, refetch: h.refetchFriends }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signOut: vi.fn() } } }));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

import { BADGES } from "@/lib/badges";
import { Route } from "./profile";

const Screen = Route.options.component as () => ReactNode;

beforeEach(() => {
  window.localStorage.clear();
  h.signedIn = false;
  h.accountError = false;
  h.refetchAccount.mockReset();
  h.refetchFriends.mockReset();
});
afterEach(cleanup);

describe("Profile", () => {
  it("shows the same achievements as Progress, signed out too", async () => {
    render(<Screen />);
    // A 9-day streak earns Iron Streak's bronze (7 days) in the local catalog.
    expect(await screen.findByText(`1 of ${BADGES.length} earned.`)).toBeTruthy();
    for (const badge of BADGES)
      expect(screen.getByRole("button", { name: new RegExp(badge.name) }));
    expect(screen.getByRole("button", { name: /Iron Streak, Bronze/ })).toBeTruthy();
    expect(screen.queryByText(/badges you earn will appear here/i)).toBeNull();
    expect(document.querySelector(".animate-pulse")).toBeNull();
  });

  it("opens an achievement with its real requirement and progress", async () => {
    render(<Screen />);
    fireEvent.click(await screen.findByRole("button", { name: /Iron Streak/ }));
    const sheet = await screen.findByRole("dialog");
    expect(sheet.textContent).toMatch(/Your longest run of daily practice/);
    expect(sheet.textContent).toMatch(/9 \/ 30 days/);
    expect(within(sheet).getByRole("button", { name: "Share" })).toBeTruthy();
  });

  it("counts finished lessons where it used to show a second kind of league", () => {
    render(<Screen />);
    expect(screen.getByText("Lessons").previousElementSibling?.textContent).toBe("4");
    expect(screen.queryByText("League")).toBeNull();
    expect(screen.queryByText(/novice|proficient|mastered/i)).toBeNull();
  });

  it("has one row for settings", () => {
    render(<Screen />);
    const rows = [...document.querySelectorAll("ul a[href='/settings']")];
    expect(rows).toHaveLength(1);
  });

  it("says when the account couldn't load, with a retry", () => {
    h.signedIn = true;
    h.accountError = true;
    render(<Screen />);
    expect(screen.getByRole("alert").textContent).toMatch(/couldn.t load/i);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(h.refetchAccount).toHaveBeenCalled();
    expect(h.refetchFriends).toHaveBeenCalled();
  });
});
