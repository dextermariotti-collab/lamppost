import { describe, expect, it } from "vitest";
import { COMPANION_ACCESSORIES, COMPANION_PALETTES } from "./companions";
import { MAX_HINT_TOKENS, isCosmetic } from "./rewards";

describe("what the sync still checks from the old reward economy", () => {
  it("knows the companion parts that used to cost gems, all of which a companion can wear", () => {
    const wearable = new Set([...COMPANION_ACCESSORIES, ...COMPANION_PALETTES].map((p) => p.id));
    for (const id of ["headphones", "bow", "crown", "ocean", "rose"]) {
      expect(isCosmetic(id), id).toBe(true);
      expect(wearable.has(id), id).toBe(true);
    }
    expect(isCosmetic("hat")).toBe(false);
    expect(isCosmetic("nonsense")).toBe(false);
  });

  it("keeps a small cap on carried-over hint tokens", () => {
    expect(MAX_HINT_TOKENS).toBe(5);
  });
});
