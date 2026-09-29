import { describe, expect, it } from "vitest";
import {
  calibrationNote,
  checkBuilder,
  checkFlawTap,
  checkSort,
  clampProbability,
  correlationOf,
  describeCorrelations,
  directionOf,
  likelihoodWord,
  misfitMessage,
  probabilityPath,
  slopeOf,
  solveBuilder,
  strengthWord,
} from "./checks";
import type { BuilderStep, FlawStep, SortStep } from "./types";

const flaw: FlawStep = {
  id: "f",
  kind: "flaw",
  prompt: "Tap the phrase that breaks the argument.",
  why: "why",
  fallacy: "Correlation is not cause",
  passage: [
    { text: "Cities with more ice cream shops" },
    { text: "have more sunburns,", tappable: true, whyNot: "That's just the data." },
    { text: "so ice cream causes sunburn.", tappable: true, flaw: true },
    { text: "Stay indoors", tappable: true },
  ],
};

const builder: BuilderStep = {
  id: "b",
  kind: "builder",
  prompt: "Build it.",
  why: "why",
  slots: [
    { id: "c", role: "conclusion", label: "Conclusion" },
    { id: "p", role: "premise", label: "Reason" },
    { id: "e", role: "evidence", label: "Evidence" },
  ],
  pieces: [
    { id: "pc", text: "The bakery should open earlier.", role: "conclusion" },
    { id: "pp", text: "Most customers arrive before 7.", role: "premise" },
    { id: "pe", text: "Door counts show 60% arrive before 7.", role: "evidence" },
    {
      id: "px",
      text: "The owner likes mornings.",
      role: null,
      note: "Liking mornings isn't a reason.",
    },
  ],
};

const sort: SortStep = {
  id: "s",
  kind: "sort",
  prompt: "Sort.",
  why: "why",
  buckets: [
    { id: "fact", label: "Fact" },
    { id: "opinion", label: "Opinion" },
  ],
  items: [
    { id: "1", text: "The bridge is 40 m long.", bucket: "fact", why: "checkable" },
    { id: "2", text: "The bridge is ugly.", bucket: "opinion", why: "preference" },
    { id: "3", text: "It opened in 1998.", bucket: "fact", why: "checkable" },
  ],
};

describe("spot the flaw", () => {
  it("accepts the flawed phrase and names the mistake", () => {
    expect(checkFlawTap(flaw, 2)).toEqual({ correct: true, fallacy: "Correlation is not cause" });
  });
  it("says why a wrong phrase isn't the flaw, when it can", () => {
    expect(checkFlawTap(flaw, 1)).toEqual({ correct: false, whyNot: "That's just the data." });
    expect(checkFlawTap(flaw, 3)).toEqual({ correct: false, whyNot: null });
  });
  it("ignores plain text that can't be tapped, and positions that don't exist", () => {
    expect(checkFlawTap(flaw, 0)).toBeNull();
    expect(checkFlawTap(flaw, 99)).toBeNull();
  });
});

describe("argument builder", () => {
  it("starts empty and incomplete", () => {
    const state = checkBuilder(builder, {});
    expect(state.complete).toBe(false);
    expect(Object.values(state.statuses)).toEqual(["empty", "empty", "empty"]);
  });

  it("marks each slot as it is filled, live", () => {
    const state = checkBuilder(builder, { c: "pc", p: "pe" });
    expect(state.statuses).toEqual({ c: "fits", p: "misfit", e: "empty" });
    expect(state.complete).toBe(false);
  });

  it("is complete only when every slot holds the right kind of piece", () => {
    expect(checkBuilder(builder, { c: "pc", p: "pp", e: "pe" }).complete).toBe(true);
    expect(checkBuilder(builder, { c: "pc", p: "pp", e: "px" }).complete).toBe(false);
  });

  it("flags a piece that supports nothing", () => {
    expect(checkBuilder(builder, { e: "px" }).strayPieces).toEqual(["px"]);
  });

  it("names what a misplaced piece actually is", () => {
    expect(misfitMessage(builder, "p", "pe")).toMatch(/evidence.*not premise/i);
    expect(misfitMessage(builder, "c", "pp")).toMatch(/premise.*not conclusion/i);
    expect(misfitMessage(builder, "e", "px")).toBe("Liking mornings isn't a reason.");
  });

  it("can solve itself for the show-me case, leaving out what belongs nowhere", () => {
    const solved = solveBuilder(builder);
    expect(solved).toEqual({ c: "pc", p: "pp", e: "pe" });
    expect(checkBuilder(builder, solved).complete).toBe(true);
  });
});

describe("sort it", () => {
  it("reports each placed item and whether everything is placed and right", () => {
    const partial = checkSort(sort, { "1": "fact", "2": "fact" });
    expect(partial.correct).toEqual({ "1": true, "2": false });
    expect(partial.allPlaced).toBe(false);
    expect(partial.allCorrect).toBe(false);
    const wrong = checkSort(sort, { "1": "fact", "2": "fact", "3": "fact" });
    expect(wrong.allPlaced).toBe(true);
    expect(wrong.allCorrect).toBe(false);
    expect(checkSort(sort, { "1": "fact", "2": "opinion", "3": "fact" }).allCorrect).toBe(true);
  });
});

describe("calibration", () => {
  it("praises calibration and names overconfidence", () => {
    expect(calibrationNote(90, true)).toMatch(/well calibrated/);
    expect(calibrationNote(90, false)).toMatch(/gap worth watching/);
    expect(calibrationNote(20, false)).toMatch(/sensed the doubt/);
    expect(calibrationNote(20, true)).toMatch(/instinct was better/);
    expect(calibrationNote(60, true)).toMatch(/credit/);
    expect(calibrationNote(60, false)).toMatch(/less certainty/);
  });
});

describe("evidence updater", () => {
  const step = {
    prior: 50,
    cards: [{ shift: 20 }, { shift: -35 }, { shift: 0 }, { shift: 40 }, { shift: 40 }].map(
      (c, i) => ({
        id: String(i),
        text: "t",
        note: "n",
        ...c,
      }),
    ),
  };

  it("moves the probability card by card, staying between 2 and 98", () => {
    expect(probabilityPath(step)).toEqual([50, 70, 35, 35, 75, 98]);
  });

  it("clamps, never reaching certainty", () => {
    expect(clampProbability(150)).toBe(98);
    expect(clampProbability(-5)).toBe(2);
    expect(clampProbability(49.6)).toBe(50);
  });

  it("reads a shift as up, down or no change", () => {
    expect(directionOf(12)).toBe("up");
    expect(directionOf(-3)).toBe("down");
    expect(directionOf(0)).toBe("same");
  });

  it("describes where the bar sits in words", () => {
    expect(likelihoodWord(95)).toBe("very likely");
    expect(likelihoodWord(70)).toBe("likely");
    expect(likelihoodWord(50)).toBe("about even");
    expect(likelihoodWord(20)).toBe("unlikely");
    expect(likelihoodWord(5)).toBe("very unlikely");
  });
});

describe("correlation vs causation", () => {
  const line = [
    [1, 2],
    [2, 4],
    [3, 6],
    [4, 8],
  ] as const;

  it("finds the slope and the correlation of a straight line", () => {
    expect(slopeOf(line)).toBeCloseTo(2);
    expect(correlationOf(line)).toBeCloseTo(1);
  });

  it("returns null when a variable doesn't vary or there are too few points", () => {
    expect(
      slopeOf([
        [1, 2],
        [1, 5],
      ]),
    ).toBeNull();
    expect(
      correlationOf([
        [1, 2],
        [2, 2],
        [3, 2],
      ]),
    ).toBeNull();
    expect(slopeOf([[1, 1]])).toBeNull();
  });

  it("shows a strong overall link that vanishes inside each group (the hidden variable)", () => {
    // Two clusters: hot days sell more and burn more; within each, the link is flat.
    const cool = [
      [10, 5],
      [12, 7],
      [11, 4],
      [13, 6],
      [12, 5],
    ] as [number, number][];
    const hot = [
      [30, 25],
      [32, 27],
      [31, 24],
      [33, 26],
      [32, 25],
    ] as [number, number][];
    const view = describeCorrelations({
      groups: [
        { id: "cool", label: "Cool days", points: cool },
        { id: "hot", label: "Hot days", points: hot },
      ],
    });
    expect(view.overall!).toBeGreaterThan(0.9);
    for (const g of view.perGroup) expect(Math.abs(g.r!)).toBeLessThan(0.6);
  });

  it("puts the strength of a link in words", () => {
    expect(strengthWord(0.9)).toBe("strong upward link");
    expect(strengthWord(-0.5)).toBe("moderate downward link");
    expect(strengthWord(0.25)).toBe("weak upward link");
    expect(strengthWord(0.05)).toBe("no real link");
    expect(strengthWord(null)).toBe("none");
  });
});
