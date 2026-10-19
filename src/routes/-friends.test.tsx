// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FriendRow, FriendsSnapshot } from "@/lib/friends.functions";

const h = vi.hoisted(() => ({
  friends: null as unknown,
  friendsError: false,
  refetch: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/account", () => ({
  useAccount: () => ({ signedIn: true, sessionReady: true }),
  useFriends: () => ({
    data: h.friends,
    isLoading: false,
    isError: h.friendsError,
    refetch: h.refetch,
  }),
  useIncomingNudges: () => ({ data: [] }),
  useRefreshAccount: () => h.refresh,
}));
vi.mock("@/lib/debate.functions", () => ({ listDebates: async () => [] }));
vi.mock("@/lib/friends.functions", () => ({
  proposeSharedStreak: vi.fn(),
  removeFriend: vi.fn(),
  respondToRequest: vi.fn(),
  respondToSharedStreak: vi.fn(),
  markNudgesRead: vi.fn(),
  searchPeople: vi.fn(),
  sendFriendRequest: vi.fn(),
  sendNudge: vi.fn(),
}));
vi.mock("@/lib/safety.functions", () => ({
  blockUser: vi.fn(),
  reportUser: vi.fn(),
  setProfileVisibility: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
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
  useNavigate: () => vi.fn(),
}));

import { Route } from "./friends.index";

const Screen = Route.options.component as () => ReactNode;
const companion = { preset: "fox", palette: "sunset", accessory: "none", expression: "happy" };
const friend = (handle: string, shares: boolean): FriendRow => ({
  id: handle,
  displayName: handle.toUpperCase(),
  handle,
  currentStreak: shares ? 12 : null,
  ...(shares ? { totalXp: 3456 } : {}),
  sharesProgress: shares,
  companion,
  friendshipId: `f-${handle}`,
  sharedStreak: null,
  activeToday: false,
  nudgedToday: false,
});
const snapshot = (extra: Partial<FriendsSnapshot> = {}): FriendsSnapshot => ({
  friends: [friend("open", true), friend("closed", false)],
  incoming: [
    {
      id: "stranger",
      displayName: "Stranger",
      handle: "stranger",
      currentStreak: null,
      sharesProgress: false,
      companion,
      friendshipId: "f-in",
    },
  ],
  outgoing: [],
  inviteCode: "abc",
  myVisibility: "minimal",
  activeSharedStreaks: 0,
  bestSharedStreak: 0,
  ...extra,
});

const mount = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Screen />
    </QueryClientProvider>,
  );

beforeEach(() => {
  h.friends = snapshot();
  h.friendsError = false;
  h.refetch.mockReset();
});
afterEach(cleanup);

describe("Friends screen", () => {
  it("shows streak and XP only for a friend who shares, and says so for one who doesn't", () => {
    mount();
    const rows = screen.getAllByRole("listitem");
    const open = rows.find((r) => /OPEN/.test(r.textContent ?? ""))!;
    const closed = rows.find((r) => /CLOSED/.test(r.textContent ?? ""))!;
    expect(open.textContent).toMatch(/12/);
    expect(open.textContent).toMatch(/3,456/);
    expect(closed.textContent).toMatch(/Progress is private/);
    expect(closed.textContent).not.toMatch(/3,456|12/);
  });

  it("offers a sharing switch that starts off, with plain words about what it does", () => {
    mount();
    const region = screen.getByRole("region", { name: "What friends can see" });
    const toggle = within(region).getByRole("switch", { name: "Share my progress with friends" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(within(region).getByText(/only your name and avatar/i)).toBeTruthy();
  });

  it("lets a request from a stranger be accepted, declined or blocked, each as a full-size target", () => {
    mount();
    const accept = screen.getByRole("button", { name: "Accept request" });
    const decline = screen.getByRole("button", { name: "Decline request" });
    const block = screen.getByRole("button", { name: /block stranger/i });
    for (const button of [accept, decline, block]) expect(button.className).toMatch(/h-11 w-11/);
  });

  it("only asks the QR service to draw the invite link after being asked to", () => {
    mount();
    expect(document.querySelector("img[src*='qrserver']")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show QR code" }));
    expect(document.querySelector("img[src*='qrserver']")).not.toBeNull();
    expect(screen.getByText(/third-party QR service/i)).toBeTruthy();
  });

  it("says the list couldn't load, with a retry, instead of claiming there are no friends", () => {
    h.friends = undefined;
    h.friendsError = true;
    mount();
    expect(screen.getByRole("alert").textContent).toMatch(/couldn.t load/i);
    expect(screen.queryByText(/add friends to keep/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(h.refetch).toHaveBeenCalled();
  });

  it("gives every button a 44px target", () => {
    h.friends = snapshot({
      friends: [
        friend("open", true),
        {
          ...friend("streaky", true),
          sharedStreak: {
            id: "s1",
            status: "active",
            count: 3,
            proposedByMe: false,
            extendedToday: false,
          },
        },
      ],
      outgoing: [
        {
          id: "waiting",
          displayName: "Waiting",
          handle: "waiting",
          currentStreak: null,
          sharesProgress: false,
          companion,
          friendshipId: "f-out",
        },
      ],
    });
    mount();
    for (const button of screen.getAllByRole("button")) {
      expect(button.className, button.textContent ?? "").toMatch(/\b(min-h-11|h-11)\b/);
    }
  });

  it("doesn't show anything about a searched stranger beyond name and handle", () => {
    mount();
    expect(screen.queryByText(/day streak/i)).toBeNull();
  });
});
