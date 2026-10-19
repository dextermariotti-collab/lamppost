// @vitest-environment jsdom
import { isRedirect } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  native: false,
  userId: null as string | null,
  access: vi.fn(),
}));

vi.mock("@/lib/platform", () => ({ isNativeApp: () => h.native }));
vi.mock("@/lib/companion-store", () => ({
  useSessionUser: () => ({ userId: h.userId, ready: true }),
}));
vi.mock("@/lib/practice.functions", () => ({ getPracticeAccess: h.access }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ScreenHeader", () => ({
  ScreenHeader: ({ title, description }: { title: string; description: string }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  ),
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { Route } from "./premium";

const Screen = Route.options.component as () => ReactNode;
const beforeLoad = Route.options.beforeLoad as () => void;

beforeEach(() => {
  h.native = false;
  h.userId = null;
  h.access.mockReset();
});
afterEach(cleanup);

describe("the /premium page", () => {
  it("doesn't exist in the phone apps: it sends them to Progress", () => {
    h.native = true;
    let thrown: unknown = null;
    try {
      beforeLoad();
    } catch (error) {
      thrown = error;
    }
    expect(isRedirect(thrown)).toBe(true);
    expect((thrown as { options: { to: string } }).options.to).toBe("/progress");
  });

  it("stays on the web", () => {
    expect(() => beforeLoad()).not.toThrow();
  });

  it("says plainly that nothing is for sale and the tutor is free within a weekly allowance", () => {
    render(<Screen />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/nothing for sale/i);
    expect(text).toMatch(/3 sessions a week/i);
    expect(text).not.toMatch(/companion|unlimited|subscribe|upgrade|price|\$/i);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/auth");
  });

  it("shows a signed-in learner what is left this week", async () => {
    h.userId = "me";
    h.access.mockResolvedValue({
      subscribed: false,
      usedThisWeek: 1,
      freeAllowance: 3,
      remaining: 2,
      canPractice: true,
    });
    render(<Screen />);
    expect(await screen.findByText("2 of 3 sessions left this week.")).toBeTruthy();
  });

  it("keeps to the Wayfinding signs: no glow, no rounded cards, no sparkle badge", () => {
    render(<Screen />);
    const classes = [...document.querySelectorAll("[class]")].map((el) => el.getAttribute("class"));
    for (const className of classes) {
      expect(className).not.toMatch(/glow|rounded-(2xl|3xl|full)|shadow-card|gradient/);
    }
    expect(document.querySelector("section.sign")).not.toBeNull();
  });
});
