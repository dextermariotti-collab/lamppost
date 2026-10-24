// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LESSONS } from "@/lib/curriculum";
import { DEFAULT_STATE } from "@/lib/progress-core";
import { stepAttemptIndex } from "@/lib/steps/attempts";

const h = vi.hoisted(() => ({
  doneLessons: new Set<number>(),
  doneLessonIds: null as string[] | null,
}));

vi.mock("@/lib/progress", () => ({
  useProgress: () => ({
    state: { ...DEFAULT_STATE, xp: 40, doneLessonIds: h.doneLessonIds },
    streak: 1,
    doneLessons: h.doneLessons,
    doneToday: 1,
    registerCourse: vi.fn(),
  }),
}));
vi.mock("@/lib/companion-store", () => ({ hasSeenOnboarding: () => true }));
vi.mock("@/lib/curriculum-store", () => ({ useCurriculumCourse: () => undefined }));
vi.mock("@/lib/review-drills", () => ({
  useDueDrills: () => ({ total: 0, maxOverdue: 0 }),
  useDrillSchedule: () => ({ items: [] }),
  reviewUrgencyFor: () => "none",
  nextReviewLine: () => "",
}));
vi.mock("@/lib/daily-case", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/daily-case")>()),
  useDailyCase: () => ({ pick: null, wantsNew: false }),
}));
vi.mock("@/lib/daily-case-ai", () => ({ useAiCaseTopUp: () => false }));
vi.mock("@/lib/unit-checks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/unit-checks")>()),
  useUnitChecks: () => ({ checks: {} }),
}));
vi.mock("@/lib/use-today", () => ({ useToday: () => "2026-10-21" }));
vi.mock("@/components/WeeklyRecapCard", () => ({ WeeklyRecapCard: () => null }));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { Route } from "./index";

const Screen = Route.options.component as () => ReactNode;
const first = LESSONS[0]!;
const second = LESSONS[1]!;
/** The Up next sign: the section around the lesson's title. */
const sign = () => screen.getByRole("heading", { level: 1 }).closest("section")!;

function rate(lessonId: string, rating: number) {
  window.localStorage.setItem(
    "lamppost-rating-v1",
    JSON.stringify({
      [lessonId]: { rating, answered: 6, run: 0, lastAt: Date.now(), seen: [] },
    }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
  h.doneLessons = new Set([0]);
  h.doneLessonIds = [first.id];
});
afterEach(cleanup);

describe("Home: Up next", () => {
  it("shows the next lesson after lesson 1", () => {
    render(<Screen />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(second.title);
  });

  it.each([
    ["a weak", 900],
    ["a solid", 1200],
  ])("says nothing about lesson 1 under lesson 2 when lesson 1 has %s rating", (_, rating) => {
    rate(first.id, rating);
    render(<Screen />);
    const text = sign().textContent!.toLowerCase();
    expect(text).toContain(second.title.toLowerCase());
    expect(text).not.toContain(first.title.toLowerCase());
    expect(text).not.toContain("keeps catching you out");
    expect(text).not.toContain("keeps a solid skill sharp");
    expect(text).not.toContain("haven't drilled");
    expect(text).not.toContain("haven't touched");
  });

  it("adds no reason line for a lesson not begun", () => {
    render(<Screen />);
    expect(sign().textContent).not.toContain("started this one");
  });

  it("says when the lesson on the sign was begun and left", () => {
    window.localStorage.setItem(
      "lamppost-exercises-v1",
      JSON.stringify({ [`${second.id}#0`]: { answer: 1, score: 1, at: Date.now() } }),
    );
    render(<Screen />);
    expect(sign().textContent).toContain("You've started this one before.");
  });

  it("sees a step answered in an authored lesson, stored under the step's own index", () => {
    window.localStorage.setItem(
      "lamppost-exercises-v1",
      JSON.stringify({
        [`${second.id}#${stepAttemptIndex(1)}`]: { answer: 0, score: 0.5, at: Date.now() },
      }),
    );
    render(<Screen />);
    expect(sign().textContent).toContain("You've started this one before.");
  });

  it("says nothing under the sign about any other lesson, however its skills went", () => {
    for (const lesson of LESSONS.slice(0, 3)) rate(lesson.id, 900);
    window.localStorage.setItem(
      "lamppost-exercises-v1",
      JSON.stringify({ [`${first.id}#${stepAttemptIndex(0)}`]: { answer: 0, score: 0, at: 1 } }),
    );
    render(<Screen />);
    // The sign's lines are its own: where it is, what it teaches, how long. Nothing else.
    expect([...sign().querySelectorAll("p")].map((p) => p.textContent)).toEqual([
      expect.stringContaining("stop 2 of"),
      second.objective,
      expect.stringContaining("lesson 2 of"),
    ]);
    for (const lesson of LESSONS.filter((l) => l.id !== second.id)) {
      expect(sign().textContent).not.toContain(lesson.title);
    }
    expect(sign().textContent).not.toMatch(
      /keeps catching you out|keeps a solid skill sharp|haven't drilled|haven't touched/i,
    );
  });

  it("doesn't count answers from another lesson as beginning this one", () => {
    window.localStorage.setItem(
      "lamppost-exercises-v1",
      JSON.stringify({ [`${first.id}#0`]: { answer: 1, score: 1, at: Date.now() } }),
    );
    render(<Screen />);
    expect(sign().textContent).not.toContain("started this one");
  });
});

describe("Home: header", () => {
  it("leaves the wordmark to the sidebar from 1024px", () => {
    render(<Screen />);
    const mark = screen.getByText("Lamppost").closest("span")!;
    expect(mark.className).toContain("lg:hidden");
  });
});
