import { useEffect, useState } from "react";
import { LESSONS, UNITS } from "./curriculum";
import { ATTEMPTS_EVENT, readAttemptStore } from "./exercise-store";
import type { RubricCriterion } from "./exercises";

/**
 * Real analytics for the progress screen. Every number here comes from drills the
 * learner actually answered — nothing is seeded or estimated, and each view has
 * an explicit "not enough data yet" state instead of a fake chart.
 */

const WRITTEN_KEY = "lamppost-written-v1";
export const WRITTEN_EVENT = "lamppost-written-change";

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
  /**
   * The average confidence actually stated by the answers in the band, 0..100. A band without it
   * (built before it existed) is read at its mid-point.
   */
  said?: number;
  /** Share actually correct in that band, 0..100. */
  actual: number;
  count: number;
};

export type WrittenScore = {
  lessonId: string;
  total: number;
  max: number;
  at: number;
  /** Per-criterion 1-4 scores, so the next task can target the weakest one. */
  scores?: Partial<Record<RubricCriterion, number>>;
};

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
    const confidence =
      answer && typeof answer.confidence === "number" && Number.isFinite(answer.confidence)
        ? Math.min(Math.max(answer.confidence, 0), 100)
        : null;
    return confidence === null ? [] : [{ confidence, correct: attempt.score >= 1 }];
  });

  const bands = BANDS.flatMap((band) => {
    // Bands meet at whole numbers; a fractional confidence belongs to the band it rounds into.
    const inBand = rows.filter(
      (r) => Math.round(r.confidence) >= band.min && Math.round(r.confidence) <= band.max,
    );
    if (inBand.length === 0) return [];
    return [
      {
        label: band.label,
        stated: band.stated,
        said: inBand.reduce((sum, r) => sum + r.confidence, 0) / inBand.length,
        actual: Math.round((inBand.filter((r) => r.correct).length / inBand.length) * 100),
        count: inBand.length,
      },
    ];
  });

  return { bands, answered: rows.length };
}

/* --------------------------- written responses --------------------------- */

export function readWritten(): WrittenScore[] {
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
export function recordWrittenScore(
  lessonId: string,
  total: number,
  max: number,
  scores?: Partial<Record<RubricCriterion, number>>,
) {
  if (typeof window === "undefined") return;
  try {
    const entry: WrittenScore = {
      lessonId,
      total,
      max,
      at: Date.now(),
      ...(scores ? { scores } : {}),
    };
    writeWritten([...readWritten(), entry].slice(-40));
  } catch {
    /* ignore */
  }
}

/** Replaces the written scores: used when the account's copy is merged in. */
export function writeWritten(scores: WrittenScore[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WRITTEN_KEY, JSON.stringify(scores));
    window.dispatchEvent(new Event(WRITTEN_EVENT));
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

/**
 * The rubric criterion the learner scores worst on across their graded written
 * answers, so the next written task can name one thing to focus on.
 */
export function weakestCriterion(
  among: readonly RubricCriterion[],
): { criterion: RubricCriterion; average: number } | null {
  const tally = new Map<RubricCriterion, { sum: number; count: number }>();
  for (const entry of readWritten()) {
    for (const [criterion, score] of Object.entries(entry.scores ?? {})) {
      if (!among.includes(criterion as RubricCriterion)) continue;
      const row = tally.get(criterion as RubricCriterion) ?? { sum: 0, count: 0 };
      row.sum += typeof score === "number" ? score : 0;
      row.count += 1;
      tally.set(criterion as RubricCriterion, row);
    }
  }
  const rows = [...tally.entries()]
    .filter(([, row]) => row.count > 0)
    .map(([criterion, row]) => ({ criterion, average: row.sum / row.count }))
    .sort((a, b) => a.average - b.average);
  const worst = rows[0];
  return worst && worst.average < 3.5 ? worst : null;
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
    window.addEventListener(WRITTEN_EVENT, sync);
    window.addEventListener(ATTEMPTS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WRITTEN_EVENT, sync);
      window.removeEventListener(ATTEMPTS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return data;
}
