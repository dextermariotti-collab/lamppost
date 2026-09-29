import { LESSONS, type CurriculumLesson } from "./curriculum";
import type { Lesson } from "./courses";
import type { Exercise, WrittenPrompt } from "./exercises";
import { exercisesMatchPlan } from "./drill-plan";
import { domainsFor } from "./domains";
import { composeLesson, type ConceptPart } from "./exercise-ai.server";
import { drillPart, slotOf, type LessonInProgress, type PartName } from "./lesson-parts";

/**
 * Writing a lesson that isn't cached yet, one part at a time (see lesson-parts.ts).
 *
 * Every step here is small and idempotent: a part that already exists is returned
 * as it is, a missing one is written and stored, and whichever request stores the
 * last part assembles the finished lesson into the cache the app serves from. The
 * pieces the outside world provides — where parts are kept, how each is written,
 * where the finished lesson goes — are passed in, so the flow is tested without a
 * database or a model.
 */

export type PartStore = {
  /** Parts stored for the current content version, by name. */
  read(lessonId: string): Promise<Record<string, unknown>>;
  write(lessonId: string, part: PartName, content: unknown): Promise<void>;
  /**
   * Stores `content` unless the part already exists, and returns what is stored
   * either way. Used for the idea card, which every other part is written against:
   * two requests that both write one must end up agreeing on a single card.
   */
  writeOnce(lessonId: string, part: PartName, content: unknown): Promise<unknown>;
  clear(lessonId: string): Promise<void>;
};

export type PartWriters = {
  concept(meta: CurriculumLesson): Promise<ConceptPart | null>;
  drill(meta: CurriculumLesson, slot: number, conceptBody: string): Promise<Exercise | null>;
  written(meta: CurriculumLesson, conceptBody: string): Promise<WrittenPrompt | null>;
};

export type PartsDeps = {
  store: PartStore;
  write: PartWriters;
  /** Content version stamped on the finished lesson. */
  version: number;
  /** Puts the finished lesson where lessons are served from (and seeds the drill pool). */
  publish(meta: CurriculumLesson, lesson: Lesson, domains: string[]): Promise<void>;
  lock: {
    acquire(key: string, ttlSeconds: number): Promise<boolean>;
    release(key: string): Promise<void>;
  };
};

export type Snapshot = {
  concept: ConceptPart | null;
  drills: (Exercise | null)[];
  written: WrittenPrompt | null;
};

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const asConcept = (value: unknown): ConceptPart | null => {
  const raw = value as Partial<ConceptPart> | null;
  if (!raw || typeof raw !== "object" || !raw.concept || !isText(raw.concept.body)) return null;
  return {
    concept: raw.concept,
    summary: Array.isArray(raw.summary) ? raw.summary.filter(isText) : [],
  };
};

const asWritten = (value: unknown): WrittenPrompt | null => {
  const raw = value as Partial<WrittenPrompt> | null;
  return raw && typeof raw === "object" && isText(raw.prompt) && isText(raw.passage)
    ? (raw as WrittenPrompt)
    : null;
};

/** Whatever has been stored for this lesson so far, checked against its plan. */
export async function readSnapshot(meta: CurriculumLesson, store: PartStore): Promise<Snapshot> {
  const stored = await store.read(meta.id);
  return {
    concept: asConcept(stored["concept"]),
    drills: meta.drills.map((kind, slot) => {
      const drill = stored[drillPart(slot)] as Exercise | undefined;
      return drill && typeof drill === "object" && drill.kind === kind ? drill : null;
    }),
    written: asWritten(stored["written"]),
  };
}

/** What the browser is told about a lesson that isn't finished: the idea card and what's ready. */
export function inProgress(meta: CurriculumLesson, snapshot: Snapshot): LessonInProgress | null {
  if (!snapshot.concept) return null;
  const { concept, summary } = snapshot.concept;
  return {
    ok: true,
    complete: false,
    lesson: {
      title: meta.title,
      subtitle: meta.objective,
      emoji: meta.emoji,
      concept,
      ...(summary.length ? { keyPoints: summary } : {}),
      intro: concept.body,
      parts: [{ title: concept.title, body: concept.body }],
    },
    drills: snapshot.drills,
    written: snapshot.written,
  };
}

/** The finished lesson, or null while any part is still missing. */
export function assemble(
  meta: CurriculumLesson,
  snapshot: Snapshot,
  version: number,
): Lesson | null {
  const { concept, drills, written } = snapshot;
  if (!concept || !written || drills.some((drill) => drill === null)) return null;
  const exercises = drills as Exercise[];
  if (!exercisesMatchPlan(exercises, meta.drills)) return null;
  return {
    ...composeLesson(meta, {
      concept: concept.concept,
      exercises,
      written,
      summary: concept.summary,
    }),
    contentVersion: version,
  };
}

/**
 * A different setting for each drill of a lesson, the same every time it is asked:
 * the parts are written by separate requests, which must not all pick the same one.
 */
export function domainForSlot(lessonId: string, slot: number): string {
  const domains = domainsFor(null);
  let hash = 0;
  for (const char of lessonId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return domains[(hash + slot) % domains.length]!;
}

const has = (snapshot: Snapshot, part: PartName): boolean => {
  if (part === "concept") return snapshot.concept !== null;
  if (part === "written") return snapshot.written !== null;
  const slot = slotOf(part);
  return slot !== null && snapshot.drills[slot] != null;
};

export type EnsureResult =
  | { status: "have" | "made"; snapshot: Snapshot; assembled: Lesson | null }
  | { status: "failed"; snapshot: Snapshot };

/**
 * Makes sure one part exists, writing it if it doesn't. Call it under a lease and
 * a rate limit (see guardedGeneration): reading a part that is already there costs
 * nothing, writing one costs model calls.
 */
export async function ensurePart(
  meta: CurriculumLesson,
  part: PartName,
  deps: PartsDeps,
): Promise<EnsureResult> {
  const slot = slotOf(part);
  let snapshot = await readSnapshot(meta, deps.store);
  if (slot !== null && slot >= meta.drills.length) return { status: "failed", snapshot };
  if (has(snapshot, part)) return { status: "have", snapshot, assembled: null };

  // Drills and the written task are written against the idea card, so it comes first.
  if (!snapshot.concept) {
    const concept = await deps.write.concept(meta);
    if (!concept) return { status: "failed", snapshot };
    const stored = asConcept(await deps.store.writeOnce(meta.id, "concept", concept));
    if (!stored) return { status: "failed", snapshot };
    snapshot = { ...snapshot, concept: stored };
  }

  if (!has(snapshot, part)) {
    const body = snapshot.concept!.concept.body;
    if (part === "written") {
      const written = await deps.write.written(meta, body);
      if (!written) return { status: "failed", snapshot };
      await deps.store.write(meta.id, part, written);
      snapshot = { ...snapshot, written };
    } else if (slot !== null) {
      const drill = await deps.write.drill(meta, slot, body);
      if (!drill || drill.kind !== meta.drills[slot]) return { status: "failed", snapshot };
      await deps.store.write(meta.id, part, drill);
      snapshot = { ...snapshot, drills: snapshot.drills.map((d, i) => (i === slot ? drill : d)) };
    }
  }

  const assembled = await assembleIfComplete(meta, deps);
  return { status: "made", snapshot, assembled };
}

/**
 * If every part is in, writes the finished lesson to the cache and clears the
 * parts. The lease keeps two requests that finish together from publishing twice.
 */
export async function assembleIfComplete(
  meta: CurriculumLesson,
  deps: PartsDeps,
): Promise<Lesson | null> {
  const snapshot = await readSnapshot(meta, deps.store);
  const lesson = assemble(meta, snapshot, deps.version);
  if (!lesson) return null;

  const key = `assemble:${meta.id}`;
  if (!(await deps.lock.acquire(key, 60))) return lesson;
  try {
    const domains = meta.drills.map((_, slot) => domainForSlot(meta.id, slot));
    await deps.publish(meta, lesson, domains);
    await deps.store.clear(meta.id);
  } finally {
    await deps.lock.release(key);
  }
  return lesson;
}

export const lessonMeta = (lessonId: string): CurriculumLesson | undefined =>
  LESSONS.find((lesson) => lesson.id === lessonId);

/* ------------------------------ the real thing ------------------------------ */

const PART_TTL_DAYS = 2;

/**
 * Parts kept in Postgres, models from the AI gateway, lessons published to the
 * cache the app serves from. Everything is loaded on demand so importing this
 * module (as the tests do) pulls in neither the database nor the model SDK.
 */
export async function livePartsDeps(): Promise<PartsDeps> {
  const generate = await import("./curriculum-generate.server");
  const { limiter } = await import("./rate-limit.server");
  const version = generate.CONTENT_VERSION;

  const ask = async (system: string, prompt: string): Promise<string> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI isn't configured");
    const { streamText } = await import("ai");
    const { withGuardrails } = await import("./ai-guardrails.server");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    return await streamText({
      model: gateway(generate.MODEL),
      system: withGuardrails(system),
      prompt,
      maxRetries: 2,
    }).text;
  };

  return {
    version,
    store: {
      async read(lessonId) {
        const db = await generate.admin();
        const { data } = await db
          .from("lesson_parts")
          .select("part, content")
          .eq("lesson_id", lessonId)
          .eq("content_version", version);
        return Object.fromEntries((data ?? []).map((row) => [row.part, row.content]));
      },
      async write(lessonId, part, content) {
        const db = await generate.admin();
        const { error } = await db.from("lesson_parts").upsert(
          {
            lesson_id: lessonId,
            part,
            content_version: version,
            content: JSON.parse(JSON.stringify(content)),
          },
          { onConflict: "lesson_id,part" },
        );
        if (error) throw new Error(error.message);
        // Leftovers of lessons nobody finished, cleared as a side effect of writing.
        if (Math.random() < 0.05) {
          const cutoff = new Date(Date.now() - PART_TTL_DAYS * 86_400_000).toISOString();
          await db.from("lesson_parts").delete().lt("created_at", cutoff);
        }
      },
      async writeOnce(lessonId, part, content) {
        const db = await generate.admin();
        const { error } = await db.from("lesson_parts").upsert(
          {
            lesson_id: lessonId,
            part,
            content_version: version,
            content: JSON.parse(JSON.stringify(content)),
          },
          { onConflict: "lesson_id,part", ignoreDuplicates: true },
        );
        if (error) throw new Error(error.message);
        const { data } = await db
          .from("lesson_parts")
          .select("content")
          .eq("lesson_id", lessonId)
          .eq("part", part)
          .eq("content_version", version)
          .maybeSingle();
        return data?.content ?? content;
      },
      async clear(lessonId) {
        const db = await generate.admin();
        await db.from("lesson_parts").delete().eq("lesson_id", lessonId);
      },
    },
    write: {
      async concept(meta) {
        const { screenOutput } = await import("./moderation.server");
        const { conceptSystemPrompt, conceptPrompt, parseConcept } =
          await import("./exercise-ai.server");
        for (let attempt = 0; attempt < 2; attempt++) {
          const text = await ask(conceptSystemPrompt(), conceptPrompt(meta));
          if (!screenOutput(text).allowed) continue;
          const parsed = parseConcept(text, meta.title);
          if (parsed) return parsed;
        }
        return null;
      },
      async drill(meta, slot, conceptBody) {
        return await generate.generateValidatedDrill(meta, meta.drills[slot]!, {
          difficulty: 2,
          domain: domainForSlot(meta.id, slot),
          conceptBody,
        });
      },
      async written(meta) {
        const { screenOutput } = await import("./moderation.server");
        const { writtenSystemPrompt, writtenPrompt, parseWritten } =
          await import("./exercise-ai.server");
        const domain = domainForSlot(meta.id, meta.drills.length);
        for (let attempt = 0; attempt < 2; attempt++) {
          const text = await ask(
            writtenSystemPrompt(meta.written),
            writtenPrompt(meta, { domain }),
          );
          if (!screenOutput(text).allowed) continue;
          const parsed = parseWritten(text, meta.written);
          if (parsed) return parsed;
        }
        return null;
      },
    },
    async publish(meta, lesson, domains) {
      const db = await generate.admin();
      const { UNITS } = await import("./curriculum");
      const unit = UNITS.find((u) => u.id === meta.unitId);
      await db.from("curriculum_lessons").upsert(
        {
          lesson_id: meta.id,
          unit_id: unit?.id ?? meta.unitId,
          title: meta.title,
          content: JSON.parse(JSON.stringify(lesson)),
          model: generate.MODEL,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "lesson_id" },
      );
      await generate
        .seedPoolFromLesson(meta.id, lesson.exercises ?? [], { difficulty: 2, domains })
        .catch(() => undefined);
    },
    lock: {
      acquire: (key, ttl) => limiter().acquireLock(key, ttl),
      release: (key) => limiter().releaseLock(key),
    },
  };
}
