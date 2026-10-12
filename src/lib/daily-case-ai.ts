import { useEffect, useState } from "react";
import { getGeneratedCase } from "./cases.functions";
import { saveGeneratedCase } from "./daily-case";
import { dayKey } from "./days";

/** One request per day per page load, shared by every screen that asks. */
const asked = new Map<string, Promise<boolean>>();

async function fetchCase(day: string): Promise<boolean> {
  for (let tries = 0; tries < 3; tries++) {
    const result = await getGeneratedCase({ data: { day } }).catch(() => null);
    if (result?.ok) return saveGeneratedCase(result.case);
    // Someone else is writing today's case: give it a moment, then read theirs.
    if (result && "retry" in result && result.retry) {
      await new Promise((resolve) => setTimeout(resolve, 8000));
      continue;
    }
    return false;
  }
  return false;
}

/**
 * Once every written case has been read, asks the server for today's AI-written case and keeps
 * it on the device, where `useDailyCase` picks it up. Returns true while that is under way; if it
 * fails, today's case stays the written one read longest ago.
 */
export function useAiCaseTopUp(wanted: boolean): boolean {
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!wanted) return;
    const day = dayKey();
    let live = true;
    setLoading(true);
    const job = asked.get(day) ?? fetchCase(day);
    asked.set(day, job);
    void job.then(() => {
      if (live) setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [wanted]);
  return wanted && loading;
}
