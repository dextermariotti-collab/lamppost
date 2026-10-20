// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LESSONS, unitProgress } from "@/lib/curriculum";

const h = vi.hoisted(() => ({
  doneLessons: new Set<number>(),
  studiedLessons: new Set<number>(),
  doneLessonIds: null as string[] | null,
}));

vi.mock("@/lib/progress", () => ({
  useProgress: () => ({
    state: { doneLessonIds: h.doneLessonIds },
    doneLessons: h.doneLessons,
    studiedLessons: h.studiedLessons,
    registerCourse: vi.fn(),
  }),
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
const units = unitProgress(new Set());
const indexes = (unitIndex: number) => units[unitIndex]!.lessons.map((l) => LESSONS.indexOf(l));
const ids = (unitIndex: number) => units[unitIndex]!.lessons.map((l) => l.id);
/** The first stop drawn on a unit's line. */
const firstStop = (unitId: string) => document.getElementById(`unit-${unitId}`)!.firstElementChild!;

beforeEach(() => {
  h.doneLessons = new Set([0, 1]);
  h.studiedLessons = new Set([0, 1]);
  h.doneLessonIds = [LESSONS[0]!.id, LESSONS[1]!.id];
});
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

  it("marks the same next stop as Home: along the line the learner is on", () => {
    const [start, second] = indexes(2);
    h.doneLessons = new Set([start!]);
    h.studiedLessons = new Set([start!]);
    h.doneLessonIds = [LESSONS[start!]!.id];
    render(<Screen />);
    const here = screen.getByText("You are here").closest("a")!;
    expect(here.textContent).toContain(LESSONS[second!]!.title);
    expect(document.getElementById(`unit-${units[2]!.unit.id}`)!.hidden).toBe(false);
  });

  it("still offers the before-check on a line placement marked as known", () => {
    h.doneLessons = new Set(indexes(0));
    h.studiedLessons = new Set();
    h.doneLessonIds = ids(0);
    render(<Screen />);
    expect(firstStop(units[0]!.unit.id).textContent).toContain("Before you start");
  });

  it("closes the before-check once a lesson on the line is actually studied", () => {
    const line = indexes(0);
    h.doneLessons = new Set(line);
    h.studiedLessons = new Set(line.slice(-1));
    h.doneLessonIds = ids(0);
    render(<Screen />);
    const stops = document.getElementById(`unit-${units[0]!.unit.id}`)!;
    expect(stops.textContent).not.toContain("Before you start");
    expect(stops.lastElementChild!.textContent).toContain("Check what changed");
  });
});
