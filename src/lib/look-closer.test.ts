import { describe, expect, it } from "vitest";
import { LOOK_TEXT, lookInputProblem, readLookResult } from "./look-closer";

const good = {
  claim: "Switching to the Brightline plan will save you money on your bills.",
  lenses: [
    {
      lessonId: "claims-vague-language",
      question: "Save how much, compared with what?",
      lookFor: '"Up to 40% off" has no starting price and no usual price beside it.',
    },
    {
      lessonId: "evidence-source-reliability",
      question: "Who is telling me this, and what do they gain?",
      lookFor: "The only quote comes from the company's own sales team.",
    },
    {
      lessonId: "media-manipulation",
      question: "Is something trying to rush me?",
      lookFor: '"Offer ends tonight" appears twice.',
    },
  ],
  check:
    "Compare the plan's full yearly price with your current bill on an independent comparison site.",
};

describe("what can be pasted", () => {
  it("needs a sentence or two, and not a whole article", () => {
    expect(lookInputProblem("Too short.")).toMatch(/a little more/);
    expect(lookInputProblem("x".repeat(LOOK_TEXT.max + 1))).toMatch(/That's a lot of text/);
    expect(
      lookInputProblem("Our new plan cuts your energy bill by up to 40%, offer ends tonight."),
    ).toBeNull();
  });
});

describe("reading the reply", () => {
  it("keeps a reply with a claim, the lessons' questions and a way to check", () => {
    expect(readLookResult(good)).toEqual(good);
  });

  it("drops a lens for a lesson that doesn't exist or repeats, and needs at least two", () => {
    const read = readLookResult({
      ...good,
      lenses: [good.lenses[0], { ...good.lenses[0] }, { ...good.lenses[1], lessonId: "made-up" }],
    });
    expect(read).toBeNull();
    const two = readLookResult({ ...good, lenses: [good.lenses[0], good.lenses[2]] });
    expect(two?.lenses.map((l) => l.lessonId)).toEqual([
      "claims-vague-language",
      "media-manipulation",
    ]);
  });

  it("throws away a reply that decides whether the text is true", () => {
    expect(readLookResult({ ...good, check: "This claim is false, so ignore it." })).toBeNull();
    expect(
      readLookResult({ ...good, claim: "It is definitely true that the plan saves money." }),
    ).toBeNull();
  });

  it("reads nothing into a reply that isn't usable", () => {
    expect(readLookResult(null)).toBeNull();
    expect(readLookResult({ claim: "Something." })).toBeNull();
  });
});
