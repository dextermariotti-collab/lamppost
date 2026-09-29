import { describe, expect, it } from "vitest";
import { holdRewards, rewardsHeld } from "./reward-hold";

describe("holding reward pop-ups", () => {
  it("holds until released, and release is safe to call twice", () => {
    expect(rewardsHeld()).toBe(false);
    const release = holdRewards();
    expect(rewardsHeld()).toBe(true);
    release();
    release();
    expect(rewardsHeld()).toBe(false);
  });

  it("nests: two holds need two releases", () => {
    const a = holdRewards();
    const b = holdRewards();
    a();
    expect(rewardsHeld()).toBe(true);
    b();
    expect(rewardsHeld()).toBe(false);
  });
});
