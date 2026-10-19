// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "./button";

afterEach(cleanup);

describe("Button focus", () => {
  it("draws a 2px outline, set off from the button, in the focus color (not a 1px ring in the fill)", () => {
    render(<Button>Continue</Button>);
    const classes = screen.getByRole("button", { name: "Continue" }).className.split(/\s+/);
    expect(classes).toEqual(
      expect.arrayContaining([
        "focus-visible:outline-2",
        "focus-visible:outline-offset-2",
        "focus-visible:outline-ring",
      ]),
    );
    expect(classes).not.toContain("focus-visible:outline-none");
    expect(classes).not.toContain("focus-visible:ring-1");
  });
});
