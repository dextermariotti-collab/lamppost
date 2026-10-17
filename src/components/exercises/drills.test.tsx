// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExerciseRunner } from "./ExerciseRunner";
import { EXERCISE_KINDS, EXERCISE_LABEL, type Exercise, type ExerciseKind } from "@/lib/exercises";
import { SAMPLES, sample } from "@/test/exercises";

afterEach(cleanup);

/**
 * Runs a drill the way a lesson does: the runner shows it, the learner answers,
 * the answer comes back down as a prop. `given` records what it reported.
 */
function Run({
  exercise,
  onGiven,
}: {
  exercise: Exercise;
  onGiven?: (answer: unknown, score: number) => void;
}) {
  const [answer, setAnswer] = useState<unknown>(undefined);
  return (
    <ExerciseRunner
      exercise={exercise}
      index={0}
      total={4}
      answer={answer}
      onAnswer={(given, score) => {
        setAnswer(given);
        onGiven?.(given, score);
      }}
    />
  );
}

const run = (exercise: Exercise) => {
  const given = vi.fn();
  render(<Run exercise={exercise} onGiven={given} />);
  return given;
};
const click = (name: RegExp | string) => fireEvent.click(screen.getByRole("button", { name }));

describe("every drill type is shown by the runner", () => {
  it.each(EXERCISE_KINDS)("%s renders its label and its content", (kind) => {
    run(SAMPLES[kind]);
    expect(screen.getByText(EXERCISE_LABEL[kind])).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
    expect(screen.getByText("1 of 4")).toBeTruthy();
  });

  it("keeps every interactive control at least 44px tall", () => {
    // jsdom has no layout, so this checks the classes that give the size; the
    // measured sizes in a real browser are in the PR description.
    const tall = /\b(min-h-11|h-11|h-12|py-3)\b/;
    for (const kind of EXERCISE_KINDS) {
      const { unmount } = render(<Run exercise={SAMPLES[kind]} />);
      for (const control of screen.queryAllByRole("button")) {
        expect(control.className, `${kind}: ${control.textContent}`).toMatch(tall);
      }
      unmount();
    }
  });
});

describe("pick-one drills", () => {
  const kinds = ["claim", "flaw", "assumption", "steelman", "judge", "rewrite"] as const;

  it.each(kinds)("%s: the keyed option scores 1 and the feedback confirms it", (kind) => {
    const drill = sample(kind);
    const given = run(drill);
    click(new RegExp(drill.options[drill.correct]!.slice(0, 20)));
    expect(given).toHaveBeenCalledWith(drill.correct, 1);
    expect(screen.getByText(drill.explanation)).toBeTruthy();
  });

  it.each(kinds)("%s: a wrong option scores 0 and reveals the answer", (kind) => {
    const drill = sample(kind);
    const wrong = drill.options.findIndex((_, i) => i !== drill.correct);
    const given = run(drill);
    click(new RegExp(drill.options[wrong]!.slice(0, 20)));
    expect(given).toHaveBeenCalledWith(wrong, 0);
    expect(screen.getByText(/The answer is/).textContent).toContain(drill.options[drill.correct]);
  });

  it("locks once answered: a second tap changes nothing", () => {
    const drill = sample("flaw");
    const given = run(drill);
    click(new RegExp(drill.options[1]!.slice(0, 20)));
    click(new RegExp(drill.options[2]!.slice(0, 20)));
    expect(given).toHaveBeenCalledTimes(1);
  });

  it("shows the lesson's own question for judge and rewrite", () => {
    run(SAMPLES.judge);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(SAMPLES.judge.question);
  });

  it("names the fallacy once a flaw drill is answered", () => {
    const drill = sample("flaw");
    run(drill);
    click(new RegExp(drill.options[0]!.slice(0, 20)));
    expect(screen.getByText(/Bandwagon/)).toBeTruthy();
  });
});

describe("highlight", () => {
  const drill = sample("highlight");
  const word = (index: number) => screen.getAllByRole("button", { pressed: false })[index]!;

  it("waits for at least one pick before it can be checked", () => {
    run(drill);
    const check = screen.getByRole("button", { name: /Check my picks/ });
    expect((check as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(word(1));
    expect((check as HTMLButtonElement).disabled).toBe(false);
  });

  it("lets a pick be taken back", () => {
    run(drill);
    fireEvent.click(word(1));
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { pressed: true }));
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
  });

  const check = (picks: number[]) => {
    const given = run(drill);
    for (const pick of picks)
      fireEvent.click(screen.getByRole("button", { name: drill.tokens[pick]! }));
    click(/Check my picks/);
    return given;
  };

  it("scores every target found and nothing else as 1", () => {
    const given = check([1, 5]);
    expect(given).toHaveBeenCalledWith([1, 5], 1);
    expect(screen.getByText("You caught every one.")).toBeTruthy();
  });

  it("scores half for one of two targets", () => {
    expect(check([1])).toHaveBeenCalledWith([1], 0.5);
    expect(screen.getByText(/1 of 2 found/)).toBeTruthy();
  });

  it("takes a false alarm off the score, and never goes below 0", () => {
    expect(check([1, 0])).toHaveBeenCalledWith([1, 0], 0);
    cleanup();
    expect(check([0, 2])).toHaveBeenCalledWith([0, 2], 0);
    expect(screen.getByText(/0 of 2 found, 2 false alarms/)).toBeTruthy();
  });

  it("says in words which words were the targets, not only in color", () => {
    check([1, 0]);
    expect(screen.getByRole("button", { name: /may.*one to tap, you got it/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /can.*one to tap, you missed it/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Studies.*not one to tap/ })).toBeTruthy();
  });

  it("stops accepting taps once answered", () => {
    check([1, 5]);
    fireEvent.click(screen.getByRole("button", { name: /Studies/ }));
    expect(screen.getByRole("button", { name: /Studies/ }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });
});

describe("sort", () => {
  const drill = sample("sort");
  const bucket = (statement: number, name: string) =>
    within(screen.getByText(drill.statements[statement]!.text).closest("div")!).getByRole(
      "button",
      {
        name: new RegExp(`^${name}`),
      },
    );

  it("needs every statement sorted before it can be checked", () => {
    run(drill);
    const check = screen.getByRole("button", { name: /Check my sort/ }) as HTMLButtonElement;
    expect(check.disabled).toBe(true);
    fireEvent.click(bucket(0, "Fact"));
    fireEvent.click(bucket(1, "Opinion"));
    expect(check.disabled).toBe(true);
    fireEvent.click(bucket(2, "Value"));
    expect(check.disabled).toBe(false);
  });

  it("scores the share sorted correctly, and lets a choice be changed", () => {
    const given = run(drill);
    fireEvent.click(bucket(0, "Opinion"));
    fireEvent.click(bucket(0, "Fact"));
    fireEvent.click(bucket(1, "Opinion"));
    fireEvent.click(bucket(2, "Fact"));
    click(/Check my sort/);
    expect(given.mock.calls[0]![1]).toBeCloseTo(2 / 3);
    expect(screen.getByText("2 of 3 sorted correctly.")).toBeTruthy();
    expect(screen.getByText(drill.statements[2]!.why)).toBeTruthy();
  });

  it("scores a perfect sort as 1", () => {
    const given = run(drill);
    fireEvent.click(bucket(0, "Fact"));
    fireEvent.click(bucket(1, "Opinion"));
    fireEvent.click(bucket(2, "Value"));
    click(/Check my sort/);
    expect(given.mock.calls[0]![1]).toBe(1);
  });
});

describe("slider (update your confidence)", () => {
  const drill = sample("slider"); // evidence should move confidence DOWN by about 30

  const commit = (before: number, after: number) => {
    const given = run(drill);
    fireEvent.change(screen.getByRole("slider", { name: "Confidence before" }), {
      target: { value: String(before) },
    });
    click(/Lock that in/);
    fireEvent.change(screen.getByRole("slider", { name: "Confidence after" }), {
      target: { value: String(after) },
    });
    click(/Commit to that/);
    return given;
  };

  it("asks for confidence first, then shows the new evidence", () => {
    run(drill);
    expect(screen.queryByText(/New evidence/)).toBeNull();
    click(/Lock that in/);
    expect(screen.getByText(/New evidence:/).textContent).toContain(drill.evidence);
    expect(screen.getByText("You started at 50%.")).toBeTruthy();
  });

  it("scores the right direction and a sensible size as 1", () => {
    expect(commit(70, 40)).toHaveBeenCalledWith({ before: 70, after: 40 }, 1);
    expect(screen.getByText("Right direction, sensible size.")).toBeTruthy();
  });

  it("scores the right direction but the wrong size as half", () => {
    expect(commit(70, 65)).toHaveBeenCalledWith({ before: 70, after: 65 }, 0.5);
    expect(screen.getByText(/size was off/)).toBeTruthy();
  });

  it("scores no move, or the wrong way, as 0 and says which way was right", () => {
    expect(commit(70, 70)).toHaveBeenCalledWith({ before: 70, after: 70 }, 0);
    cleanup();
    expect(commit(50, 80)).toHaveBeenCalledWith({ before: 50, after: 80 }, 0);
    expect(screen.getByText("A good reasoner moves down here.")).toBeTruthy();
  });

  it("gives both sliders a 44px touch area and reads their value aloud", () => {
    run(drill);
    const before = screen.getByRole("slider", { name: "Confidence before" });
    expect(before.className).toContain("range-touch");
    expect(before.getAttribute("aria-valuetext")).toBe("50 percent");
    fireEvent.change(before, { target: { value: "65" } });
    expect(before.getAttribute("aria-valuetext")).toBe("65 percent");
  });
});

describe("numeric", () => {
  const drill = sample("numeric"); // answer 100, tolerance 10
  const submit = (text: string) => {
    const given = run(drill);
    fireEvent.change(screen.getByLabelText(/Your answer/), { target: { value: text } });
    click(/Check my number/);
    return given;
  };

  it("can't be checked until something is typed", () => {
    run(drill);
    expect(
      (screen.getByRole("button", { name: /Check my number/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("accepts an answer within the tolerance, at either edge", () => {
    expect(submit("100")).toHaveBeenCalledWith(100, 1);
    cleanup();
    expect(submit("110")).toHaveBeenCalledWith(110, 1);
    cleanup();
    expect(submit("90")).toHaveBeenCalledWith(90, 1);
  });

  it("refuses an answer just outside it and shows how far out it was", () => {
    expect(submit("111")).toHaveBeenCalledWith(111, 0);
    expect(screen.getByText(/It's about 100 people; you were 11 people out\./)).toBeTruthy();
    expect(screen.getByText(drill.solution)).toBeTruthy();
  });

  it("reads numbers the way people type them", () => {
    expect(submit("1,000")).toHaveBeenCalledWith(1000, 0);
    cleanup();
    expect(submit(" 100 people")).toHaveBeenCalledWith(100, 1);
  });

  it("asks for a number, rather than scoring it as 0, when the text has none or several", () => {
    for (const text of ["about a hundred", "between 90 and 110", "1e3", "-"]) {
      const given = submit(text);
      expect(given, text).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toBe("Type one number, like 120.");
      cleanup();
    }
  });

  it("clears that message as soon as the learner types again", () => {
    run(drill);
    const input = screen.getByLabelText(/Your answer/);
    fireEvent.change(input, { target: { value: "lots" } });
    click(/Check my number/);
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.change(input, { target: { value: "10" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("submits with the Enter key", () => {
    const given = run(drill);
    const input = screen.getByLabelText(/Your answer/);
    fireEvent.change(input, { target: { value: "100" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(given).toHaveBeenCalledWith(100, 1);
  });

  it("asks for a decimal keypad on a phone and labels the unit", () => {
    run(drill);
    expect(screen.getByLabelText("Your answer (people)").getAttribute("inputmode")).toBe("decimal");
  });
});

describe("predict", () => {
  const drill = sample("predict");

  it("needs a call before it can be locked in", () => {
    run(drill);
    expect(
      (screen.getByRole("button", { name: /Lock in my call/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
    click(new RegExp(drill.options[0]!));
    expect(
      (screen.getByRole("button", { name: /Lock in my call/ }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("reports the call and the confidence together", () => {
    const given = run(drill);
    click(new RegExp(drill.options[0]!));
    fireEvent.change(screen.getByLabelText(/How sure are you/), { target: { value: "90" } });
    click(/Lock in my call/);
    expect(given).toHaveBeenCalledWith({ choice: 0, confidence: 90 }, 1);
  });

  it("calls a confident wrong answer overconfident, and a hesitant wrong one good instinct", () => {
    const sure = run(drill);
    click(new RegExp(drill.options[1]!));
    fireEvent.change(screen.getByLabelText(/How sure are you/), { target: { value: "95" } });
    click(/Lock in my call/);
    expect(sure).toHaveBeenCalledWith({ choice: 1, confidence: 95 }, 0);
    expect(screen.getByText(/overconfident/)).toBeTruthy();
    cleanup();

    run(drill);
    click(new RegExp(drill.options[1]!));
    fireEvent.change(screen.getByLabelText(/How sure are you/), { target: { value: "25" } });
    click(/Lock in my call/);
    expect(screen.getByText(/Good instinct, wrong call/)).toBeTruthy();
  });

  it("says a hesitant right answer knew more than it credited", () => {
    run(drill);
    click(new RegExp(drill.options[0]!));
    fireEvent.change(screen.getByLabelText(/How sure are you/), { target: { value: "30" } });
    click(/Lock in my call/);
    expect(screen.getByText(/knew more than you credited/)).toBeTruthy();
  });
});

describe("chart", () => {
  const drill = sample("chart");

  it("draws one bar per data point, scaled to the axis window (that is the trick)", () => {
    const { container } = render(<Run exercise={drill} />);
    const bars = [...container.querySelectorAll<HTMLElement>("figure [aria-hidden] .bg-primary")];
    expect(bars).toHaveLength(3);
    // Window 97-100: 98 is a third of the way up, 100 is all the way.
    expect(bars.map((bar) => bar.style.height)).toEqual([
      "33.33333333333333%",
      "66.66666666666666%",
      "100%",
    ]);
  });

  it("says the axis range in words", () => {
    render(<Run exercise={drill} />);
    expect(screen.getByText("Vertical axis: 97 to 100")).toBeTruthy();
  });

  it("gives a screen reader the data as a table, with the axis range", () => {
    render(<Run exercise={drill} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText(/axis runs from 97 to 100/)).toBeTruthy();
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => row.textContent)).toEqual(["Q198", "Q299", "Q3100"]);
  });

  it("hides the drawing itself from assistive technology", () => {
    const { container } = render(<Run exercise={drill} />);
    expect(container.querySelector("figure [aria-hidden='true']")).toBeTruthy();
  });

  it("scores the option that names the trick", () => {
    const given = run(drill);
    click(new RegExp(drill.options[0]!.slice(0, 25)));
    expect(given).toHaveBeenCalledWith(drill.correct, 1);
    expect(screen.getByText("You spotted the trick.")).toBeTruthy();
  });

  it("copes with a flat window without dividing by zero", () => {
    const flat = { ...drill, yMin: 5, yMax: 5 };
    const { container } = render(<Run exercise={flat} />);
    for (const bar of container.querySelectorAll<HTMLElement>("figure .bg-primary")) {
      expect(bar.style.height).toMatch(/^\d+(\.\d+)?%$/);
    }
  });
});

describe("the runner", () => {
  it("reports each drill's answer shape unchanged", () => {
    const shapes: Partial<Record<ExerciseKind, unknown>> = {
      rank: expect.arrayContaining([expect.any(String)]),
      order: expect.arrayContaining([expect.any(String)]),
    };
    for (const kind of ["rank", "order"] as const) {
      const given = run(SAMPLES[kind]);
      click(/Check my order/);
      expect(given).toHaveBeenCalledWith(shapes[kind], expect.any(Number));
      cleanup();
    }
  });
});
