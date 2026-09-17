import { useEffect, useState } from "react";
import { LESSONS, UNITS } from "./curriculum";
import { readAttemptStore } from "./exercise-store";

/**
 * Real analytics for the progress screen. Every number here comes from drills the
 * learner actually answered — nothing is seeded or estimated, and each view has
 * an explicit "not enough data yet" state instead of a fake chart.
 */

const WRITTEN_KEY = "lamppost-written-v1";

export type UnitMastery = {
  unitId: string;
  title: string;
  emoji: string;
  /** 0..1 accuracy across every drill answered in this unit. */
  accuracy: number;
  answered: number;
};

export type CalibrationBand = {
  label: string;
  /** Mid-point of the stated-confidence band, 0..100. */
  stated: number;
  /** Share actually correct in that band, 0..100. */
  actual: number;
  count: number;
};

export type WrittenScore = { lessonId: string; total: number; max: number; at: number };

const unitOf = (lessonId: string) => LESSONS.find((l) => l.id === lessonId)?.unitId;

/** Per-skill mastery from drill accuracy, one row per curriculum unit. */
export function unitMastery(): UnitMastery[] {
  const store = readAttemptStore();
  const tally = new Map<string, { sum: number; count: number }>();
  for (const [key, attempt] of Object.entries(store)) {
    const lessonId = key.split("#")[0];
    const unitId = lessonId ? unitOf(lessonId) : undefined;
    if (!unitId) continue;
    const row = tally.get(unitId) ?? { sum: 0, count: 0 };
    row.sum += Math.min(Math.max(attempt.score, 0), 1);
    row.count += 1;
    tally.set(unitId, row);
  }
  return UNITS.map((unit) => {
    const row = tally.get(unit.id);
    return {
      unitId: unit.id,
      title: unit.title,
      emoji: unit.emoji,
      answered: row?.count ?? 0,
      accuracy: row && row.count > 0 ? row.sum / row.count : 0,
    };
  });
}

const BANDS = [
  { label: "0–40%", min: 0, max: 40, stated: 30 },
  { label: "41–60%", min: 41, max: 60, stated: 50 },
  { label: "61–80%", min: 61, max: 80, stated: 70 },
  { label: "81–100%", min: 81, max: 100, stated: 90 },
];

/**
 * Stated confidence versus real accuracy, from predict-then-reveal answers. A
 * band only appears once there is at least one answer in it.
 */
export function calibration(): { bands: CalibrationBand[]; answered: number } {
  const store = readAttemptStore();
  const rows = Object.values(store).flatMap((attempt) => {
    const answer = attempt.answer as { confidence?: number } | null;
    const confidence = answer && typeof answer.confidence === "number" ? answer.confidence : null;
    return confidence === null ? [] : [{ confidence, correct: attempt.score >= 1 }];
  });

  const bands = BANDS.flatMap((band) => {
    const inBand = rows.filter((r) => r.confidence >= band.min && r.confidence <= band.max);
    if (inBand.length === 0) return [];
    return [
      {
        label: band.label,
        stated: band.stated,
        actual: Math.round((inBand.filter((r) => r.correct).length / inBand.length) * 100),
        count: inBand.length,
      },
    ];
  });

  return { bands, answered: rows.length };
}

/* --------------------------- written responses --------------------------- */

function readWritten(): WrittenScore[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WRITTEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as WrittenScore[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Stores one graded written response so the trend line has real history. */
export function recordWrittenScore(lessonId: string, total: number, max: number) {
  if (typeof window === "undefined") return;
  try {
    const next = [...readWritten(), { lessonId, total, max, at: Date.now() }].slice(-40);
    window.localStorage.setItem(WRITTEN_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("lamppost-written-change"));
  } catch {
    /* ignore */
  }
}

export function writtenTrend(): { points: (WrittenScore & { pct: number })[] } {
  return {
    points: readWritten()
      .sort((a, b) => a.at - b.at)
      .map((score) => ({
        ...score,
        pct: Math.round((score.total / Math.max(score.max, 1)) * 100),
      })),
  };
}

/** All three analytics, refreshed after hydration so SSR stays stable. */
export function useMasteryAnalytics() {
  const [data, setData] = useState<{
    units: UnitMastery[];
    calibration: ReturnType<typeof calibration>;
    written: ReturnType<typeof writtenTrend>;
  } | null>(null);

  useEffect(() => {
    const sync = () =>
      setData({ units: unitMastery(), calibration: calibration(), written: writtenTrend() });
    sync();
    window.addEventListener("lamppost-written-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("lamppost-written-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return data;
}
