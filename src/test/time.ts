/**
 * Timezone helpers for tests. Node re-reads `process.env.TZ` whenever it is
 * assigned, so a test can pretend to be in any zone without a global setup.
 */

export const EASTERN = "America/New_York";

export function withTimeZone<T>(zone: string, run: () => T): T {
  const previous = process.env["TZ"];
  process.env["TZ"] = zone;
  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env["TZ"];
    else process.env["TZ"] = previous;
  }
}

/** 9:30pm Wednesday 23 Sep 2026 in US Eastern (EDT), which is already Sep 24 in UTC. */
export const NINE_THIRTY_PM_EASTERN = new Date("2026-09-24T01:30:00Z");
