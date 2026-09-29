import { lessonScriptSchema, stepProblems, type LessonScript } from "@/lib/steps/types";

/**
 * Lessons are written as data, one file per unit, and loaded only when a learner opens one of
 * that unit's lessons. A unit that has no file yet (or a lesson that fails validation) is
 * simply "not available" here, and the lesson screen falls back to the generated version, so
 * a bad script can never lock a learner out.
 */

type Unit = Record<string, LessonScript>;

const UNITS: Record<string, () => Promise<{ default: Unit }>> = {
  claims: () => import("./claims"),
  evidence: () => import("./evidence"),
  fallacies: () => import("./fallacies"),
};

export const authoredUnits = () => Object.keys(UNITS);

export type LoadedScript =
  | { ok: true; script: LessonScript }
  | { ok: false; reason: "missing" | "invalid"; problems?: string[] };

/** Checks a script the way the tests do, so a broken one is caught at load time too. */
export function validateScript(
  script: unknown,
): { ok: true; script: LessonScript } | { ok: false; problems: string[] } {
  const parsed = lessonScriptSchema.safeParse(script);
  if (!parsed.success) {
    return {
      ok: false,
      problems: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  const problems = parsed.data.steps.flatMap((step) =>
    stepProblems(step).map((p) => `${step.id}: ${p}`),
  );
  return problems.length > 0 ? { ok: false, problems } : { ok: true, script: parsed.data };
}

export async function loadLessonScript(unitId: string, lessonId: string): Promise<LoadedScript> {
  const load = UNITS[unitId];
  if (!load) return { ok: false, reason: "missing" };
  try {
    const unit = (await load()).default;
    const raw = unit[lessonId];
    if (!raw) return { ok: false, reason: "missing" };
    const checked = validateScript(raw);
    return checked.ok ? checked : { ok: false, reason: "invalid", problems: checked.problems };
  } catch (error) {
    console.error("Loading a lesson script failed", error);
    return { ok: false, reason: "missing" };
  }
}
