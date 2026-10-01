import { lessonNotesSchema, notesProblems, type LessonNotes } from "@/lib/lesson-notes";

/**
 * Lesson notes are written as data, one file per unit, next to the lesson scripts and loaded the
 * same way: only when they are needed. Notes that are missing or fail validation are simply not
 * shown; the lesson still runs without them.
 */

type Unit = Record<string, LessonNotes>;

const UNITS: Record<string, () => Promise<{ default: Unit }>> = {
  claims: () => import("./claims"),
  evidence: () => import("./evidence"),
  fallacies: () => import("./fallacies"),
  biases: () => import("./biases"),
  arguments: () => import("./arguments"),
  probability: () => import("./probability"),
  media: () => import("./media"),
};

export const notedUnits = () => Object.keys(UNITS);

/** Checks notes the way the tests do. */
export function validateNotes(
  notes: unknown,
): { ok: true; notes: LessonNotes } | { ok: false; problems: string[] } {
  const parsed = lessonNotesSchema.safeParse(notes);
  if (!parsed.success) {
    return {
      ok: false,
      problems: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  const problems = notesProblems(parsed.data);
  return problems.length > 0 ? { ok: false, problems } : { ok: true, notes: parsed.data };
}

/** A unit's notes that pass validation, by lesson id. */
export async function loadUnitNotes(unitId: string): Promise<Record<string, LessonNotes>> {
  const load = UNITS[unitId];
  if (!load) return {};
  try {
    const unit = (await load()).default;
    const out: Record<string, LessonNotes> = {};
    for (const [id, raw] of Object.entries(unit)) {
      const checked = validateNotes(raw);
      if (checked.ok && checked.notes.lessonId === id) out[id] = checked.notes;
      else if (!checked.ok) console.error(`Notes for ${id} failed validation`, checked.problems);
    }
    return out;
  } catch (error) {
    console.error("Loading lesson notes failed", error);
    return {};
  }
}

export async function loadLessonNotes(
  unitId: string,
  lessonId: string,
): Promise<LessonNotes | null> {
  return (await loadUnitNotes(unitId))[lessonId] ?? null;
}
