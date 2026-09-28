import { beforeEach, describe, expect, it, vi } from "vitest";
import { LESSONS } from "./curriculum";
import type { Exercise, WrittenPrompt } from "./exercises";
import {
  assemble,
  assembleIfComplete,
  domainForSlot,
  ensurePart,
  inProgress,
  readSnapshot,
  type PartsDeps,
  type Snapshot,
} from "./lesson-parts.server";
import { drillPart } from "./lesson-parts";
import type { ConceptPart } from "./exercise-ai.server";

const meta = LESSONS.find((lesson) => lesson.drills.length >= 4)!;

const concept: ConceptPart = {
  concept: {
    title: "The idea",
    body: "A claim is what someone wants you to accept.",
    example: "e.g.",
  },
  summary: ["One", "Two", "Three"],
};
const written: WrittenPrompt = { type: meta.written, prompt: "Write it.", passage: "A passage." };
const drillOf = (kind: (typeof meta.drills)[number]): Exercise =>
  ({ kind, question: `q-${kind}` }) as unknown as Exercise;

function harness(overrides: Partial<PartsDeps["write"]> = {}) {
  const rows = new Map<string, unknown>();
  const published: unknown[] = [];
  const locks = new Set<string>();
  const write = {
    concept: vi.fn(async () => concept),
    drill: vi.fn(async (_m, slot: number) => drillOf(meta.drills[slot]!)),
    written: vi.fn(async () => written),
    ...overrides,
  };
  const deps: PartsDeps = {
    version: 7,
    write,
    store: {
      read: async () => Object.fromEntries(rows),
      write: async (_id, part, content) => void rows.set(part, content),
      writeOnce: async (_id, part, content) => {
        if (!rows.has(part)) rows.set(part, content);
        return rows.get(part);
      },
      clear: async () => rows.clear(),
    },
    publish: async (_m, lesson, domains) => void published.push({ lesson, domains }),
    lock: {
      acquire: async (key) => (locks.has(key) ? false : (locks.add(key), true)),
      release: async (key) => void locks.delete(key),
    },
  };
  return { deps, rows, published, write, locks };
}

beforeEach(() => vi.clearAllMocks());

describe("writing a lesson in parts", () => {
  it("writes the idea card first, on its own, and reports what is ready", async () => {
    const { deps, write } = harness();
    const result = await ensurePart(meta, "concept", deps);
    expect(result.status).toBe("made");
    expect(write.drill).not.toHaveBeenCalled();
    expect(write.written).not.toHaveBeenCalled();

    const progress = inProgress(meta, result.snapshot)!;
    expect(progress).toMatchObject({ ok: true, complete: false });
    expect(progress.lesson.concept?.body).toBe(concept.concept.body);
    expect(progress.lesson.keyPoints).toEqual(concept.summary);
    expect(progress.lesson.exercises).toBeUndefined();
    expect(progress.drills).toEqual(meta.drills.map(() => null));
    expect(progress.written).toBeNull();
  });

  it("has nothing to show until there is an idea card", () => {
    expect(inProgress(meta, { concept: null, drills: [], written: null })).toBeNull();
  });

  it("writes a drill against the idea card that was stored, not one of its own", async () => {
    const { deps, write } = harness();
    await ensurePart(meta, "concept", deps);
    await ensurePart(meta, drillPart(1), deps);
    expect(write.concept).toHaveBeenCalledTimes(1);
    expect(write.drill).toHaveBeenCalledWith(meta, 1, concept.concept.body);
  });

  it("does not write anything again for a part that already exists", async () => {
    const { deps, write } = harness();
    await ensurePart(meta, drillPart(0), deps);
    const again = await ensurePart(meta, drillPart(0), deps);
    expect(again.status).toBe("have");
    expect(write.drill).toHaveBeenCalledTimes(1);
  });

  it("writes the idea card first when a drill is asked for before it exists, once", async () => {
    const { deps, write } = harness();
    await ensurePart(meta, drillPart(0), deps);
    expect(write.concept).toHaveBeenCalledTimes(1);
  });

  it("two requests that both write an idea card end up with one", async () => {
    const { deps, rows } = harness();
    const other: ConceptPart = { concept: { title: "B", body: "A different card." }, summary: [] };
    await deps.store.writeOnce(meta.id, "concept", concept);
    const kept = await deps.store.writeOnce(meta.id, "concept", other);
    expect(kept).toEqual(concept);
    expect(rows.get("concept")).toEqual(concept);
  });

  it("assembles and publishes the lesson when the last part lands, then clears the parts", async () => {
    const { deps, rows, published } = harness();
    await ensurePart(meta, "concept", deps);
    for (let slot = 0; slot < meta.drills.length; slot++)
      await ensurePart(meta, drillPart(slot), deps);
    expect(published).toHaveLength(0);

    const last = await ensurePart(meta, "written", deps);
    expect(last.status === "made" && last.assembled).toBeTruthy();
    expect(published).toHaveLength(1);
    const { lesson, domains } = published[0] as {
      lesson: { exercises: Exercise[]; contentVersion: number; written: unknown; concept: unknown };
      domains: string[];
    };
    expect(lesson.exercises.map((e) => e.kind)).toEqual(meta.drills);
    expect(lesson.contentVersion).toBe(7);
    expect(lesson.written).toEqual(written);
    expect(lesson.concept).toEqual(concept.concept);
    expect(domains).toHaveLength(meta.drills.length);
    expect(rows.size).toBe(0);
  });

  it("publishes once even when the last two parts finish together", async () => {
    const { deps, published } = harness();
    const slow = deps.publish;
    // Publishing takes a moment, so the two requests overlap inside it.
    deps.publish = async (...args) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      await slow(...args);
    };
    await ensurePart(meta, "concept", deps);
    for (let slot = 0; slot < meta.drills.length - 1; slot++) {
      await ensurePart(meta, drillPart(slot), deps);
    }
    await Promise.all([
      ensurePart(meta, drillPart(meta.drills.length - 1), deps),
      ensurePart(meta, "written", deps),
    ]);
    expect(published).toHaveLength(1);
  });

  it("reports a failure when a part can't be written, and stores nothing for it", async () => {
    const { deps, rows } = harness({ drill: vi.fn(async () => null) });
    const result = await ensurePart(meta, drillPart(0), deps);
    expect(result.status).toBe("failed");
    expect(rows.has(drillPart(0))).toBe(false);
    // The idea card that was written along the way is kept.
    expect(rows.has("concept")).toBe(true);
  });

  it("rejects a drill of the wrong type instead of storing it", async () => {
    const wrong = meta.drills[1]!;
    const { deps, rows } = harness({ drill: vi.fn(async () => drillOf(wrong)) });
    const result = await ensurePart(meta, drillPart(0), deps);
    expect(meta.drills[0]).not.toBe(wrong);
    expect(result.status).toBe("failed");
    expect(rows.has(drillPart(0))).toBe(false);
  });

  it("refuses a drill slot the lesson doesn't have", async () => {
    const { deps, write } = harness();
    const result = await ensurePart(meta, drillPart(meta.drills.length), deps);
    expect(result.status).toBe("failed");
    expect(write.concept).not.toHaveBeenCalled();
  });

  it("gives up cleanly when there is no idea card to write drills against", async () => {
    const { deps, write } = harness({ concept: vi.fn(async () => null) });
    expect((await ensurePart(meta, drillPart(0), deps)).status).toBe("failed");
    expect(write.drill).not.toHaveBeenCalled();
  });
});

describe("reading what is stored", () => {
  it("ignores stored parts that don't fit the plan or are malformed", async () => {
    const { deps, rows } = harness();
    rows.set("concept", { concept: { title: "t", body: "  " }, summary: [] });
    rows.set(drillPart(0), { kind: "not-the-planned-kind" });
    rows.set("written", { prompt: "no passage" });
    const snapshot = await readSnapshot(meta, deps.store);
    expect(snapshot).toEqual({ concept: null, drills: meta.drills.map(() => null), written: null });
  });

  it("never assembles a lesson with a part missing or the wrong drills", () => {
    const full: Snapshot = {
      concept,
      drills: meta.drills.map((kind) => drillOf(kind)),
      written,
    };
    expect(assemble(meta, full, 7)).toMatchObject({ contentVersion: 7 });
    expect(assemble(meta, { ...full, written: null }, 7)).toBeNull();
    expect(assemble(meta, { ...full, concept: null }, 7)).toBeNull();
    expect(assemble(meta, { ...full, drills: [...full.drills.slice(0, -1), null] }, 7)).toBeNull();
    expect(assemble(meta, { ...full, drills: [...full.drills].reverse() }, 7)).toBeNull();
  });
});

describe("settings for the drills", () => {
  it("gives every drill of a lesson a different setting, the same way every time", () => {
    const slots = Array.from({ length: 6 }, (_, slot) => domainForSlot(meta.id, slot));
    expect(new Set(slots).size).toBe(6);
    expect(domainForSlot(meta.id, 2)).toBe(slots[2]);
  });
});
