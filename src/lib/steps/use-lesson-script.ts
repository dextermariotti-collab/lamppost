import { useEffect, useState } from "react";
import { loadLessonScript } from "@/content/lessons";
import type { LessonScript } from "./types";

export type ScriptState =
  { status: "loading" } | { status: "ready"; script: LessonScript } | { status: "unavailable" };

/**
 * Loads a lesson's authored steps (one unit's file, on demand). "Unavailable" means there is no
 * script for it, or it failed validation, and the lesson screen uses the generated version.
 */
export function useLessonScript(
  unitId: string | undefined,
  lessonId: string | undefined,
): ScriptState {
  const [state, setState] = useState<{ key: string; value: ScriptState } | null>(null);
  const key = `${unitId}/${lessonId}`;

  useEffect(() => {
    if (!unitId || !lessonId) return;
    let canceled = false;
    void loadLessonScript(unitId, lessonId).then((result) => {
      if (canceled) return;
      if (!result.ok && result.reason === "invalid") {
        console.error(`Lesson ${lessonId} failed validation`, result.problems);
      }
      setState({
        key,
        value: result.ok ? { status: "ready", script: result.script } : { status: "unavailable" },
      });
    });
    return () => {
      canceled = true;
    };
  }, [unitId, lessonId, key]);

  if (!unitId || !lessonId) return { status: "unavailable" };
  return state?.key === key ? state.value : { status: "loading" };
}
