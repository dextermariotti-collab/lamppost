// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import claims from "@/content/lessons/claims";
import type { StepResult } from "@/lib/steps/scoring";
import type { BuilderStep } from "@/lib/steps/types";
import { ArgumentBuilder } from "./ArgumentBuilder";

afterEach(cleanup);

/** Lesson 1, step 2: the one the click-through got stuck on. */
const bike = claims["claims-the-actual-claim"]!.steps.find(
  (s): s is BuilderStep => s.kind === "builder",
)!;

const mount = () => {
  const onResolve = vi.fn<(r: StepResult) => void>();
  render(<ArgumentBuilder step={bike} onResolve={onResolve} />);
  return onResolve;
};
const piece = (text: RegExp) => screen.getByRole("button", { name: text });
const slot = (label: string) => screen.getByRole("group", { name: new RegExp(`^${label}:`) });
const pool = () => screen.getByRole("group", { name: "Pieces to place" });
const status = () => screen.getByRole("status").textContent ?? "";
const tap = (el: HTMLElement) => fireEvent.click(el);
const target = (label: string, name: string) => within(slot(label)).getByRole("button", { name });

/** The click-through: a stray fact in The claim, and the other two slots filled correctly. */
function getStuck() {
  tap(piece(/opened in 2009/));
  tap(target("The claim", "Put it here"));
  tap(piece(/free on weekends/));
  tap(target("A reason", "Put it here"));
  tap(piece(/Saturday sales/));
  tap(target("Something you can check", "Put it here"));
}

describe("Argument builder: never stuck", () => {
  it("reaches the stuck state the click-through found: every slot full, one that doesn't fit", () => {
    const onResolve = mount();
    getStuck();
    expect(slot("The claim").getAttribute("aria-label")).toBe("The claim: doesn't fit");
    expect(screen.queryAllByRole("button", { name: "Put it here" })).toHaveLength(0);
    expect(onResolve).not.toHaveBeenCalled();
  });

  it("counts only pieces that fit as in place, and the feedback names the slot that doesn't", () => {
    mount();
    getStuck();
    expect(screen.getByText("2 of 3 in place")).toBeTruthy();
    expect(screen.queryByText("3 of 3 in place")).toBeNull();
    expect(status()).toContain("The claim still doesn't fit");
    expect(status()).not.toMatch(/to go/);
    const claim = slot("The claim");
    expect(within(claim).queryByText("Fits")).toBeNull();
    expect(within(claim).getByText("Doesn't fit")).toBeTruthy();
  });

  it("is finished by taps alone: a full slot takes a tapped piece and sends its piece back", () => {
    const onResolve = mount();
    getStuck();
    tap(piece(/hold its sale on a weekend/));
    tap(target("The claim", "Put it here instead"));
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ wrongAttempts: 1, revealed: false });
    expect(slot("The claim").getAttribute("aria-label")).toBe("The claim: fits");
    expect(
      within(pool()).getByRole("button", { name: /opened in 2009\., not placed/ }),
    ).toBeTruthy();
    expect(screen.getByText("3 of 3 in place")).toBeTruthy();
    expect(status()).toContain("The map holds together");
  });

  it("lets a placed piece be tapped and put back with the pieces", () => {
    mount();
    getStuck();
    const stray = within(slot("The claim")).getByRole("button", { name: /opened in 2009/ });
    tap(stray);
    expect(stray.getAttribute("aria-pressed")).toBe("true");
    tap(within(pool()).getByRole("button", { name: "Put it back with the pieces" }));
    expect(slot("The claim").getAttribute("aria-label")).toBe("The claim: empty");
    expect(
      within(pool()).getByRole("button", { name: /opened in 2009\., not placed/ }),
    ).toBeTruthy();
    expect(screen.getByText("2 of 3 in place")).toBeTruthy();
  });

  it("offers no target where the selected piece already is", () => {
    mount();
    getStuck();
    tap(within(slot("A reason")).getByRole("button", { name: /free on weekends/ }));
    expect(within(slot("A reason")).queryByRole("button", { name: /Put it here/ })).toBeNull();
    expect(target("The claim", "Put it here instead")).toBeTruthy();
    expect(target("Something you can check", "Put it here instead")).toBeTruthy();
  });

  it("can be finished from the keyboard: every target is a real, focusable button", () => {
    const onResolve = mount();
    getStuck();
    const right = piece(/hold its sale on a weekend/);
    right.focus();
    fireEvent.click(right); // Enter or Space on a button is a click
    const swap = target("The claim", "Put it here instead");
    expect(swap.tagName).toBe("BUTTON");
    expect(swap.getAttribute("type")).toBe("button");
    expect(swap.tabIndex).toBe(0);
    expect(swap.className).toContain("focus-visible:outline-2");
    swap.focus();
    fireEvent.click(swap);
    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  it("keeps focus on a piece moved with a tap, so the keyboard doesn't start over", () => {
    mount();
    tap(piece(/free on weekends/));
    tap(target("The claim", "Put it here"));
    expect(document.activeElement).toBe(
      within(slot("The claim")).getByRole("button", { name: /free on weekends/ }),
    );
    tap(within(slot("The claim")).getByRole("button", { name: /free on weekends/ }));
    tap(within(pool()).getByRole("button", { name: "Put it back with the pieces" }));
    expect(document.activeElement).toBe(
      within(pool()).getByRole("button", { name: /free on weekends/ }),
    );
  });

  it("names where a placed piece sits", () => {
    mount();
    tap(piece(/hold its sale on a weekend/));
    tap(target("The claim", "Put it here"));
    expect(
      within(slot("The claim")).getByRole("button", { name: /on a weekend\., in The claim$/ }),
    ).toBeTruthy();
  });

  it("counts down only while nothing in the map is wrong", () => {
    mount();
    tap(piece(/hold its sale on a weekend/));
    tap(target("The claim", "Put it here"));
    expect(status()).toContain("That belongs there. 2 to go.");
    tap(piece(/opened in 2009/));
    tap(target("A reason", "Put it here"));
    expect(screen.getByText("1 of 3 in place")).toBeTruthy();
    tap(piece(/Saturday sales/));
    tap(target("Something you can check", "Put it here"));
    expect(status()).toContain("A reason still doesn't fit");
    expect(status()).not.toMatch(/to go/);
  });
});
