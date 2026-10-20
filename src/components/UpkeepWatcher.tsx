import { useEffect } from "react";
import { useProgress } from "@/lib/progress";
import { enrolFinishedUnits } from "@/lib/review-drills";

/**
 * Puts each finished unit on the 30/60/120-day review schedule, including units finished before
 * the schedule existed. Lessons the placement check marked as known weren't studied, so they
 * wait until they are.
 */
export function UpkeepWatcher() {
  const { state, doneLessons, hydrated } = useProgress();
  const placed = state.placedLessonIds;
  useEffect(() => {
    if (hydrated) enrolFinishedUnits(doneLessons, new Set(placed));
  }, [hydrated, doneLessons, placed]);
  return null;
}
