// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/progress", () => ({
  useProgress: () => ({ state: {}, doneLessons: new Set([0, 1]), registerCourse: vi.fn() }),
}));
vi.mock("@/lib/curriculum-store", () => ({ useCurriculumCourse: () => undefined }));
vi.mock("@/lib/review-drills", () => ({ useDueDrills: () => ({ items: [] }) }));
vi.mock("@/lib/unit-checks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/unit-checks")>()),
  useUnitChecks: () => ({ checks: {} }),
}));
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
}));

import { Route } from "./courses";

const Screen = Route.options.component as () => ReactNode;

afterEach(cleanup);

describe("My Path", () => {
  it("draws each line without putting anything but stops inside its list", () => {
    render(<Screen />);
    const lines = document.querySelectorAll("ol");
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      for (const child of line.children) expect(child.tagName).toBe("LI");
    }
    const open = [...lines].find((line) => !line.hidden)!;
    expect(open.className).toMatch(/before:bg-\[var\(--line\)\]/);
    expect(screen.getByText("You are here")).toBeTruthy();
  });
});
