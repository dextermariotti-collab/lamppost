// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeagueMember, LeagueView } from "@/lib/league.functions";

const h = vi.hoisted(() => ({ userId: null as string | null, getLeague: vi.fn() }));

vi.mock("@/lib/companion-store", () => ({
  useSessionUser: () => ({ userId: h.userId, ready: true }),
}));
vi.mock("@/lib/league.functions", () => ({ getLeague: h.getLeague }));
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

import { Route } from "./league";

const Screen = Route.options.component as () => ReactNode;
const companion = { preset: "fox", palette: "sunset", accessory: "none", expression: "happy" };
const member = (
  id: string,
  weeklyXp: number,
  rank: number | null,
  extra: Partial<LeagueMember> = {},
): LeagueMember => ({
  id,
  displayName: id === "me" ? "Dex" : `Friend ${id}`,
  handle: id,
  companion,
  tier: 1,
  weeklyXp,
  rank,
  isMe: id === "me",
  ...extra,
});
const view = (members: LeagueMember[], extra: Partial<LeagueView> = {}): LeagueView => ({
  ok: true,
  weekStart: "2026-09-28",
  minXp: 50,
  myTier: 1,
  members,
  taking: members.filter((m) => m.rank !== null).length,
  lastWeek: null,
  ...extra,
});

const mount = async () => {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Screen />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  h.userId = "me";
  h.getLeague.mockReset();
});
afterEach(cleanup);

describe("Friends league screen", () => {
  it("asks a guest to sign in, and doesn't call the server", async () => {
    h.userId = null;
    await mount();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/auth");
    expect(h.getLeague).not.toHaveBeenCalled();
  });

  it("ranks the people taking part and lists the rest as not yet compared", async () => {
    h.getLeague.mockResolvedValue(
      view([member("a", 300, 1), member("me", 120, 2), member("b", 10, null)]),
    );
    await mount();
    const standings = (await screen.findByRole("heading", { name: "Standings" }))
      .nextElementSibling as HTMLElement;
    const rows = within(standings).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/1.*Friend a.*Silver.*300 XP/),
      expect.stringMatching(/2.*Dex · you.*Silver.*120 XP/),
    ]);
    const resting = screen.getByRole("heading", { name: "Not yet compared" }).nextElementSibling!
      .nextElementSibling as HTMLElement;
    expect(resting.textContent).toMatch(/Friend b.*10 XP/);
    expect(screen.getByText(/you're in silver/i)).toBeTruthy();
  });

  it("tells a learner with no friends to add some, without a table of one", async () => {
    h.getLeague.mockResolvedValue(view([member("me", 0, null)]));
    await mount();
    expect(await screen.findByText(/add a friend to start/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /friends and sharing/i }).getAttribute("href")).toBe(
      "/friends",
    );
    expect(screen.queryByRole("heading", { name: "Standings" })).toBeNull();
  });

  it("says plainly what last week did and why", async () => {
    h.getLeague.mockResolvedValue(
      view([member("a", 300, 1), member("me", 120, 2), member("b", 60, 3)], {
        lastWeek: {
          weekStart: "2026-09-21",
          rank: 1,
          taking: 3,
          weeklyXp: 410,
          tierBefore: 1,
          tierAfter: 2,
          change: "promoted",
          reason: "You finished in the top third.",
        },
      }),
    );
    await mount();
    const last = await screen.findByRole("region", { name: "Last week" });
    expect(last.textContent).toMatch(/moved you up to Gold/);
    expect(last.textContent).toMatch(/top third/);
    expect(last.textContent).toMatch(/410 XP/);
  });

  it("names a quiet week without blame", async () => {
    h.getLeague.mockResolvedValue(
      view([member("a", 300, 1), member("me", 0, null)], {
        lastWeek: {
          weekStart: "2026-09-21",
          rank: null,
          taking: 2,
          weeklyXp: 0,
          tierBefore: 1,
          tierAfter: 1,
          change: "stayed",
          reason: "A quiet week. Nothing changes, and nothing is lost.",
        },
      }),
    );
    await mount();
    const last = await screen.findByRole("region", { name: "Last week" });
    expect(last.textContent).toMatch(/stayed in Silver/);
    expect(last.textContent).toMatch(/nothing is lost/i);
  });

  it("explains a rate limit with when to come back, and offers no retry", async () => {
    h.getLeague.mockResolvedValue({
      ok: false,
      reason: "You've looked at the league a lot just now.",
      limited: true,
      retryAfterSeconds: 120,
    });
    await mount();
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /looked at the league a lot.*2 minutes/i,
    );
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("offers a retry when the league can't load", async () => {
    h.getLeague.mockResolvedValue({ ok: false, reason: "The league couldn't load just now." });
    await mount();
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn't load/i);
    expect(screen.getByRole("button", { name: /try again/i }).className).toMatch(/\bh-11\b/);
  });

  it("says who can see what, and that tiers earn nothing", async () => {
    h.getLeague.mockResolvedValue(view([member("me", 0, null)]));
    await mount();
    expect(await screen.findByText(/only people you have added/i)).toBeTruthy();
    expect(screen.getByText(/only in a friend.s league if you both share/i)).toBeTruthy();
    expect(screen.getByText(/earn nothing and unlock nothing/i)).toBeTruthy();
    expect(screen.getByText(/nobody drops a tier for being away/i)).toBeTruthy();
  });
});
