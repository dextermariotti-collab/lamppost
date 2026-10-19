// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LESSONS } from "./curriculum";
import type { Exercise } from "./exercises";
import { slotOf } from "./lesson-parts";

const server = vi.hoisted(() => ({ getCurriculumLesson: vi.fn(), getLessonPart: vi.fn() }));
vi.mock("./curriculum.functions", () => server);

import { saveCourse } from "./course-store";
import { ensureCurriculumCourse, useCurriculumLesson } from "./curriculum-store";

const meta = LESSONS.find((lesson) => lesson.drills.length === 4)!;
const index = LESSONS.indexOf(meta);
const drill = (slot: number) =>
  ({ kind: meta.drills[slot]!, question: `q${slot}` }) as unknown as Exercise;
const written = { type: meta.written, prompt: "Write.", passage: "Passage." };
const card = {
  title: "T",
  subtitle: "S",
  emoji: "x",
  concept: { title: "Idea", body: "The card." },
};
const whole = {
  ...card,
  exercises: meta.drills.map((_, i) => drill(i)),
  written,
  contentVersion: 7,
};
const partial = (have: number[], hasWritten = false) => ({
  ok: true,
  complete: false,
  lesson: card,
  drills: meta.drills.map((_, i) => (have.includes(i) ? drill(i) : null)),
  written: hasWritten ? written : null,
});

function Probe({ finished = false }: { finished?: boolean }) {
  const r = useCurriculumLesson(index, finished);
  return (
    <div>
      <p data-testid="ready">{String(r.ready)}</p>
      <p data-testid="complete">{String(r.complete)}</p>
      <p data-testid="loading">{String(r.loading)}</p>
      <p data-testid="card">{r.lesson?.concept?.body ?? ""}</p>
      <p data-testid="drills">{r.drills.map((d) => (d ? "1" : "0")).join("")}</p>
      <p data-testid="written">{String(r.written !== null)}</p>
      <p data-testid="error">{r.error ?? ""}</p>
      <p data-testid="notice">{r.notice ?? ""}</p>
      <button onClick={r.retry}>retry</button>
    </div>
  );
}
const text = (id: string) => screen.getByTestId(id).textContent;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
afterEach(cleanup);

describe("useCurriculumLesson on a cold cache", () => {
  it("is ready on the idea card while the drills are still being written, then fills in", async () => {
    const releases: Record<string, () => void> = {};
    server.getCurriculumLesson
      .mockResolvedValueOnce(partial([]))
      .mockResolvedValue({ ok: true, complete: true, lesson: whole, cached: false });
    server.getLessonPart.mockImplementation(
      ({ data }: { data: { part: string } }) =>
        new Promise((resolve) => {
          releases[data.part] = () => {
            const slot = slotOf(data.part);
            resolve(partial(slot === null ? [] : [slot], data.part === "written"));
          };
        }),
    );

    render(<Probe />);
    await waitFor(() => expect(text("ready")).toBe("true"));
    expect(text("card")).toBe("The card.");
    expect(text("drills")).toBe("0000");
    expect(text("complete")).toBe("false");
    expect(text("loading")).toBe("false");

    await waitFor(() => expect(Object.keys(releases)).toHaveLength(5));
    act(() => releases["drill:1"]!());
    await waitFor(() => expect(text("drills")).toBe("0100"));

    for (const part of ["drill:0", "drill:2", "drill:3", "written"]) act(() => releases[part]!());
    await waitFor(() => expect(text("complete")).toBe("true"));
    expect(text("drills")).toBe("1111");
    expect(text("written")).toBe("true");
  });

  it("keeps the local copy for the finished-lesson path only once the lesson is complete", async () => {
    server.getCurriculumLesson
      .mockResolvedValueOnce(partial([]))
      .mockResolvedValue({ ok: true, complete: true, lesson: whole, cached: false });
    let finishDrill!: () => void;
    server.getLessonPart.mockImplementation(({ data }: { data: { part: string } }) => {
      if (data.part !== "drill:0") {
        const slot = slotOf(data.part);
        return Promise.resolve(partial(slot === null ? [] : [slot], data.part === "written"));
      }
      return new Promise((resolve) => (finishDrill = () => resolve(partial([0]))));
    });

    render(<Probe />);
    await waitFor(() => expect(text("drills")).toBe("0111"));
    expect(localStorage.getItem("lamppost-courses-v1") ?? "").not.toContain("The card.");

    act(() => finishDrill());
    await waitFor(() => expect(text("complete")).toBe("true"));
    expect(localStorage.getItem("lamppost-courses-v1")).toContain("The card.");
  });

  it("opens a cached lesson whole, in one request", async () => {
    server.getCurriculumLesson.mockResolvedValue({
      ok: true,
      complete: true,
      lesson: whole,
      cached: true,
    });
    render(<Probe />);
    await waitFor(() => expect(text("complete")).toBe("true"));
    expect(server.getLessonPart).not.toHaveBeenCalled();
    expect(text("drills")).toBe("1111");
  });

  it("shows the reason, not a blank, when the lesson can't be opened at all, and can retry", async () => {
    server.getCurriculumLesson
      .mockResolvedValueOnce({
        ok: false,
        limited: true,
        reason: "Lesson preparation is busy. Try again in about 5 minutes.",
        retryAfterSeconds: 300,
      })
      .mockResolvedValue({ ok: true, complete: true, lesson: whole, cached: true });
    render(<Probe />);
    await waitFor(() => expect(text("error")).toMatch(/about 5 minutes/));
    expect(text("ready")).toBe("false");

    await act(async () => screen.getByText("retry").click());
    await waitFor(() => expect(text("complete")).toBe("true"));
    expect(text("error")).toBe("");
  });

  it("serves a finished lesson from the device by whether that lesson is done, not its position", async () => {
    expect(index).toBeGreaterThan(0);
    const stored = { ...whole, title: meta.title, concept: { title: "Idea", body: "My copy." } };
    const course = ensureCurriculumCourse();
    saveCourse({
      ...course,
      lessons: course.lessons.map((lesson, i) => (i === index ? stored : lesson)),
    });
    server.getCurriculumLesson.mockResolvedValue({
      ok: true,
      complete: true,
      lesson: whole,
      cached: true,
    });

    render(<Probe finished />);
    await waitFor(() => expect(text("card")).toBe("My copy."));
    expect(server.getCurriculumLesson).not.toHaveBeenCalled();
    cleanup();

    // Not finished (even though earlier lessons may be): the current shared version.
    render(<Probe />);
    await waitFor(() => expect(text("card")).toBe("The card."));
    expect(server.getCurriculumLesson).toHaveBeenCalledTimes(1);
  });

  it("a retry keeps the drills that had already arrived", async () => {
    server.getCurriculumLesson.mockResolvedValue(partial([]));
    server.getLessonPart.mockImplementation(({ data }: { data: { part: string } }) => {
      if (data.part === "drill:0") return Promise.resolve(partial([0]));
      return Promise.resolve({ ok: false, limited: true, reason: "Busy.", retryAfterSeconds: 60 });
    });
    render(<Probe />);
    await waitFor(() => expect(text("notice")).toBe("Busy."));
    expect(text("drills")).toBe("1000");

    await act(async () => screen.getByText("retry").click());
    expect(text("drills")).toBe("1000");
    expect(text("ready")).toBe("true");
    await waitFor(() => expect(text("notice")).toBe("Busy."));
    // Drill 0 was not asked for a second time.
    const asked = server.getLessonPart.mock.calls.map((c) => c[0].data.part);
    expect(asked.filter((part: string) => part === "drill:0")).toHaveLength(1);
  });
});
