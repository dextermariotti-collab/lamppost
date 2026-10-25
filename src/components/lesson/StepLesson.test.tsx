// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CURRICULUM_SLUG, LESSONS, TOTAL_LESSONS } from "@/lib/curriculum";
import type { LessonNotes } from "@/lib/lesson-notes";
import type { StepResult } from "@/lib/steps/scoring";
import type { LessonScript, LessonStep } from "@/lib/steps/types";

const h = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const store = { done: new Set<number>(), xp: 0, version: 0 };
  const bump = () => {
    store.version += 1;
    listeners.forEach((listener) => listener());
  };
  return {
    store,
    listeners,
    bump,
    userId: null as string | null,
    // As the real store does, a lesson already finished changes nothing.
    completeLesson: vi.fn((_slug: string, _topic: string, index: number) => {
      if (store.done.has(index)) return;
      store.done = new Set([...store.done, index]);
      store.xp += 50;
      bump();
    }),
    recordExercise: vi.fn(),
    recordPractice: vi.fn(),
    recordArgument: vi.fn(),
    playCue: vi.fn(),
    celebrateAnswer: vi.fn(),
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
        state: { xp: h.store.xp, history: {}, dailyGoal: 1 },
        streak: 1,
        hydrated: true,
        doneLessons: h.store.done,
        doneToday: 0,
        completeLesson: h.completeLesson,
        recordExercise: h.recordExercise,
        recordPractice: h.recordPractice,
        recordArgument: h.recordArgument,
      };
    },
  };
});
vi.mock("@/lib/feedback", () => ({ playCue: h.playCue }));
vi.mock("@/components/AnswerFeedback", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/AnswerFeedback")>()),
  celebrateAnswer: h.celebrateAnswer,
}));
vi.mock("@/lib/companion-store", async () => {
  const { DEFAULT_COMPANION } = await import("@/lib/companions");
  return {
    useCompanion: () => ({ companion: DEFAULT_COMPANION }),
    useSessionUser: () => ({ userId: h.userId, ready: true }),
  };
});
vi.mock("@/lib/review-drills", () => ({ trackDrillResult: vi.fn() }));
vi.mock("@/lib/rating", () => ({ recordDrillOutcome: vi.fn() }));
vi.mock("@/lib/mastery", () => ({ recordWrittenScore: vi.fn(), unitMastery: () => [] }));
vi.mock("@/lib/lesson-notes", () => ({ notesText: () => "The notes." }));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ScreenHeader", () => ({
  ScreenHeader: ({ right }: { right?: ReactNode }) => <header>{right}</header>,
}));
vi.mock("@/components/ReportContentButton", () => ({
  ReportContentButton: () => <span>Report this content</span>,
}));
vi.mock("./NotesView", () => ({
  NotesView: () => <div>The idea in full, written out.</div>,
  TryItCard: () => null,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

const result = (score: number, revealed = false): StepResult => ({
  score,
  answer: { choice: 0 },
  wrongAttempts: score === 1 ? 0 : 1,
  hintUsed: false,
  revealed,
});

vi.mock("./LessonPlayer", () => ({
  LessonPlayer: ({
    steps,
    onStepResolved,
    onComplete,
    aboveAction,
  }: {
    steps: LessonStep[];
    onStepResolved: (index: number, step: LessonStep, result: StepResult) => void;
    onComplete: () => void;
    aboveAction?: ReactNode;
  }) => (
    <div>
      <div data-testid="above-continue">{aboveAction}</div>
      {steps.map((step, i) => (
        <span key={step.id}>
          <button onClick={() => onStepResolved(i, step, result(1))}>first try {i}</button>
          <button onClick={() => onStepResolved(i, step, result(0.5))}>second try {i}</button>
          <button onClick={() => onStepResolved(i, step, result(0, true))}>shown {i}</button>
        </span>
      ))}
      <button onClick={onComplete}>steps done</button>
    </div>
  ),
}));

vi.mock("@/components/exercises/WrittenArgument", () => ({
  WrittenArgument: ({ onGraded }: { onGraded: (t: number, a: number, m: number) => void }) => {
    let attempt = 0;
    return (
      <section>
        <button className="sticky-action" onClick={() => onGraded(8, ++attempt, 12)}>
          Submit for feedback
        </button>
      </section>
    );
  },
}));

vi.mock("@/components/PracticeChat", () => ({
  PracticeChat: ({
    signedIn,
    returnTo,
    onDone,
  }: {
    signedIn: boolean;
    returnTo: string;
    onDone: (close: null) => void;
  }) => (
    <div>
      <p>tutor card {signedIn ? "signed in" : "signed out"}</p>
      <p>returns to {returnTo}</p>
      <button onClick={() => onDone(null)}>Card: finish the lesson</button>
    </div>
  ),
}));

import { StepLesson } from "./StepLesson";

const script = {
  steps: [
    { id: "n", kind: "note", prompt: "Read this." },
    { id: "a", kind: "choice", why: "Because." },
    { id: "b", kind: "choice", why: "Because." },
    { id: "c", kind: "choice", why: "Because." },
  ],
  takeaway: "Look for the claim.",
  written: { prompt: "Write.", passage: "Passage." },
} as unknown as LessonScript;

const notes = { hook: "A hook.", tryIt: "Try it." } as unknown as LessonNotes;

function mount(lessonNumber = 1, withNotes: LessonNotes | null = null) {
  return render(
    <StepLesson
      script={script}
      notes={withNotes}
      meta={LESSONS[lessonNumber - 1]!}
      lessonNumber={lessonNumber}
    />,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const toWriting = () => click("steps done");

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  h.store.done = new Set();
  h.store.xp = 0;
  h.userId = null;
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as never;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("StepLesson records the lesson before Explain it back", () => {
  it("counts it the moment the writing is skipped, so leaving to sign in loses nothing", () => {
    mount();
    toWriting();
    expect(h.completeLesson).not.toHaveBeenCalled();
    click("Skip the writing this time");
    expect(h.completeLesson).toHaveBeenCalledTimes(1);
    expect(h.completeLesson).toHaveBeenCalledWith(
      CURRICULUM_SLUG,
      expect.any(String),
      0,
      TOTAL_LESSONS,
    );
    expect(screen.getByText("tutor card signed out")).toBeTruthy();
    expect(
      screen.getByText(`returns to /course/${CURRICULUM_SLUG}/lesson/1?part=explain`),
    ).toBeTruthy();
  });

  it("counts it when the writing is graded, once, through a revision and the finish", () => {
    vi.useFakeTimers();
    mount();
    toWriting();
    click("Submit for feedback");
    click("Submit for feedback");
    expect(h.completeLesson).toHaveBeenCalledTimes(1);
    click("Explain it back");
    click("Card: finish the lesson");
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(h.completeLesson).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { level: 1, name: LESSONS[0]!.title })).toBeTruthy();
  });

  it("leaves the signed-out card as the one way on, and keeps its own Finish for signed-in", () => {
    mount();
    toWriting();
    click("Skip the writing this time");
    expect(screen.queryByRole("button", { name: /^Finish the (lesson|course)$/ })).toBeNull();
    cleanup();

    h.userId = "user-1";
    mount(2);
    toWriting();
    click("Skip the writing this time");
    expect(screen.getByRole("button", { name: "Finish the lesson" })).toBeTruthy();
  });

  it("opens at Explain it back after signing in, but only for a lesson already done", () => {
    window.history.replaceState(null, "", "/course/x/lesson/1?part=explain");
    mount();
    expect(screen.queryByText(/tutor card/)).toBeNull();
    cleanup();

    h.store.done = new Set([0]);
    mount();
    expect(screen.getByText("tutor card signed out")).toBeTruthy();
  });
});

describe("StepLesson after leaving Explain it back to sign in", () => {
  const RUN = "lamppost-lesson-run";
  const held = () => JSON.parse(window.sessionStorage.getItem(RUN) ?? "null");
  const allBut = (last: number) => new Set(Array.from({ length: last }, (_, i) => i));
  const idsAt = (positions: Iterable<number>) => [...positions].map((i) => LESSONS[i]!.id);
  const unitSpan = LESSONS.flatMap((lesson, i) =>
    lesson.unitId === LESSONS[0]!.unitId ? [i] : [],
  );

  /** Signed out: the steps, skip the writing, and stop at the tutor card's "sign in". */
  const leaveToSignIn = (lessonNumber: number) => {
    mount(lessonNumber);
    toWriting();
    click("Skip the writing this time");
    cleanup();
  };
  /** Signed in now, the redirect opens the lesson at Explain it back; finish it there. */
  const comeBackAndFinish = (lessonNumber: number) => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    h.userId = "user-1";
    window.history.replaceState(
      null,
      "",
      `/course/${CURRICULUM_SLUG}/lesson/${lessonNumber}?part=explain`,
    );
    mount(lessonNumber);
    expect(screen.getByText("tutor card signed in")).toBeTruthy();
    click(/^Finish the (lesson|course)$/);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
  };
  const xpShown = () => screen.getByText("XP earned").nextElementSibling?.textContent;

  it("holds the run for the way back: the lesson, what was done before it, what it earned", () => {
    h.store.done = allBut(TOTAL_LESSONS - 1);
    leaveToSignIn(TOTAL_LESSONS);
    expect(held()).toMatchObject({
      lessonId: LESSONS[TOTAL_LESSONS - 1]!.id,
      doneBefore: idsAt(allBut(TOTAL_LESSONS - 1)),
      xpEarned: 50,
    });
  });

  it("speaks only for this lesson when signing in brought the account's map along", () => {
    // Played lesson 1 on a new device; the account had finished all 35 elsewhere.
    h.store.done = new Set();
    leaveToSignIn(1);
    h.store.done = allBut(TOTAL_LESSONS);
    comeBackAndFinish(1);
    expect(screen.queryByText("Map complete")).toBeNull();
    expect(screen.getByText("Lesson complete")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /final check/i })).toBeNull();
  });

  it("and when it brought the rest of the line along", () => {
    // Played lesson 2 on a new device; the account already had the rest of line 1.
    h.store.done = new Set();
    leaveToSignIn(2);
    h.store.done = new Set(unitSpan);
    comeBackAndFinish(2);
    expect(screen.queryByText("Line complete")).toBeNull();
    expect(screen.getByText("Lesson complete")).toBeTruthy();
  });

  it("shows the graduation board and the final check when that lesson finished the map", () => {
    h.store.done = allBut(TOTAL_LESSONS - 1);
    leaveToSignIn(TOTAL_LESSONS);
    comeBackAndFinish(TOTAL_LESSONS);
    expect(screen.getByText("Map complete")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Every line, every stop" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /final check/i }).getAttribute("href")).toBe(
      "/final-check",
    );
    expect(xpShown()).toBe("+50");
    expect(window.sessionStorage.getItem(RUN)).toBeNull();
  });

  it("shows the line complete when that lesson finished its line", () => {
    h.store.done = new Set(unitSpan.slice(0, -1));
    leaveToSignIn(unitSpan.at(-1)! + 1);
    comeBackAndFinish(unitSpan.at(-1)! + 1);
    expect(screen.getByText("Line complete")).toBeTruthy();
    expect(screen.getByText("Line badge")).toBeTruthy();
  });

  it("is read once: opening the lesson there again is a replay", () => {
    h.store.done = allBut(TOTAL_LESSONS - 1);
    leaveToSignIn(TOTAL_LESSONS);
    comeBackAndFinish(TOTAL_LESSONS);
    cleanup();
    comeBackAndFinish(TOTAL_LESSONS);
    expect(screen.queryByText("Map complete")).toBeNull();
    expect(screen.getByText("Lesson complete")).toBeTruthy();
    expect(xpShown()).toBe("+0");
  });

  it("can't be faked by the address alone", () => {
    h.store.done = allBut(TOTAL_LESSONS);
    comeBackAndFinish(TOTAL_LESSONS);
    expect(screen.queryByText("Map complete")).toBeNull();
    expect(screen.getByText("Lesson complete")).toBeTruthy();
  });

  it("ignores a held run for another lesson, an old one, or one that doesn't fit this device", () => {
    const now = Date.now();
    const id = LESSONS[0]!.id;
    const others = idsAt(allBut(TOTAL_LESSONS)).slice(1);
    const finishWith = (run: unknown, done: Set<number>) => {
      h.store.done = done;
      h.store.xp = 500;
      window.sessionStorage.setItem(RUN, JSON.stringify(run));
      comeBackAndFinish(1);
      const board = {
        map: screen.queryByText("Map complete") !== null,
        xp: xpShown(),
        held: window.sessionStorage.getItem(RUN),
      };
      cleanup();
      vi.useRealTimers();
      return board;
    };
    const all = allBut(TOTAL_LESSONS);
    // The run as this screen holds it: the board it would have shown.
    expect(finishWith({ lessonId: id, doneBefore: others, xpEarned: 50, at: now }, all)).toEqual({
      map: true,
      xp: "+50",
      held: null,
    });
    for (const [run, done] of [
      [{ lessonId: LESSONS[1]!.id, doneBefore: others, xpEarned: 50, at: now }, all],
      [{ lessonId: id, doneBefore: others, xpEarned: 50, at: now - 31 * 60_000 }, all],
      [{ lessonId: id, doneBefore: [id, ...others], xpEarned: 50, at: now }, all],
      [{ lessonId: id, doneBefore: others, xpEarned: 1e9, at: now }, all],
      [{ lessonId: id, doneBefore: others, xpEarned: 50 }, all],
      [{ lessonId: id, doneBefore: others, xpEarned: 50, at: now }, new Set([0])],
      ["not a run", all],
    ] as const) {
      expect(finishWith(run, new Set(done)), JSON.stringify(run)).toEqual({
        map: false,
        xp: "+0",
        held: null,
      });
    }
  });

  it("holds nothing for a signed-in learner or a replay, and lets go when the lesson ends", () => {
    h.userId = "user-1";
    mount(1);
    toWriting();
    click("Skip the writing this time");
    expect(window.sessionStorage.getItem(RUN)).toBeNull();
    cleanup();

    h.userId = null;
    h.store.done = new Set([1]);
    mount(2);
    toWriting();
    click("Skip the writing this time");
    expect(window.sessionStorage.getItem(RUN)).toBeNull();
    cleanup();

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    mount(3);
    toWriting();
    click("Skip the writing this time");
    expect(held()?.lessonId).toBe(LESSONS[2]!.id);
    click("Card: finish the lesson");
    expect(window.sessionStorage.getItem(RUN)).toBeNull();
  });
});

describe("StepLesson's pinned bars", () => {
  it("puts the report link above Continue during the steps, not below it", () => {
    mount(1);
    expect(screen.getByTestId("above-continue").textContent).toBe("Report this content");
    expect(screen.getAllByText("Report this content")).toHaveLength(1);
  });

  it("keeps the notes' pinned bar the last thing on the screen", () => {
    mount(1, notes);
    toWriting();
    const bar = screen.getByRole("button", { name: /On to the writing/ }).parentElement!;
    expect(bar.classList.contains("sticky-action")).toBe(true);
    expect(bar.nextElementSibling).toBeNull();
    expect(bar.previousElementSibling?.textContent).toBe("Report this content");
    expect(screen.getAllByText("Report this content")).toHaveLength(1);
  });
});

describe("StepLesson's writing part", () => {
  it("pins only the writing's own Submit, so Skip and Explain it back never sit on top of it", () => {
    mount();
    toWriting();
    const skip = screen.getByRole("button", { name: "Skip the writing this time" });
    expect(skip.closest('[class*="sticky"]')).toBeNull();
    click("Submit for feedback");
    const next = screen.getByRole("button", { name: /Explain it back/ });
    expect(next.closest('[class*="sticky"]')).toBeNull();
  });
});

describe("StepLesson's answer feedback", () => {
  it("plays one cue per answer from the step's own verdict", () => {
    mount();
    click("second try 1");
    expect(h.playCue).toHaveBeenCalledTimes(1);
    expect(h.playCue).toHaveBeenLastCalledWith("correct");
    click("shown 2");
    expect(h.playCue).toHaveBeenCalledTimes(2);
    expect(h.playCue).toHaveBeenLastCalledWith("wrong");
  });

  it("shows what three in a row really pays, and plays the cue once", () => {
    mount();
    click("first try 1");
    click("first try 2");
    click("first try 3");
    expect(h.playCue).toHaveBeenCalledTimes(3);
    expect(h.celebrateAnswer).toHaveBeenCalledTimes(1);
    const shown = h.celebrateAnswer.mock.calls[0]![0];
    // The chip reads xp + bonus: 25 for the step and a 5 bonus, the same as recordExercise pays.
    expect(shown).toMatchObject({ correct: true, xp: 25, bonus: 5, combo: 3 });
    expect(h.recordExercise).toHaveBeenLastCalledWith(1, 5);
  });

  it("shows no XP on a replay that pays nothing", () => {
    window.localStorage.setItem(
      "lamppost-exercises-v1",
      JSON.stringify(
        Object.fromEntries(
          [101, 102, 103].map((i) => [`${LESSONS[0]!.id}#${i}`, { answer: 0, score: 1, at: 1 }]),
        ),
      ),
    );
    mount();
    click("first try 1");
    click("first try 2");
    click("first try 3");
    expect(h.recordExercise).not.toHaveBeenCalled();
    expect(h.celebrateAnswer).not.toHaveBeenCalled();
    expect(h.playCue).toHaveBeenCalledTimes(3);
  });
});

describe("StepLesson's copy", () => {
  const lastIndex = TOTAL_LESSONS - 1;

  it("says Finish the course on the last lesson only when it completes the map", () => {
    h.userId = "user-1";
    mount(TOTAL_LESSONS);
    toWriting();
    click("Skip the writing this time");
    expect(screen.getByRole("button", { name: "Finish the lesson" })).toBeTruthy();
    cleanup();

    h.store.done = new Set(Array.from({ length: lastIndex }, (_, i) => i));
    mount(TOTAL_LESSONS);
    toWriting();
    click("Skip the writing this time");
    expect(screen.getByRole("button", { name: "Finish the course" })).toBeTruthy();
  });

  it("only promises the notes stay on My Path once the lesson counts", () => {
    mount(1, notes);
    toWriting();
    expect(screen.queryByText(/^These notes stay on My Path/)).toBeNull();
    expect(screen.getByText(/^Finish the lesson and these notes stay/)).toBeTruthy();
    cleanup();

    h.store.done = new Set([0]);
    mount(1, notes);
    toWriting();
    expect(screen.getByText(/^These notes stay on My Path/)).toBeTruthy();
  });
});
