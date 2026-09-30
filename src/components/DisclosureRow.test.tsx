// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DisclosureRow } from "./DisclosureRow";

afterEach(cleanup);

describe("Disclosure row", () => {
  it("reads as a sentence while closed, with the detail hidden", () => {
    render(
      <DisclosureRow title="Calibration" summary="You said 80% sure and were right 64%.">
        <p>The bars.</p>
      </DisclosureRow>,
    );
    const button = screen.getByRole("button", { name: /Calibration.*right 64%/ });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("The bars.").closest("div")!.hidden).toBe(true);
  });

  it("opens and closes on tap, and points the button at the panel it controls", () => {
    render(
      <DisclosureRow title="Achievements" summary="3 of 7 earned.">
        <p>The badges.</p>
      </DisclosureRow>,
    );
    const button = screen.getByRole("button", { name: /Achievements/ });
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const panel = screen.getByText("The badges.").closest("div")!;
    expect(panel.hidden).toBe(false);
    expect(panel.id).toBe(button.getAttribute("aria-controls"));
    fireEvent.click(button);
    expect(panel.hidden).toBe(true);
  });

  it("is a heading, so the page keeps its outline", () => {
    render(
      <DisclosureRow title="This week" summary="2 lessons.">
        <p>Bars.</p>
      </DisclosureRow>,
    );
    expect(screen.getByRole("heading", { name: /This week/ })).toBeTruthy();
  });
});
