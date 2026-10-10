import { useEffect } from "react";
import { useProgress } from "@/lib/progress";
import { enrolFinishedUnits } from "@/lib/review-drills";

/**
 * Puts each finished unit on the 30/60/120-day review schedule, including units finished before
 * the schedule existed.
 */
export function UpkeepWatcher() {
  const { doneLessons, hydrated } = useProgress();
  useEffect(() => {
    if (hydrated) enrolFinishedUnits(doneLessons);
  }, [hydrated, doneLessons]);
  return null;
}
