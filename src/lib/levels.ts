import { UNITS } from "./curriculum";
import { unitMastery } from "./mastery";
import { numberOrNull, readJson, recordOf } from "./local-store";

/**
 * Skill levels per curriculum unit, derived from real drill accuracy. A unit
 * needs a minimum number of answered drills before it can level up, so a single
 * lucky drill never awards "Master".
 */

const SEEN_KEY = "lamppost-levels-v1";

export type SkillLevel = {
  name: "Novice" | "Proficient" | "Sharp" | "Master";
  /** Minimum accuracy percentage. */
  min: number;
  /** Drills that must be answered in the unit before this level can be reached. */
  minAnswered: number;
};

const SKILL_LEVELS: SkillLevel[] = [
  { name: "Novice", min: 0, minAnswered: 0 },
  { name: "Proficient", min: 55, minAnswered: 5 },
  { name: "Sharp", min: 72, minAnswered: 10 },
  { name: "Master", min: 88, minAnswered: 16 },
];

export type UnitLevel = {
  unitId: string;
  title: string;
  emoji: string;
  level: SkillLevel;
  /** Index into SKILL_LEVELS. */
  rank: number;
  accuracy: number;
  answered: number;
  next: SkillLevel | null;
};

function levelFor(accuracy: number, answered: number): { level: SkillLevel; rank: number } {
  let rank = 0;
  SKILL_LEVELS.forEach((level, i) => {
    if (accuracy >= level.min && answered >= level.minAnswered) rank = i;
  });
  return { level: SKILL_LEVELS[rank]!, rank };
}

/** Current level for every unit. */
export function unitLevels(): UnitLevel[] {
  const mastery = unitMastery();
  return UNITS.map((unit) => {
    const row = mastery.find((m) => m.unitId === unit.id);
    const accuracy = Math.round((row?.accuracy ?? 0) * 100);
    const answered = row?.answered ?? 0;
    const { level, rank } = levelFor(accuracy, answered);
    return {
      unitId: unit.id,
      title: unit.title,
      emoji: unit.emoji,
      level,
      rank,
      accuracy,
      answered,
      next: SKILL_LEVELS[rank + 1] ?? null,
    };
  });
}

function readSeen(): Record<string, number> {
  return recordOf(readJson(SEEN_KEY), numberOrNull);
}

/**
 * Units whose level has risen since the learner was last shown it. Records the
 * new levels so each level-up card appears exactly once.
 */
export function drainLevelUps(levels: UnitLevel[]): UnitLevel[] {
  if (typeof window === "undefined") return [];
  const seen = readSeen();
  const fresh = levels.filter((row) => row.rank > 0 && row.rank > (seen[row.unitId] ?? 0));
  if (fresh.length === 0) return [];
  const next = { ...seen };
  for (const row of fresh) next[row.unitId] = row.rank;
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return fresh;
}
