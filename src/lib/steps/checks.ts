import type {
  ArgumentRole,
  BuilderStep,
  CauseStep,
  FlawStep,
  SortStep,
  UpdaterStep,
} from "./types";

/**
 * The rules behind the interactive steps, kept apart from the components so they can be
 * tested without a screen.
 */

// ---------- Spot the flaw ----------

export type FlawTap =
  { correct: true; fallacy: string } | { correct: false; whyNot: string | null };

/** What tapping phrase number `index` of the passage means. */
export function checkFlawTap(step: FlawStep, index: number): FlawTap | null {
  const phrase = step.passage[index];
  if (!phrase || !phrase.tappable) return null;
  if (phrase.flaw) return { correct: true, fallacy: step.fallacy };
  return { correct: false, whyNot: phrase.whyNot ?? null };
}

// ---------- Argument builder ----------

/** Plain-English meanings, used when a piece is put in the wrong kind of place. */
export const ROLE_MEANING: Record<ArgumentRole, string> = {
  conclusion: "the claim the argument wants you to accept",
  premise: "a reason offered for the conclusion",
  evidence: "something you could check that backs a reason up",
};

export const ROLE_NAME: Record<ArgumentRole, string> = {
  conclusion: "conclusion",
  premise: "premise",
  evidence: "evidence",
};

/** Which piece sits in which slot: slot id -> piece id. */
export type Placement = Record<string, string>;

export type SlotStatus = "empty" | "fits" | "misfit";

export type BuilderState = {
  statuses: Record<string, SlotStatus>;
  /** Every slot holds a piece that fits, so the argument is a sound structure. */
  complete: boolean;
  /** A piece with no role (it supports nothing) was put somewhere. */
  strayPieces: string[];
};

export function checkBuilder(step: BuilderStep, placement: Placement): BuilderState {
  const statuses: Record<string, SlotStatus> = {};
  const strayPieces: string[] = [];
  for (const slot of step.slots) {
    const pieceId = placement[slot.id];
    const piece = step.pieces.find((p) => p.id === pieceId);
    if (!piece) {
      statuses[slot.id] = "empty";
    } else if (piece.role === slot.role) {
      statuses[slot.id] = "fits";
    } else {
      statuses[slot.id] = "misfit";
      if (piece.role === null) strayPieces.push(piece.id);
    }
  }
  const complete = step.slots.every((slot) => statuses[slot.id] === "fits");
  return { statuses, complete, strayPieces };
}

/** Why a piece doesn't belong in a slot, in a sentence, naming what it actually is. */
export function misfitMessage(step: BuilderStep, slotId: string, pieceId: string): string {
  const slot = step.slots.find((s) => s.id === slotId);
  const piece = step.pieces.find((p) => p.id === pieceId);
  if (!slot || !piece) return "That doesn't fit there.";
  if (piece.role === null) {
    return (
      piece.note ?? "That doesn't support the conclusion, so it doesn't belong in the argument."
    );
  }
  const base = `That is ${ROLE_NAME[piece.role]} (${ROLE_MEANING[piece.role]}), not ${ROLE_NAME[slot.role]}.`;
  return piece.note ? `${base} ${piece.note}` : base;
}

/** Where every piece should go, used when the learner asks to be shown. */
export function solveBuilder(step: BuilderStep): Placement {
  const placement: Placement = {};
  const used = new Set<string>();
  for (const slot of step.slots) {
    const piece = step.pieces.find((p) => p.role === slot.role && !used.has(p.id));
    if (piece) {
      placement[slot.id] = piece.id;
      used.add(piece.id);
    }
  }
  return placement;
}

// ---------- Sort it ----------

/** Which item is in which bucket: item id -> bucket id. */
export type Sorting = Record<string, string>;

export type SortResult = {
  /** item id -> whether it is in the right bucket, for the items that were placed. */
  correct: Record<string, boolean>;
  allPlaced: boolean;
  allCorrect: boolean;
};

export function checkSort(step: SortStep, sorting: Sorting): SortResult {
  const correct: Record<string, boolean> = {};
  for (const item of step.items) {
    const placed = sorting[item.id];
    if (placed !== undefined) correct[item.id] = placed === item.bucket;
  }
  const allPlaced = step.items.every((item) => sorting[item.id] !== undefined);
  return { correct, allPlaced, allCorrect: allPlaced && step.items.every((i) => correct[i.id]) };
}

// ---------- Confidence ----------

/** One sentence tying what the learner said to what happened. */
export function calibrationNote(confidence: number, correct: boolean): string {
  if (correct) {
    if (confidence >= 80)
      return `You said ${confidence}% and you were right. That's well calibrated.`;
    if (confidence >= 55)
      return `You said ${confidence}% and you were right. You knew a bit more than you gave yourself credit for.`;
    return `You said ${confidence}% and you were right. Your instinct was better than your confidence.`;
  }
  if (confidence >= 80)
    return `You said ${confidence}% and it was wrong. High confidence with a wrong answer is the gap worth watching.`;
  if (confidence >= 55)
    return `You said ${confidence}% and it was wrong. A little less certainty would have fit better.`;
  return `You said ${confidence}%, so you sensed the doubt. Trusting that would have been right here.`;
}

/** The buckets that calibration is reported in. */
export const confidenceLabel = (value: number) =>
  value >= 90
    ? "almost certain"
    : value >= 70
      ? "fairly sure"
      : value >= 45
        ? "unsure"
        : "doubtful";

// ---------- Evidence updater ----------

export const MIN_PROB = 2;
export const MAX_PROB = 98;
export const clampProbability = (value: number) =>
  Math.min(Math.max(Math.round(value), MIN_PROB), MAX_PROB);

/** The probability after each card, starting from the prior. */
export function probabilityPath(step: Pick<UpdaterStep, "prior" | "cards">): number[] {
  const path = [clampProbability(step.prior)];
  for (const card of step.cards) path.push(clampProbability(path[path.length - 1]! + card.shift));
  return path;
}

export type Direction = "up" | "down" | "same";
export const directionOf = (shift: number): Direction =>
  shift > 0 ? "up" : shift < 0 ? "down" : "same";

/** A word for where the bar sits, so the number isn't the only signal. */
export const likelihoodWord = (percent: number) =>
  percent >= 85
    ? "very likely"
    : percent >= 65
      ? "likely"
      : percent >= 40
        ? "about even"
        : percent >= 15
          ? "unlikely"
          : "very unlikely";

// ---------- Correlation vs causation ----------

/** Least-squares slope of y on x; null when x doesn't vary. */
export function slopeOf(points: readonly (readonly [number, number])[]): number | null {
  const n = points.length;
  if (n < 2) return null;
  const mx = points.reduce((sum, [x]) => sum + x, 0) / n;
  const my = points.reduce((sum, [, y]) => sum + y, 0) / n;
  let num = 0;
  let den = 0;
  for (const [x, y] of points) {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

/** Pearson correlation; null when either variable doesn't vary. */
export function correlationOf(points: readonly (readonly [number, number])[]): number | null {
  const n = points.length;
  if (n < 3) return null;
  const mx = points.reduce((sum, [x]) => sum + x, 0) / n;
  const my = points.reduce((sum, [, y]) => sum + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of points) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? null : sxy / Math.sqrt(sxx * syy);
}

export type CauseView = {
  overall: number | null;
  perGroup: { id: string; label: string; r: number | null }[];
};

export function describeCorrelations(step: Pick<CauseStep, "groups">): CauseView {
  const all = step.groups.flatMap((g) => g.points);
  return {
    overall: correlationOf(all),
    perGroup: step.groups.map((g) => ({ id: g.id, label: g.label, r: correlationOf(g.points) })),
  };
}

/** "strong", "weak" ... so the correlation isn't just a number. */
export function strengthWord(r: number | null): string {
  if (r === null) return "none";
  const a = Math.abs(r);
  const size = a >= 0.7 ? "strong" : a >= 0.4 ? "moderate" : a >= 0.2 ? "weak" : "no real";
  if (size === "no real") return "no real link";
  return `${size} ${r > 0 ? "upward" : "downward"} link`;
}
