// @vitest-environment jsdom
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PhoneFrame } from "./PhoneFrame";

async function mount(options: { showNav?: boolean; path?: string } = {}) {
  const { showNav = true, path = "/progress" } = options;
  const root = createRootRoute({
    component: () => (
      <PhoneFrame showNav={showNav}>
        <p data-testid="content">screen</p>
      </PhoneFrame>
    ),
  });
  const routes = ["/", "/courses", "/progress", "/profile"].map((to) =>
    createRoute({ getParentRoute: () => root, path: to, component: () => null }),
  );
  const router = createRouter({
    routeTree: root.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByTestId("content");
  return document.body;
}

afterEach(cleanup);

/**
 * The frame must sit centred on any page width and turn into a desktop layout
 * (sidebar + a content column up to 720px) from 1024px. jsdom has no media
 * queries, so this pins the class contract that the breakpoints hang off; the
 * rendered result was checked in a real browser at 375, 768, 1024, 1280 and 1920.
 */
describe("PhoneFrame", () => {
  it("centres the frame on the page at every width", async () => {
    const body = await mount();
    const frame = body.querySelector<HTMLElement>("div[class*='max-w-[420px]']")!;
    expect(frame.className).toContain("mx-auto");
    expect(frame.parentElement!.className).toMatch(/\bflex\b/);
    expect(frame.parentElement!.className).toContain("justify-center");
    expect(frame.parentElement!.className).toContain("w-full");
  });

  it("becomes a 960px desktop layout with a 720px content column from 1024px", async () => {
    const body = await mount();
    const frame = body.querySelector<HTMLElement>("div[class*='max-w-[420px]']")!;
    expect(frame.className).toContain("lg:max-w-[960px]");
    expect(frame.className).toContain("lg:flex-row");
    const column = screen.getByTestId("content").parentElement!;
    expect(column.className).toContain("lg:max-w-[720px]");
    expect(column.className).toContain("mx-auto");
  });

  it("offers the same four destinations in a sidebar (desktop) and a bottom bar (phone)", async () => {
    await mount();
    const navs = screen.getAllByRole("navigation", { hidden: true, name: "Primary" });
    expect(navs).toHaveLength(2);
    const [sidebar, bottom] = navs as [HTMLElement, HTMLElement];
    expect(sidebar.className).toContain("hidden");
    expect(sidebar.className).toContain("lg:flex");
    expect(bottom.className).toContain("lg:hidden");
    for (const nav of navs) {
      const labels = [...nav.querySelectorAll("a")].map((a) => a.textContent?.trim());
      expect(labels).toEqual(["Home", "My Path", "Progress", "Profile"]);
      expect(nav.querySelector("[aria-current='page']")?.textContent?.trim()).toBe("Progress");
    }
  });

  it("renders the screen once, so it keeps its state when the window is resized", async () => {
    await mount();
    expect(screen.getAllByTestId("content")).toHaveLength(1);
  });

  it("shows no navigation on focused screens and keeps them to one 720px column", async () => {
    const body = await mount({ showNav: false });
    expect(screen.queryAllByRole("navigation", { hidden: true })).toHaveLength(0);
    const frame = body.querySelector<HTMLElement>("div[class*='max-w-[420px]']")!;
    expect(frame.className).toContain("lg:max-w-[720px]");
    expect(frame.className).not.toContain("lg:max-w-[960px]");
  });
});
