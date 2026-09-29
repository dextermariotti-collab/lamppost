import { describe, expect, it, vi } from "vitest";
import type { Lesson } from "./courses";
import type { LessonContentResult } from "./curriculum.functions";
import type { Exercise, ExerciseKind, WrittenPrompt } from "./exercises";
import { loadLesson, type LoaderState } from "./lesson-loader";
import { slotOf, type PartName } from "./lesson-parts";

const plan: ExerciseKind[] = ["claim", "flaw", "assumption", "judge"];
const drill = (slot: number) => ({ kind: plan[slot]!, id: slot }) as unknown as Exercise;
const written: WrittenPrompt = { type: "critique", prompt: "p", passage: "q" };
const card: Lesson = {
  title: "T",
  subtitle: "S",
  emoji: "x",
  concept: { title: "Idea", body: "A card." },
};
const whole: Lesson = {
  ...card,
  exercises: plan.map((_, i) => drill(i)),
  written,
  contentVersion: 7,
};

const inProgress = (
  have: number[] = [],
  hasWritten = false,
): Extract<LessonContentResult, { complete: false }> => ({
  ok: true,
  complete: false,
  lesson: card,
  drills: plan.map((_, i) => (have.includes(i) ? drill(i) : null)),
  written: hasWritten ? written : null,
});
const complete: LessonContentResult = { ok: true, complete: true, lesson: whole, cached: false };
const pending: LessonContentResult = { ok: false, pending: true, reason: "soon" };
const limited: LessonContentResult = {
  ok: false,
  limited: true,
  reason: "Come back in about 10 minutes.",
  retryAfterSeconds: 600,
};
const failure: LessonContentResult = { ok: false, reason: "nope" };

function run(server: {
  lesson: () => Promise<LessonContentResult> | LessonContentResult;
  part?: (part: PartName) => Promise<LessonContentResult> | LessonContentResult;
}) {
  const states: LoaderState[] = [];
  const asked: PartName[] = [];
  const sleeps: number[] = [];
  let cancelled = false;
  const promise = loadLesson(plan, {
    fetchLesson: async () => server.lesson(),
    fetchPart: async (part) => {
      asked.push(part);
      return server.part!(part);
    },
    onChange: (state) => states.push(state),
    isCancelled: () => cancelled,
    sleep: async (ms) => void sleeps.push(ms),
    pollMs: 2000,
    maxWaitMs: 10_000,
    retryMs: [10, 20, 30],
  });
  return {
    promise,
    states,
    asked,
    sleeps,
    last: () => states.at(-1)!,
    cancel: () => (cancelled = true),
  };
}

describe("a lesson that is cached", () => {
  it("arrives whole in one request and asks for nothing else", async () => {
    const r = run({ lesson: () => complete });
    await r.promise;
    expect(r.asked).toEqual([]);
    expect(r.last()).toMatchObject({ complete: true, error: null, notice: null });
    expect(r.last().drills).toHaveLength(plan.length);
    expect(r.last().written).toEqual(written);
  });
});

describe("a lesson that is written in parts", () => {
  it("shows the idea card before it has asked for a single drill", async () => {
    let cardShown = false;
    const r = run({
      lesson: () => inProgress(),
      part: () => {
        // By the time any drill is requested the card has already been handed over.
        cardShown = r.states.some((s) => s.lesson?.concept?.body === "A card.");
        return inProgress([0, 1, 2, 3], true);
      },
    });
    await r.promise;
    expect(cardShown).toBe(true);
    expect(r.states[0]).toMatchObject({ complete: false, error: null });
    expect(r.states[0]!.drills.every((d) => d === null)).toBe(true);
  });

  it("asks for every drill and the written task at once", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const r = run({
      lesson: () => inProgress(),
      part: async (part) => {
        await gate;
        const slot = slotOf(part);
        return inProgress(slot === null ? [] : [slot], part === "written");
      },
    });
    await vi.waitFor(() => expect(r.asked).toHaveLength(plan.length + 1));
    expect([...r.asked].sort()).toEqual(
      ["drill:0", "drill:1", "drill:2", "drill:3", "written"].sort(),
    );
    release();
    await r.promise;
  });

  it("hands each drill over as it lands, in whatever order they finish", async () => {
    const finish: Record<string, () => void> = {};
    const r = run({
      lesson: () => inProgress(),
      part: (part) =>
        new Promise<LessonContentResult>((resolve) => {
          finish[part] = () => {
            const slot = slotOf(part);
            resolve(inProgress(slot === null ? [] : [slot], part === "written"));
          };
        }),
    });
    await vi.waitFor(() => expect(Object.keys(finish)).toHaveLength(plan.length + 1));

    finish["drill:2"]!();
    await vi.waitFor(() => expect(r.last().drills[2]).not.toBeNull());
    expect(r.last().drills.map((d) => d !== null)).toEqual([false, false, true, false]);
    expect(r.last().complete).toBe(false);

    finish["drill:0"]!();
    await vi.waitFor(() => expect(r.last().drills[0]).not.toBeNull());
    expect(r.last().drills.map((d) => d !== null)).toEqual([true, false, true, false]);

    finish["written"]!();
    await vi.waitFor(() => expect(r.last().written).not.toBeNull());
    finish["drill:1"]!();
    finish["drill:3"]!();
    await r.promise;
  });

  it("ends on the assembled lesson from the cache", async () => {
    let calls = 0;
    const r = run({
      lesson: () => (calls++ === 0 ? inProgress() : complete),
      part: (part) => inProgress(slotOf(part) === null ? [] : [slotOf(part)!], part === "written"),
    });
    await r.promise;
    expect(calls).toBe(2);
    expect(r.last()).toMatchObject({ complete: true, lesson: whole });
  });

  it("keeps a usable lesson if the final read of the cache fails", async () => {
    let calls = 0;
    const r = run({
      lesson: () => {
        if (calls++ === 0) return inProgress();
        throw new Error("network");
      },
      part: (part) => inProgress(slotOf(part) === null ? [] : [slotOf(part)!], part === "written"),
    });
    await r.promise;
    expect(r.last().complete).toBe(false);
    expect(r.last().drills.every((d) => d !== null)).toBe(true);
    expect(r.last().error).toBeNull();
  });

  it("takes the finished lesson the moment the server says the last part completed it", async () => {
    const r = run({
      lesson: () => inProgress(),
      part: (part) => (part === "written" ? complete : inProgress([])),
    });
    await r.promise;
    expect(r.last()).toMatchObject({ complete: true });
    // Slower parts that answer afterwards can't move it back to "in progress".
    expect(r.states.filter((s) => s.complete).length).toBeGreaterThan(0);
    expect(r.states.slice(r.states.findIndex((s) => s.complete)).every((s) => s.complete)).toBe(
      true,
    );
  });

  it("starts from drills another learner's request has already written", async () => {
    const r = run({
      lesson: () => inProgress([0, 1], true),
      part: () => inProgress([0, 1, 2, 3], true),
    });
    await r.promise;
    expect(r.asked.sort()).toEqual(["drill:2", "drill:3"]);
  });
});

describe("when the server is slow, busy or refusing", () => {
  it("waits quietly while another request writes a part, then picks it up", async () => {
    const answers = [pending, pending, inProgress([1])];
    const r = run({
      lesson: () => inProgress([0, 2, 3], true),
      part: () => answers.shift()!,
    });
    await r.promise;
    expect(r.sleeps).toEqual([2000, 2000]);
    expect(r.last().drills[1]).not.toBeNull();
    expect(r.last().notice).toBeNull();
    expect(r.last().failed).toEqual([]);
  });

  it("says it is taking a while, without failing the lesson, if a part never arrives", async () => {
    const r = run({ lesson: () => inProgress([0, 2, 3], true), part: () => pending });
    await r.promise;
    expect(r.last()).toMatchObject({ failed: ["drill:1"], error: null });
    expect(r.last().notice).toMatch(/longer than usual/i);
    expect(r.last().lesson?.concept?.body).toBe("A card.");
  });

  it("retries a failed part a few times, then stops", async () => {
    const r = run({ lesson: () => inProgress([0, 2, 3], true), part: () => failure });
    await r.promise;
    expect(r.asked).toEqual(["drill:1", "drill:1", "drill:1", "drill:1"]);
    expect(r.sleeps).toEqual([10, 20, 30]);
    expect(r.last().failed).toEqual(["drill:1"]);
  });

  it("recovers when a retry succeeds", async () => {
    const answers = [failure, inProgress([1])];
    const r = run({ lesson: () => inProgress([0, 2, 3], true), part: () => answers.shift()! });
    await r.promise;
    expect(r.last().failed).toEqual([]);
    expect(r.last().drills[1]).not.toBeNull();
  });

  it("stops asking for a part when a limit is reached, and says when to come back", async () => {
    const r = run({ lesson: () => inProgress(), part: () => limited });
    await r.promise;
    expect(r.asked).toHaveLength(plan.length + 1);
    expect(r.sleeps).toEqual([]);
    expect(r.last().notice).toBe("Come back in about 10 minutes.");
    // The idea card is still there to read.
    expect(r.last().lesson?.concept?.body).toBe("A card.");
    expect(r.last().error).toBeNull();
  });

  it("reports a lesson that can't be opened at all, with the reason", async () => {
    const r = run({ lesson: () => limited });
    await r.promise;
    expect(r.asked).toEqual([]);
    expect(r.last()).toMatchObject({ error: "Come back in about 10 minutes.", lesson: null });
  });

  it("gives up on an idea card that never appears instead of waiting forever", async () => {
    const r = run({ lesson: () => pending });
    await r.promise;
    expect(r.last().error).toMatch(/longer than usual/i);
    expect(r.asked).toEqual([]);
  });

  it("treats a reply that isn't a result at all like any other failure", async () => {
    let calls = 0;
    const r = run({
      lesson: () => (calls++ === 0 ? (undefined as unknown as LessonContentResult) : complete),
    });
    await r.promise;
    expect(r.last().complete).toBe(true);
  });

  it("treats a thrown network error like any other failure", async () => {
    let calls = 0;
    const r = run({
      lesson: () => {
        if (calls++ < 2) throw new Error("offline");
        return complete;
      },
    });
    await r.promise;
    expect(r.last().complete).toBe(true);
  });
});

describe("leaving the lesson", () => {
  it("stops reporting once cancelled", async () => {
    let seenAtCancel = -1;
    const r: ReturnType<typeof run> = run({
      lesson: () => inProgress(),
      part: () => {
        if (seenAtCancel < 0) {
          seenAtCancel = r.states.length;
          r.cancel();
        }
        return inProgress([0, 1, 2, 3], true);
      },
    });
    await r.promise;
    expect(seenAtCancel).toBeGreaterThan(0);
    expect(r.states).toHaveLength(seenAtCancel);
  });
});
