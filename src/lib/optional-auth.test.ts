import { describe, expect, it } from "vitest";
import { optionalUserId } from "./optional-auth.server";

describe("optionalUserId", () => {
  it("is null for a guest — outside any request there is nobody signed in, and it never throws", async () => {
    await expect(optionalUserId()).resolves.toBeNull();
  });
});
