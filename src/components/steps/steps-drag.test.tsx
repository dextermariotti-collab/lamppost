// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StepResult } from "@/lib/steps/scoring";
import { builderSample, sortSample } from "@/test/steps";
import { ArgumentBuilder } from "./ArgumentBuilder";
import { SortIt } from "./SortIt";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const status = () => screen.getByRole("status").textContent ?? "";
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

/** Pretend the pointer is over `element` when it is released. */
function pointerOver(element: Element | null) {
  Object.defineProperty(document, "elementFromPoint", { value: () => element, configurable: true });
}

/** A full press-move-release by pointer on `from`, ending over `over`. */
async function drag(from: Element, over: Element | null) {
  pointerOver(over);
  fireEvent.pointerDown(from, {
    clientX: 10,
    clientY: 10,
    pointerId: 1,
    pointerType: "touch",
    button: 0,
  });
  fireEvent.pointerMove(from, { clientX: 60, clientY: 80, pointerId: 1, pointerType: "touch" });
  fireEvent.pointerUp(from, { clientX: 60, clientY: 80, pointerId: 1, pointerType: "touch" });
  // The click a browser fires after a drag is ignored until the next tick; let it pass.
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

const bucket = (label: string) => screen.getByRole("group", { name: `${label} bucket` });
const inBucket = (label: string, text: RegExp) =>
  within(bucket(label)).queryByRole("button", { name: text });

describe("Sort it", () => {
  const mount = () => {
    const onResolve = vi.fn<(r: StepResult) => void>();
    render(<SortIt step={sortSample} onResolve={onResolve} />);
    return onResolve;
  };
  const item = (text: RegExp) => screen.getByRole("button", { name: text });

  it("can't be checked until everything is sorted, and says how many are left", async () => {
    mount();
    expect(
      (screen.getByRole("button", { name: "3 left to sort" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("sorts by tapping an item and then a bucket, and announces the selection", async () => {
    mount();
    fireEvent.click(item(/ugly/));
    expect(item(/ugly/).getAttribute("aria-pressed")).toBe("true");
    expect(document.body.textContent).toContain("Selected: The Harbour Bridge is ugly.");
    click("Put it in Opinion");
    expect(inBucket("Opinion", /ugly/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "2 left to sort" })).toBeTruthy();
  });

  it("can be done entirely from the keyboard: Enter selects, Enter places, Escape puts it back", async () => {
    mount();
    const target = item(/40 metres/);
    target.focus();
    fireEvent.click(target); // Enter/Space on a button is a click
    expect(target.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(target, { key: "Escape" });
    expect(item(/40 metres/).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(item(/40 metres/));
    const put = screen.getByRole("button", { name: "Put it in Fact" });
    put.focus();
    fireEvent.click(put);
    expect(inBucket("Fact", /40 metres/)).toBeTruthy();
  });

  it("sorts by dragging an item onto a bucket", async () => {
    mount();
    await drag(item(/ugly/), bucket("Opinion"));
    expect(inBucket("Opinion", /ugly/)).toBeTruthy();
  });

  it("leaves an item where it was when dropped on nothing", async () => {
    mount();
    await drag(item(/ugly/), document.body);
    expect(
      within(screen.getByRole("group", { name: "Still to sort" })).getByRole("button", {
        name: /ugly/,
      }),
    ).toBeTruthy();
  });

  it("lets a placed item be moved back to the pool or to another bucket", async () => {
    mount();
    await drag(item(/ugly/), bucket("Fact"));
    await drag(inBucket("Fact", /ugly/)!, bucket("Opinion"));
    expect(inBucket("Opinion", /ugly/)).toBeTruthy();
    await drag(inBucket("Opinion", /ugly/)!, screen.getByRole("group", { name: "Still to sort" }));
    expect(
      within(screen.getByRole("group", { name: "Still to sort" })).getByRole("button", {
        name: /ugly/,
      }),
    ).toBeTruthy();
  });

  it("marks right and wrong with a tick, a cross and words, says why, and keeps the right ones on retry", async () => {
    const onResolve = mount();
    await drag(item(/40 metres/), bucket("Fact"));
    await drag(item(/ugly/), bucket("Fact")); // wrong
    await drag(item(/1998/), bucket("Fact"));
    click("Check my sorting");
    expect(status()).toContain("2 of 3 are in the right place");
    expect(status()).toContain("Ugly is a taste");
    expect(inBucket("Fact", /ugly.*wrong bucket/)!.className).toMatch(/border-dashed/);
    expect(inBucket("Fact", /40 metres.*correct/)!.className).toMatch(/border-success/);
    expect(onResolve).not.toHaveBeenCalled();

    click("Try again");
    expect(inBucket("Fact", /40 metres/)).toBeTruthy();
    expect(inBucket("Fact", /ugly/)).toBeNull();
    fireEvent.click(item(/ugly/));
    click("Put it in Opinion");
    click("Check my sorting");
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 0.5, wrongAttempts: 1 });
  });

  it("scores full marks when sorted right first time", async () => {
    const onResolve = mount();
    for (const [text, label] of [
      [/40 metres/, "Fact"],
      [/ugly/, "Opinion"],
      [/1998/, "Fact"],
    ] as const) {
      fireEvent.click(item(text));
      click(`Put it in ${label}`);
    }
    click("Check my sorting");
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 1 });
    expect(status()).toContain("Correct");
  });

  it("shows the sorting after two misses if asked, scoring nothing", async () => {
    const onResolve = mount();
    const allIn = (label: string) => {
      for (const text of [/40 metres/, /ugly/, /1998/]) {
        const el = screen.queryByRole("button", { name: text });
        if (el && !el.getAttribute("aria-label")?.includes(", correct")) {
          fireEvent.click(el);
          click(`Put it in ${label}`);
        }
      }
    };
    allIn("Opinion");
    click("Check my sorting");
    click("Try again");
    allIn("Opinion");
    click("Check my sorting");
    click("Show me");
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 0, revealed: true });
    expect(inBucket("Fact", /40 metres/)).toBeTruthy();
  });
});

describe("Argument builder", () => {
  const mount = () => {
    const onResolve = vi.fn<(r: StepResult) => void>();
    render(<ArgumentBuilder step={builderSample} onResolve={onResolve} />);
    return onResolve;
  };
  const piece = (text: RegExp) => screen.getByRole("button", { name: text });
  const slot = (label: string) => screen.getByRole("group", { name: new RegExp(`^${label}:`) });
  const tapPlace = (text: RegExp, slotButtonIndex = 0) => {
    fireEvent.click(piece(text));
    fireEvent.click(screen.getAllByRole("button", { name: "Put it here" })[slotButtonIndex]!);
  };

  it("starts with an empty map and counts what is in place", async () => {
    mount();
    expect(screen.getByText("0 of 3 in place")).toBeTruthy();
    expect(slot("Conclusion").getAttribute("aria-label")).toBe("Conclusion: empty");
  });

  it("places a piece by tapping it and then the slot", async () => {
    mount();
    tapPlace(/should open at 6am/, 0);
    expect(
      within(slot("Conclusion")).getByRole("button", { name: /should open at 6am/ }),
    ).toBeTruthy();
    expect(slot("Conclusion").getAttribute("aria-label")).toBe("Conclusion: fits");
    expect(screen.getByText("1 of 3 in place")).toBeTruthy();
  });

  it("places a piece by dragging it into a slot", async () => {
    mount();
    await drag(piece(/should open at 6am/), slot("Conclusion"));
    expect(slot("Conclusion").getAttribute("aria-label")).toBe("Conclusion: fits");
  });

  it("checks live: a piece in the wrong kind of place says what it actually is, with a cross and words", async () => {
    mount();
    tapPlace(/door counter/, 1); // evidence into the Reason (premise) slot
    expect(slot("Reason").getAttribute("aria-label")).toBe("Reason: doesn't fit");
    expect(within(slot("Reason")).getByText("Doesn't fit")).toBeTruthy();
    expect(slot("Reason").className).toMatch(/border-dashed/);
    expect(status()).toMatch(/evidence.*not premise/i);
  });

  it("explains why a piece that supports nothing doesn't belong, in its own words", async () => {
    mount();
    tapPlace(/likes early mornings/, 0);
    expect(status()).toContain("Liking mornings doesn't give customers a reason");
  });

  it("is complete, and resolves, only when every slot fits", async () => {
    const onResolve = mount();
    tapPlace(/should open at 6am/, 0);
    tapPlace(/commuters/, 0); // the first remaining empty slot is now Reason
    expect(onResolve).not.toHaveBeenCalled();
    tapPlace(/door counter/, 0);
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 1, wrongAttempts: 0 });
    expect(status()).toContain("The map holds together");
    // The stray piece is simply left out.
    expect(screen.getByRole("group", { name: "Pieces to place" }).textContent).toMatch(
      /likes early mornings/,
    );
  });

  it("counts misplacements against the score", async () => {
    const onResolve = mount();
    tapPlace(/door counter/, 1); // evidence into Reason: wrong
    tapPlace(/commuters/, 0); // premise into Conclusion: wrong
    // Put things right by dragging; whatever was in a slot goes back to the pool.
    await drag(piece(/should open at 6am/), slot("Conclusion"));
    await drag(piece(/commuters/), slot("Reason"));
    await drag(piece(/door counter/), slot("Evidence"));
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ wrongAttempts: 2, score: 0.25 });
  });

  it("offers Show me after two misses, even though nothing is blocking", async () => {
    const onResolve = mount();
    expect(screen.queryByRole("button", { name: "Show me" })).toBeNull();
    tapPlace(/door counter/, 1);
    tapPlace(/commuters/, 0);
    click("Show me");
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 0, revealed: true });
    expect(slot("Conclusion").getAttribute("aria-label")).toBe("Conclusion: fits");
    expect(slot("Evidence").getAttribute("aria-label")).toBe("Evidence: fits");
  });

  it("returns a piece to the pool when it is dragged back", async () => {
    mount();
    tapPlace(/should open at 6am/, 0);
    await drag(
      within(slot("Conclusion")).getByRole("button", { name: /should open at 6am/ }),
      screen.getByRole("group", { name: "Pieces to place" }),
    );
    expect(slot("Conclusion").getAttribute("aria-label")).toBe("Conclusion: empty");
    expect(
      within(screen.getByRole("group", { name: "Pieces to place" })).getByRole("button", {
        name: /should open at 6am/,
      }),
    ).toBeTruthy();
  });
});
