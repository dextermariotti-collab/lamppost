// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LESSONS, TOTAL_LESSONS } from "@/lib/curriculum";

const h = vi.hoisted(() => ({
  done: new Set<number>(),
  navigate: vi.fn(),
  share: vi.fn(),
  unitAccuracy: 0.6,
}));

vi.mock("@/lib/progress", () => ({
  dayKey: () => "2026-10-19",
  useProgress: () => ({
    state: { history: {}, dailyGoal: 1 },
    streak: 2,
    doneLessons: h.done,
  }),
}));
vi.mock("@/lib/mastery", () => ({
  unitMastery: () => [{ unitId: LESSONS[0]!.unitId, accuracy: h.unitAccuracy, answered: 10 }],
}));
vi.mock("@/lib/share-image", () => ({ shareUnitCard: h.share }));
vi.mock("@/lib/unit-checks", () => ({ useUnitChecks: () => ({ checks: {} }) }));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("./NotesView", () => ({ TryItCard: () => null }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => h.navigate,
}));

import { LessonFinished } from "./LessonFinished";

const unitSpan = LESSONS.flatMap((lesson, i) => (lesson.unitId === LESSONS[0]!.unitId ? [i] : []));

function mount(lessonNumber: number, props: { replay?: boolean; accuracy?: number } = {}) {
  render(
    <LessonFinished
      meta={LESSONS[lessonNumber - 1]!}
      lessonNumber={lessonNumber}
      totalLessons={TOTAL_LESSONS}
      accuracy={props.accuracy ?? 100}
      answered={3}
      practiced={[]}
      xpEarned={80}
      wrote={false}
      {...(props.replay !== undefined ? { replay: props.replay } : {})}
    />,
  );
}

const nextStop = () => {
  fireEvent.click(screen.getByRole("button", { name: /Next stop/ }));
  return Number(h.navigate.mock.calls.at(-1)![0].params.index);
};

beforeEach(() => {
  h.done = new Set();
  vi.clearAllMocks();
});
afterEach(cleanup);

describe("LessonFinished's line badge", () => {
  it("marks the line complete when this lesson finished it", () => {
    h.done = new Set(unitSpan);
    mount(unitSpan.at(-1)! + 1);
    expect(screen.getByText("Line complete")).toBeTruthy();
    expect(screen.getByText("Line badge")).toBeTruthy();
  });

  it("doesn't award the line again on a replay", () => {
    h.done = new Set(unitSpan);
    mount(unitSpan[1]! + 1, { replay: true });
    expect(screen.queryByText("Line complete")).toBeNull();
    expect(screen.queryByText("Line badge")).toBeNull();
    expect(screen.getByText("Lesson complete")).toBeTruthy();
  });

  it("shares the line's accuracy, not the last lesson's", () => {
    h.done = new Set(unitSpan);
    h.unitAccuracy = 0.6;
    mount(unitSpan.at(-1)! + 1, { accuracy: 100 });
    fireEvent.click(screen.getByRole("button", { name: /Share this badge/ }));
    expect(h.share).toHaveBeenCalledWith(expect.objectContaining({ accuracy: 60 }));
  });
});

describe("LessonFinished's next stop", () => {
  it("carries on along the line someone chose, not back to lesson 1", () => {
    h.done = new Set([10]);
    mount(11);
    expect(nextStop()).toBe(12);
    expect(screen.getByText(LESSONS[11]!.title)).toBeTruthy();
  });

  it("skips stops already done", () => {
    h.done = new Set([10, 11, 12]);
    mount(11);
    expect(nextStop()).toBe(14);
  });

  it("goes back round to the first undone lesson after the last one", () => {
    h.done = new Set(Array.from({ length: TOTAL_LESSONS }, (_, i) => i).filter((i) => i !== 3));
    mount(TOTAL_LESSONS);
    expect(nextStop()).toBe(4);
  });

  it("has no next stop once every lesson is done", () => {
    h.done = new Set(Array.from({ length: TOTAL_LESSONS }, (_, i) => i));
    mount(TOTAL_LESSONS);
    expect(screen.queryByRole("button", { name: /Next stop/ })).toBeNull();
  });
});
