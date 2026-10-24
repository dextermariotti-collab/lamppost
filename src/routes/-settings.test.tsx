// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ signedIn: false }));

vi.mock("@/lib/progress", async () => {
  const { DEFAULT_STATE } = await import("@/lib/progress-core");
  const progress = { state: { ...DEFAULT_STATE, dailyGoal: 2 }, setDailyGoal: () => undefined };
  return { useProgress: () => progress };
});
vi.mock("@/lib/account", () => ({
  displayNameFor: () => "Learner",
  useAccount: () => ({
    data: h.signedIn ? { handle: "reader-abcd2345", displayName: null } : undefined,
    isLoading: false,
    signedIn: h.signedIn,
    sessionReady: true,
  }),
  useRefreshAccount: () => () => undefined,
}));
vi.mock("@/lib/profile.functions", () => ({ updateMyProfile: vi.fn() }));
vi.mock("@/lib/theme", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {} } }));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ScreenHeader", () => ({ ScreenHeader: () => null }));
vi.mock("@/components/PrivacySafetySection", () => ({ PrivacySafetySection: () => null }));
vi.mock("@/components/YourDataSection", () => ({
  YourDataSection: () => null,
  DeviceDataSection: () => null,
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { AI_PROVIDER_NAME, hasAiConsent, recordAiConsent } from "@/lib/ai-consent";
import { Route } from "./settings";

const Screen = Route.options.component as () => ReactNode;
const aiGroup = () => within(screen.getByRole("region", { name: "AI service" }));

beforeEach(() => {
  window.localStorage.clear();
  h.signedIn = false;
});
afterEach(cleanup);

describe("Settings' daily goal", () => {
  it("says what the goal counts, and promises no badge the server counts differently", () => {
    render(<Screen />);
    const goal = screen.getByRole("group", { name: "Daily goal" }).parentElement!;
    expect(goal.textContent).toMatch(/Lessons a day/);
    expect(goal.textContent).toMatch(/Reviews and the daily case .* don't count toward it/);
    expect(goal.textContent).not.toMatch(/badge|perfect week/i);
  });
});

describe("Settings' AI agreement", () => {
  for (const signedIn of [false, true]) {
    it(`shows when this device agreed and to whom (${signedIn ? "signed in" : "signed out"})`, () => {
      h.signedIn = signedIn;
      recordAiConsent(new Date(2026, 9, 20, 14, 30));
      render(<Screen />);
      const row = aiGroup();
      expect(
        row.getByText(new RegExp(`agreed on Oct 20, 2026 to send it to ${AI_PROVIDER_NAME}`)),
      ).toBeTruthy();
      expect(row.getByRole("button", { name: "Withdraw AI agreement" })).toBeTruthy();
    });
  }

  it("withdraws it, so the next AI feature asks first", () => {
    recordAiConsent();
    render(<Screen />);
    act(() => fireEvent.click(aiGroup().getByRole("button", { name: /Withdraw/ })));
    expect(hasAiConsent()).toBe(false);
    expect(window.localStorage.getItem("lamppost-ai-consent-v1")).toBeNull();
    expect(aiGroup().getByRole("status").textContent).toBe("AI agreement withdrawn.");
    expect(aiGroup().getByText(/^Withdrawn\. Nothing more is sent/)).toBeTruthy();
    expect(aiGroup().queryByRole("button", { name: /Withdraw/ })).toBeNull();
  });

  it("says nothing has been agreed when it hasn't, with nothing to withdraw", () => {
    render(<Screen />);
    expect(aiGroup().getByText(/Not agreed on this device/)).toBeTruthy();
    expect(aiGroup().queryByRole("button", { name: /Withdraw/ })).toBeNull();
  });

  it("follows an agreement given on another screen", () => {
    render(<Screen />);
    act(() => recordAiConsent(new Date(2026, 9, 21, 9, 0)));
    expect(aiGroup().getByText(/agreed on Oct 21, 2026/)).toBeTruthy();
  });
});
