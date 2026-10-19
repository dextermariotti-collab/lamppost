// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LESSONS } from "@/lib/curriculum";

const h = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const store = { done: new Set<number>(), completedCount: 0, version: 0 };
  return {
    store,
    listeners,
    userId: null as string | null,
    useCurriculumLesson: vi.fn(),
    completeLesson: vi.fn((_slug: string, _topic: string, index: number) => {
      store.done = new Set([...store.done, index]);
      store.version += 1;
      listeners.forEach((listener) => listener());
    }),
  };
});

vi.mock("@/lib/progress", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    dayKey: () => "2026-10-19",
    useProgress: () => {
      useSyncExternalStore(
        (listener) => {
          h.listeners.add(listener);
          return () => h.listeners.delete(listener);
        },
        () => h.store.version,
        () => h.store.version,
      );
      return {
        state: {
          xp: 0,
          history: {},
          dailyGoal: 1,
          courses: { "critical-thinking": { completed: h.store.completedCount } },
        },
        streak: 1,
        hydrated: true,
        doneLessons: h.store.done,
        completeLesson: h.completeLesson,
        recordPractice: vi.fn(),
        recordExercise: vi.fn(),
        recordArgument: vi.fn(),
      };
    },
  };
});
vi.mock("@/lib/curriculum-store", () => ({
  useCurriculumCourse: () => ({
    slug: "critical-thinking",
    topic: "Critical thinking",
    lessons: LESSONS.map((lesson) => ({ title: lesson.title })),
  }),
  useCurriculumLesson: h.useCurriculumLesson,
}));
vi.mock("@/lib/companion-store", async () => {
  const { DEFAULT_COMPANION } = await import("@/lib/companions");
  return {
    useCompanion: () => ({ companion: DEFAULT_COMPANION }),
    useSessionUser: () => ({ userId: h.userId, ready: true }),
  };
});
vi.mock("@/components/AnswerFeedback", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/AnswerFeedback")>()),
  celebrateAnswer: vi.fn(),
}));
vi.mock("@/lib/review-drills", () => ({ trackDrillResult: vi.fn() }));
vi.mock("@/lib/rating", () => ({ recordDrillOutcome: vi.fn() }));
vi.mock("@/lib/mastery", () => ({ recordWrittenScore: vi.fn(), unitMastery: () => [] }));
vi.mock("@/lib/share-image", () => ({ shareUnitCard: vi.fn() }));
vi.mock("@/lib/exercises", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/exercises")>()),
  describeExercise: () => "A drill.",
}));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ScreenHeader", () => ({ ScreenHeader: () => null }));
vi.mock("@/components/ReportContentButton", () => ({ ReportContentButton: () => null }));
vi.mock("@/components/AiDisclaimer", () => ({ AiDisclaimer: () => null }));
vi.mock("@/components/SocraticPopup", () => ({ SocraticPopup: () => null }));
vi.mock("@/components/SuccessBurst", () => ({ SuccessBurst: () => null }));
vi.mock("@/components/exercises/ExerciseRunner", () => ({
  ExerciseRunner: ({ onAnswer }: { onAnswer: (answer: unknown, score: number) => void }) => (
    <button onClick={() => onAnswer(0, 0)}>Answer the drill</button>
  ),
}));
vi.mock("@/components/exercises/WrittenArgument", () => ({
  WrittenArgument: () => <button className="sticky-action">Submit for feedback</button>,
}));
vi.mock("@/components/PracticeChat", () => ({
  PracticeChat: ({ onDone }: { onDone: (close: null) => void }) => (
    <button onClick={() => onDone(null)}>Card: finish the lesson</button>
  ),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

import { LegacyLesson } from "./LegacyLesson";

const firstUnit = LESSONS.flatMap((lesson, i) => (lesson.unitId === LESSONS[0]!.unitId ? [i] : []));
const lastStop = firstUnit.at(-1)!;

function lessonFor(index: number) {
  const meta = LESSONS[index]!;
  return {
    lesson: { title: meta.title, subtitle: meta.objective, concept: { body: "The idea." } },
    drills: [{ kind: meta.drills[0]!, question: "Q" }],
    written: { type: meta.written, prompt: "Write.", passage: "Passage." },
    complete: true,
    meta,
    loading: false,
    error: null,
    notice: null,
    failed: [],
    retry: vi.fn(),
    ready: true,
  };
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

function playToSummary() {
  click(/Start training/);
  click("Answer the drill");
  click(/Write your argument/);
  click("Skip the writing this time");
}

beforeEach(() => {
  window.localStorage.clear();
  h.store.done = new Set();
  h.store.completedCount = 0;
  h.userId = null;
  vi.clearAllMocks();
  h.useCurriculumLesson.mockImplementation((index: number) => lessonFor(index));
  window.scrollTo = vi.fn() as never;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("LegacyLesson", () => {
  it("serves a lesson from the device by whether that lesson is done, not a count", () => {
    h.store.completedCount = 5;
    h.store.done = new Set([30, 31, 32, 33, 34]);
    render(<LegacyLesson lessonNumber={2} />);
    expect(h.useCurriculumLesson).toHaveBeenLastCalledWith(1, false);
    cleanup();

    render(<LegacyLesson lessonNumber={31} />);
    expect(h.useCurriculumLesson).toHaveBeenLastCalledWith(30, true);
  });

  it("records the lesson once, as soon as the writing is skipped", () => {
    vi.useFakeTimers();
    render(<LegacyLesson lessonNumber={1} />);
    playToSummary();
    expect(h.completeLesson).toHaveBeenCalledTimes(1);
    click(/See the summary/);
    click("Card: finish the lesson");
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(h.completeLesson).toHaveBeenCalledTimes(1);
  });

  it("doesn't call the line complete for its last stop while earlier stops are undone", () => {
    vi.useFakeTimers();
    render(<LegacyLesson lessonNumber={lastStop + 1} />);
    playToSummary();
    click(/See the summary/);
    click("Card: finish the lesson");
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByText("Lesson complete")).toBeTruthy();
    expect(screen.queryByText("Line complete")).toBeNull();
  });

  it("calls the line complete when this lesson finishes it, from any stop", () => {
    vi.useFakeTimers();
    h.store.done = new Set(firstUnit.filter((i) => i !== 1));
    render(<LegacyLesson lessonNumber={2} />);
    playToSummary();
    click(/See the summary/);
    click("Card: finish the lesson");
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByText("Line complete")).toBeTruthy();
  });
});
