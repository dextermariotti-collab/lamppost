// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StepResult } from "@/lib/steps/scoring";
import {
  choiceSample,
  confidenceSample,
  flawSample,
  gapSample,
  strongerSample,
} from "@/test/steps";
import { ChoiceStep } from "./ChoiceStep";
import { ConfidenceSlider } from "./ConfidenceSlider";
import { FillTheGap } from "./FillTheGap";
import { SpotTheFlaw } from "./SpotTheFlaw";
import { WhichIsStronger } from "./WhichIsStronger";

afterEach(cleanup);

const setup = (ui: (onResolve: (r: StepResult) => void) => React.ReactNode) => {
  const onResolve = vi.fn<(r: StepResult) => void>();
  render(ui(onResolve));
  return onResolve;
};
const status = () => screen.getByRole("status").textContent ?? "";
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("Spot the flaw", () => {
  const phrase = (text: RegExp) => screen.getByRole("button", { name: text });

  it("puts the instruction first, as a heading", () => {
    setup((r) => <SpotTheFlaw step={flawSample} onResolve={r} />);
    expect(screen.getByRole("heading", { name: flawSample.prompt })).toBeTruthy();
  });

  it("only lets the marked phrases be tapped", () => {
    setup((r) => <SpotTheFlaw step={flawSample} onResolve={r} />);
    expect(
      screen
        .getAllByRole("button")
        .filter((b) => /sunburn cases|ice cream causes|council/.test(b.textContent ?? "")),
    ).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /Towns with more/ })).toBeNull();
  });

  it("names the specific reason a wrong phrase isn't the flaw, and marks it without colour", () => {
    setup((r) => <SpotTheFlaw step={flawSample} onResolve={r} />);
    click(/also have more sunburn cases/);
    expect(status()).toContain("Not quite");
    expect(status()).toContain("That's the observation");
    expect(phrase(/also have more sunburn cases.*not the flaw/).className).toMatch(/border-dashed/);
    expect(screen.getByRole("button", { name: "Try again" }).className).toMatch(/h-11/);
  });

  it("scores full marks first time and names the fallacy", () => {
    const onResolve = setup((r) => <SpotTheFlaw step={flawSample} onResolve={r} />);
    click(/ice cream causes sunburn/);
    expect(status()).toContain("Correct");
    expect(status()).toContain("Correlation is not causation");
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onResolve.mock.calls[0]![0]).toMatchObject({
      score: 1,
      wrongAttempts: 0,
      revealed: false,
    });
    expect(phrase(/ice cream causes sunburn.*the flaw/).className).toMatch(/border-success/);
  });

  it("scores half after one miss and lets you try again", () => {
    const onResolve = setup((r) => <SpotTheFlaw step={flawSample} onResolve={r} />);
    click(/also have more sunburn cases/);
    click("Try again");
    click(/ice cream causes sunburn/);
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 0.5, wrongAttempts: 1 });
  });

  it("halves the score when the hint was used", () => {
    const onResolve = setup((r) => <SpotTheFlaw step={flawSample} onResolve={r} />);
    click(/Need a hint/);
    expect(screen.getByText(flawSample.hint!).hidden).toBe(false);
    click(/ice cream causes sunburn/);
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 0.5, hintUsed: true });
  });

  it("offers to show the answer only after two misses, and then scores nothing", () => {
    const onResolve = setup((r) => <SpotTheFlaw step={flawSample} onResolve={r} />);
    click(/also have more sunburn cases/);
    expect(screen.queryByRole("button", { name: "Show me" })).toBeNull();
    click("Try again");
    click(/should ban stalls/);
    click("Show me");
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 0, revealed: true });
    expect(status()).toContain("Correlation is not causation");
  });

  it("locks the passage once it is resolved", () => {
    const onResolve = setup((r) => <SpotTheFlaw step={flawSample} onResolve={r} />);
    click(/ice cream causes sunburn/);
    expect((phrase(/also have more sunburn cases/) as HTMLButtonElement).disabled).toBe(true);
    expect(onResolve).toHaveBeenCalledTimes(1);
  });
});

describe("Fill the gap", () => {
  it("shows the argument with the gap, and fills it when the right assumption is chosen", () => {
    const onResolve = setup((r) => <FillTheGap step={gapSample} onResolve={r} />);
    expect(screen.getByText(/Choose what has to be true/)).toBeTruthy();
    click(/like the earlier ones/);
    expect(screen.queryByText(/Choose what has to be true/)).toBeNull();
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 1 });
  });

  it("says why a wrong assumption doesn't bridge the gap, and marks it with a cross and words", () => {
    setup((r) => <FillTheGap step={gapSample} onResolve={r} />);
    click(/Shops are hard to run/);
    expect(status()).toContain("a general remark");
    expect(screen.getByText("Not this one")).toBeTruthy();
    click("Try again");
    expect(screen.queryByText("Not this one")).toBeNull();
  });
});

describe("Choice", () => {
  it("shows the stimulus, and each wrong option explains its own mistake", () => {
    setup((r) => <ChoiceStep step={choiceSample} onResolve={r} />);
    expect(screen.getByText(/The pool is cold\. Nobody swam/)).toBeTruthy();
    click(/^The pool is cold\.$/);
    expect(status()).toContain("a reason offered");
    click("Try again");
    click(/^Nobody swam this week\.$/);
    expect(status()).toContain("observation offered as support");
  });
});

describe("Which is stronger", () => {
  it("names the deciding factor when the stronger one is picked", () => {
    const onResolve = setup((r) => <WhichIsStronger step={strongerSample} onResolve={r} />);
    click(/blind taste test/);
    expect(status()).toContain("The deciding factor: It can be checked");
    expect(screen.getByText("Stronger")).toBeTruthy();
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 1, answer: { choice: "b" } });
  });

  it("explains the specific weakness of the weaker one, then lets you choose again", () => {
    const onResolve = setup((r) => <WhichIsStronger step={strongerSample} onResolve={r} />);
    click(/founder says so/);
    expect(status()).toContain("has a reason to say it");
    expect(screen.getByText("Weaker")).toBeTruthy();
    click("Try again");
    click(/blind taste test/);
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 0.5 });
  });

  it("stacks on a phone and sits side by side from small tablets up", () => {
    setup((r) => <WhichIsStronger step={strongerSample} onResolve={r} />);
    expect(screen.getByRole("group", { name: "The two arguments" }).className).toMatch(
      /sm:grid-cols-2/,
    );
  });
});

describe("Confidence slider", () => {
  const slider = () => screen.getByRole("slider") as HTMLInputElement;
  const lock = () =>
    screen.getByRole("button", { name: /Choose an answer|Set how sure|Lock it in/ });

  it("needs an answer and a deliberate confidence before it will lock in", () => {
    setup((r) => <ConfidenceSlider step={confidenceSample} onResolve={r} />);
    expect((lock() as HTMLButtonElement).disabled).toBe(true);
    click(/one story isn't enough/);
    expect(lock().textContent).toMatch(/Set how sure/);
    fireEvent.change(slider(), { target: { value: "85" } });
    expect(lock().textContent).toBe("Lock it in");
    expect((lock() as HTMLButtonElement).disabled).toBe(false);
  });

  it("counts touching the slider at its starting value as a choice", () => {
    setup((r) => <ConfidenceSlider step={confidenceSample} onResolve={r} />);
    click(/one story isn't enough/);
    expect(lock().textContent).toMatch(/Set how sure/);
    fireEvent.pointerDown(slider());
    expect(lock().textContent).toBe("Lock it in");
  });

  it("describes the value in words as well as a number", () => {
    setup((r) => <ConfidenceSlider step={confidenceSample} onResolve={r} />);
    fireEvent.change(slider(), { target: { value: "95" } });
    expect(slider().getAttribute("aria-valuetext")).toBe("95 percent, almost certain");
  });

  it("records the choice AND the confidence, which is what the calibration chart reads", () => {
    const onResolve = setup((r) => <ConfidenceSlider step={confidenceSample} onResolve={r} />);
    click(/one story isn't enough/);
    fireEvent.change(slider(), { target: { value: "85" } });
    click("Lock it in");
    expect(onResolve.mock.calls[0]![0]).toMatchObject({
      score: 1,
      answer: { choice: 1, confidence: 85 },
    });
    expect(status()).toContain("well calibrated");
  });

  it("gives one go: a wrong answer is explained, calibration is named, and there is no retry", () => {
    const onResolve = setup((r) => <ConfidenceSlider step={confidenceSample} onResolve={r} />);
    click(/she saw it herself/);
    fireEvent.change(slider(), { target: { value: "90" } });
    click("Lock it in");
    expect(status()).toContain("One person's story can't show how common");
    expect(status()).toContain("gap worth watching");
    expect(onResolve.mock.calls[0]![0]).toMatchObject({
      score: 0,
      answer: { choice: 0, confidence: 90 },
    });
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.getByText("Not this one")).toBeTruthy();
  });

  it("locks the slider and the options after the answer is in", () => {
    setup((r) => <ConfidenceSlider step={confidenceSample} onResolve={r} />);
    click(/one story isn't enough/);
    fireEvent.change(slider(), { target: { value: "60" } });
    click("Lock it in");
    expect(slider().disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: /she saw it herself/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

describe("every simple step", () => {
  it("has a labelled section and a live region for feedback", () => {
    for (const ui of [
      (r: (x: StepResult) => void) => <SpotTheFlaw step={flawSample} onResolve={r} />,
      (r: (x: StepResult) => void) => <FillTheGap step={gapSample} onResolve={r} />,
      (r: (x: StepResult) => void) => <WhichIsStronger step={strongerSample} onResolve={r} />,
      (r: (x: StepResult) => void) => <ConfidenceSlider step={confidenceSample} onResolve={r} />,
      (r: (x: StepResult) => void) => <ChoiceStep step={choiceSample} onResolve={r} />,
    ]) {
      cleanup();
      render(ui(() => undefined));
      expect(screen.getByRole("region")).toBeTruthy();
      expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
    }
  });
});
