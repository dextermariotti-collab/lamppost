import { describe, expect, it } from "vitest";
import { secretsMatch } from "./secure-compare";

describe("secretsMatch", () => {
  it("matches only the exact secret", () => {
    expect(secretsMatch("s3cret-token", "s3cret-token")).toBe(true);
    expect(secretsMatch("s3cret-tokeN", "s3cret-token")).toBe(false);
    expect(secretsMatch("s3cret", "s3cret-token")).toBe(false);
    expect(secretsMatch("s3cret-token-and-more", "s3cret-token")).toBe(false);
  });

  it("never matches a missing token, and an unset secret matches nothing (not even empty)", () => {
    expect(secretsMatch(null, "s3cret-token")).toBe(false);
    expect(secretsMatch(undefined, "s3cret-token")).toBe(false);
    expect(secretsMatch("", "")).toBe(false);
    expect(secretsMatch("lamppost-warm", "")).toBe(false);
  });
});
