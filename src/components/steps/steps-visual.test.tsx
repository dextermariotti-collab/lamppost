// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StepResult } from "@/lib/steps/scoring";
import { allSamples, causeSample, noteSample, updaterSample } from "@/test/steps";
import { CauseExplorer } from "./CauseExplorer";
import { EvidenceUpdater } from "./EvidenceUpdater";
import { NoteStep } from "./NoteStep";
import { StepView } from "./StepView";

afterEach(cleanup);

const status = () => screen.getByRole("status").textContent ?? "";
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const meter = () => Number(screen.getByRole("meter").getAttribute("aria-valuenow"));

describe("Evidence updater", () => {
  const mount = () => {
    const onResolve = vi.fn<(r: StepResult) => void>();
    render(<EvidenceUpdater step={updaterSample} onResolve={onResolve} />);
    return onResolve;
  };

  it("starts at the prior, with the number and a word for it", () => {
    mount();
    expect(meter()).toBe(50);
    expect(screen.getByRole("meter").getAttribute("aria-valuetext")).toBe("50 percent, about even");
  });

  it("moves the bar when a card is answered, and says why", () => {
    mount();
    click("More likely");
    expect(meter()).toBe(70);
    expect(status()).toContain("Yes");
    expect(status()).toContain("moves the claim up to 70%");
    expect(status()).toContain("Someone may have swapped it");
    expect(screen.getByText(/You said more likely/)).toBeTruthy();
  });

  it("names what a wrong call should have been, in words as well as colour", () => {
    mount();
    click("More likely");
    click("Next piece of evidence");
    click("More likely"); // the power cut lowers it
    expect(status()).toContain("It's actually less likely");
    expect(status()).toContain("A power cut explains it");
    expect(meter()).toBe(40);
    expect(screen.getByText(/You said more likely/).className).toMatch(/text-destructive/);
  });

  it("says a card that changes nothing changes nothing", () => {
    mount();
    click("More likely");
    click("Next piece of evidence");
    click("Less likely");
    click("Next piece of evidence");
    click("No real change");
    expect(status()).toContain("It changes nothing");
    expect(meter()).toBe(40);
  });

  it("resolves after the last card with the fraction called right, and the final number", () => {
    const onResolve = mount();
    click("More likely");
    click("Next piece of evidence");
    click("More likely"); // wrong
    click("Next piece of evidence");
    click("No real change");
    expect(onResolve).not.toHaveBeenCalled();
    click("See where it landed");
    expect(onResolve).toHaveBeenCalledTimes(1);
    const result = onResolve.mock.calls[0]![0];
    expect(result.score).toBeCloseTo(2 / 3);
    expect(result.answer).toEqual({ guesses: ["up", "up", "same"] });
    expect(status()).toContain("2 of 3");
    expect(status()).toContain("ended at 40%");
  });

  it("gives full marks for calling all three, and halves them with a hint", () => {
    const perfect = vi.fn<(r: StepResult) => void>();
    render(<EvidenceUpdater step={updaterSample} onResolve={perfect} />);
    click(/Need a hint/);
    for (const [guess, next] of [
      ["More likely", "Next piece of evidence"],
      ["Less likely", "Next piece of evidence"],
      ["No real change", "See where it landed"],
    ] as const) {
      click(guess);
      click(next);
    }
    expect(perfect.mock.calls[0]![0]).toMatchObject({ score: 0.5, hintUsed: true });
  });

  it("never lets the bar reach certainty, whatever the cards say", () => {
    const step = {
      ...updaterSample,
      prior: 90,
      cards: [
        { id: "x", text: "a", shift: 40, note: "n" },
        { id: "y", text: "b", shift: -40, note: "n" },
      ],
    };
    render(<EvidenceUpdater step={step} onResolve={() => undefined} />);
    click("More likely");
    expect(meter()).toBe(98);
  });
});

describe("Correlation vs causation", () => {
  const mount = () => {
    const onResolve = vi.fn<(r: StepResult) => void>();
    render(<CauseExplorer step={causeSample} onResolve={onResolve} />);
    return onResolve;
  };
  const toggle = () => screen.getByRole("switch");

  it("shows a strong overall link at first, described in words, with no question yet", () => {
    mount();
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/strong upward link/);
    expect(screen.getByText(/Overall: a strong upward link/)).toBeTruthy();
    expect(toggle().getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByText(causeSample.question)).toBeNull();
  });

  it("splits into groups when the hidden variable is switched on: each group has no real link", () => {
    mount();
    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(/Inside each group: Cool days — .*; Hot days — /)).toBeTruthy();
    expect(screen.getByText("Cool days")).toBeTruthy(); // legend
    expect(screen.getByText("Hot days")).toBeTruthy();
    // Different shapes per group, so the groups are told apart without colour.
    const svg = screen.getByRole("img");
    expect(svg.querySelectorAll("rect").length).toBe(5);
    expect(svg.querySelectorAll("circle").length).toBe(5);
  });

  it("switches back to the single picture", () => {
    mount();
    fireEvent.click(toggle());
    fireEvent.click(toggle());
    expect(screen.getByText(/Overall:/)).toBeTruthy();
    expect(screen.getByRole("img").querySelectorAll("circle").length).toBe(10);
  });

  it("asks what is going on once the switch has been tried, and keeps asking after it is switched back", () => {
    mount();
    fireEvent.click(toggle());
    expect(screen.getByText(causeSample.question)).toBeTruthy();
    fireEvent.click(toggle());
    expect(screen.getByText(causeSample.question)).toBeTruthy();
  });

  it("explains the specific mistake of a wrong explanation, and accepts the hidden variable", () => {
    const onResolve = mount();
    fireEvent.click(toggle());
    click(/Ice cream causes sunburn/);
    expect(status()).toContain("Inside each kind of day the link disappears");
    click("Try again");
    click(/Hot weather drives both/);
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 0.5 });
    expect(status()).toContain("Correct");
  });

  it("has a switch at least 44px tall", () => {
    mount();
    expect(toggle().className).toMatch(/min-h-11/);
  });
});

describe("Note", () => {
  it("resolves as soon as it is shown, once", () => {
    const onResolve = vi.fn<(r: StepResult) => void>();
    const { rerender } = render(<NoteStep step={noteSample} onResolve={onResolve} />);
    rerender(<NoteStep step={noteSample} onResolve={onResolve} />);
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 1 });
  });
});

describe("every kind of step, through the dispatcher", () => {
  it.each(allSamples.map((s) => [s.kind, s] as const))(
    "%s: has a heading and named controls",
    (_kind, step) => {
      render(<StepView step={step} onResolve={() => undefined} />);
      if (step.kind !== "note") expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
      for (const button of screen.queryAllByRole("button")) {
        const name = button.getAttribute("aria-label") ?? button.textContent ?? "";
        expect(name.trim().length, button.outerHTML.slice(0, 120)).toBeGreaterThan(0);
      }
      // Sliders and switches get their name from a label, not from their own text.
      for (const role of ["slider", "switch"] as const) {
        expect(screen.queryAllByRole(role, { name: /\S/ }).length).toBe(
          screen.queryAllByRole(role).length,
        );
      }
    },
  );

  it.each(allSamples.filter((s) => s.kind !== "note").map((s) => [s.kind, s] as const))(
    "%s: every button is at least 44px tall",
    (_kind, step) => {
      render(<StepView step={step} onResolve={() => undefined} />);
      for (const button of screen.getAllByRole("button")) {
        expect(button.className, button.textContent ?? "").toMatch(/\bmin-h-1[1-9]\b|\bh-1[1-9]\b/);
      }
    },
  );

  it("never relies on colour alone: every success and failure message has words and an icon", async () => {
    render(<StepView step={allSamples[0]} onResolve={() => undefined} />);
    click(/also have more sunburn cases/);
    const panel = screen.getByRole("status");
    expect(panel.textContent).toMatch(/Not quite/);
    expect(panel.querySelector("svg")).toBeTruthy();
    await act(async () => undefined);
  });
});
