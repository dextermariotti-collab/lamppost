// @vitest-environment jsdom
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => (
    <div data-testid="phone-frame">{children}</div>
  ),
}));
vi.mock("@/components/AnswerFeedback", () => ({ AnswerFeedbackHost: () => null }));
vi.mock("@/components/ConsentGate", () => ({ ConsentGate: () => null }));
vi.mock("@/components/NativeShell", () => ({ NativeShell: () => null }));
vi.mock("@/components/RewardHost", () => ({ RewardHost: () => null }));
vi.mock("@/components/UpkeepWatcher", () => ({ UpkeepWatcher: () => null }));

import { Route } from "./__root";

const ErrorScreen = Route.options.errorComponent as (props: ErrorComponentProps) => ReactNode;
const NotFound = Route.options.notFoundComponent as () => ReactNode;

async function mount(Screen: () => ReactNode) {
  const root = createRootRoute({ component: Screen });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByTestId("phone-frame");
}

const setOnline = (value: boolean) =>
  Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => value });

beforeEach(() => {
  setOnline(true);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the error and not-found screens", () => {
  it("show a missing page inside the app's frame, with a way home", async () => {
    await mount(() => <NotFound />);
    const frame = screen.getByTestId("phone-frame");
    expect(frame.textContent).toMatch(/page not found/i);
    expect(screen.getByRole("link", { name: "Go home" }).getAttribute("href")).toBe("/");
  });

  it("show an error inside the app's frame, with a retry", async () => {
    await mount(() => <ErrorScreen error={new Error("boom")} reset={() => undefined} />);
    expect(screen.getByTestId("phone-frame").textContent).toMatch(/this page didn't load/i);
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("say the device is offline instead of blaming the server", async () => {
    setOnline(false);
    await mount(() => <ErrorScreen error={new Error("fetch failed")} reset={() => undefined} />);
    expect(screen.getByRole("heading", { name: /you're offline/i })).toBeTruthy();
    expect(screen.queryByText(/on our end/i)).toBeNull();

    setOnline(true);
    act(() => void window.dispatchEvent(new Event("online")));
    expect(screen.getByRole("heading", { name: /this page didn't load/i })).toBeTruthy();
  });
});
