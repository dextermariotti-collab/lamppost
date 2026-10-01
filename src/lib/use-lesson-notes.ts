import { useEffect, useState } from "react";
import { loadLessonNotes, loadUnitNotes } from "@/content/notes";
import type { LessonNotes } from "./lesson-notes";

export type NotesState = { status: "loading" } | { status: "ready"; notes: LessonNotes | null };

/** Loads one lesson's notes. `notes: null` means it has none (or they failed validation). */
export function useLessonNotes(
  unitId: string | undefined,
  lessonId: string | undefined,
): NotesState {
  const [state, setState] = useState<{ key: string; notes: LessonNotes | null } | null>(null);
  const key = `${unitId}/${lessonId}`;

  useEffect(() => {
    if (!unitId || !lessonId) return;
    let cancelled = false;
    void loadLessonNotes(unitId, lessonId).then((notes) => {
      if (!cancelled) setState({ key, notes });
    });
    return () => {
      cancelled = true;
    };
  }, [unitId, lessonId, key]);

  if (!unitId || !lessonId) return { status: "ready", notes: null };
  return state?.key === key ? { status: "ready", notes: state.notes } : { status: "loading" };
}

/** Every unit's notes, for the notes library. `null` until they have loaded. */
export function useAllNotes(unitIds: readonly string[]): Record<string, LessonNotes> | null {
  const [all, setAll] = useState<Record<string, LessonNotes> | null>(null);
  const key = unitIds.join(",");

  useEffect(() => {
    let cancelled = false;
    void Promise.all(key.split(",").map((id) => loadUnitNotes(id))).then((units) => {
      if (!cancelled) setAll(Object.assign({}, ...units));
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return all;
}
