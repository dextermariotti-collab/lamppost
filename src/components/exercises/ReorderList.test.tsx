// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ReorderList } from "./ReorderList";

afterEach(cleanup);

const SOLUTION = ["First", "Second", "Third"];

function Harness({ start = ["Second", "Third", "First"], answered = false }) {
  const [order, setOrder] = useState(start);
  return (
    <ReorderList
      order={order}
      solution={SOLUTION}
      answered={answered}
      whyOf={(text) => `Why ${text}`}
      onMove={(from, to) =>
        setOrder((prev) => {
          const next = [...prev];
          const [item] = next.splice(from, 1);
          next.splice(to, 0, item!);
          return next;
        })
      }
    />
  );
}

const texts = () => screen.getAllByRole("listitem").map((li) => li.textContent);
const announced = () => screen.getByRole("status").textContent;

describe("ReorderList", () => {
  it("gives every control a 44px target", () => {
    render(<Harness />);
    const controls = screen.getAllByRole("button");
    expect(controls).toHaveLength(6);
    for (const control of controls) expect(control.className).toMatch(/\bh-11\b.*\bw-11\b/);
  });

  it("moves a card with a tap and says where it went", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /Move “First” up/ }));
    expect(texts()[1]).toMatch(/First/);
    expect(announced()).toBe("Moved “First” to position 2 of 3.");
  });

  it("moves a card with the arrow keys, without needing to tab again", () => {
    render(<Harness />);
    const up = screen.getByRole("button", { name: /Move “First” up/ });
    up.focus();
    fireEvent.keyDown(up, { key: "ArrowUp" });
    fireEvent.keyDown(screen.getByRole("button", { name: /Move “First” up/ }), { key: "ArrowUp" });
    expect(texts()[0]).toMatch(/First/);
    // Focus stayed on that card's up arrow through both moves.
    const focused = document.activeElement as HTMLElement;
    expect(focused.getAttribute("aria-label")).toBe("Move “First” up");
  });

  it("says a card can go no further instead of doing nothing", () => {
    render(<Harness />);
    const top = screen.getByRole("button", { name: /Move “Second” up/ });
    expect(top.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(top);
    expect(announced()).toBe("“Second” is already first.");
    fireEvent.click(screen.getByRole("button", { name: /Move “First” down/ }));
    expect(announced()).toBe("“First” is already last.");
    expect(texts()[0]).toMatch(/Second/);
  });

  it("reads each card with its position for a screen reader", () => {
    render(<Harness />);
    expect(texts()[0]).toMatch(/Position 1: Second/);
  });

  it("shows where a card belongs and why once answered, and takes the controls away", () => {
    render(<Harness answered />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    const rows = texts();
    expect(rows[0]).toMatch(/Belongs at 2\. Why Second/);
    expect(rows[2]).toMatch(/Belongs at 1\. Why First/);
  });

  it("marks a card in the right place as right", () => {
    render(<Harness start={SOLUTION} answered />);
    for (const row of screen.getAllByRole("listitem"))
      expect(row.textContent).not.toMatch(/Belongs at/);
  });
});
