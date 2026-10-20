// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StepResult } from "@/lib/steps/scoring";
import { builderSample, sortSample } from "@/test/steps";
import { ArgumentBuilder } from "./ArgumentBuilder";
import { SortIt } from "./SortIt";
import { TOUCH_HOLD_MS } from "./useDragDrop";

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

const rest = (ms: number) => act(async () => new Promise((resolve) => setTimeout(resolve, ms)));

/**
 * A full press-move-release by finger on `from`, ending over `over`. The finger rests first,
 * as a drag on a phone does; `hold: false` is a swipe that starts moving straight away.
 */
async function drag(from: Element, over: Element | null, { hold = true } = {}) {
  pointerOver(over);
  fireEvent.pointerDown(from, {
    clientX: 10,
    clientY: 10,
    pointerId: 1,
    pointerType: "touch",
    button: 0,
  });
  if (hold) await rest(TOUCH_HOLD_MS + 20);
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
  const card = (text: RegExp) => screen.getByRole("button", { name: text });
  const putIn = (label: string) => click(`Put it in ${label}`);
  const bucketButton = (label: string) =>
    screen.getByRole("button", { name: `Put it in ${label}` });

  it("says a bucket takes a tap, and that a drag starts with a hold", () => {
    mount();
    expect(
      screen.getByText("Where does it go? Tap a bucket, or hold the card and drag it onto one."),
    ).toBeTruthy();
  });

  it("shows one card at a time with every bucket in reach, and no Check until all are filed", async () => {
    mount();
    expect(card(/130 feet.*not sorted yet/)).toBeTruthy();
    expect(screen.getByText("Card 1 of 3")).toBeTruthy();
    expect(bucketButton("Fact")).toBeTruthy();
    expect(bucketButton("Opinion")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /ugly/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Check my sorting" })).toBeNull();
  });

  it("files the card with one tap on a bucket and brings the next", async () => {
    mount();
    putIn("Fact");
    expect(inBucket("Fact", /130 feet/)).toBeTruthy();
    expect(screen.getByText("Card 2 of 3")).toBeTruthy();
    expect(card(/ugly.*not sorted yet/)).toBeTruthy();
  });

  it("offers Check once everything is filed, in the place the card was", async () => {
    mount();
    putIn("Fact");
    putIn("Opinion");
    expect(screen.queryByRole("button", { name: "Check my sorting" })).toBeNull();
    putIn("Fact");
    expect(screen.getByText("Everything is sorted.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Check my sorting" })).toBeTruthy();
  });

  it("puts the buckets away once everything is filed, so the marks sit right under the result", async () => {
    mount();
    putIn("Fact");
    putIn("Fact");
    putIn("Fact");
    click("Check my sorting");
    expect(screen.queryByRole("group", { name: "Buckets" })).toBeNull();
    expect(screen.getByText("Some are in the wrong bucket.")).toBeTruthy();
    fireEvent.click(inBucket("Fact", /ugly.*wrong bucket/)!);
    expect(screen.getByRole("group", { name: "Buckets" })).toBeTruthy();
  });

  it("can be done entirely from the keyboard: Enter selects, Enter places, Escape puts it back", async () => {
    mount();
    const first = card(/130 feet/);
    first.focus();
    fireEvent.click(first); // Enter/Space on a button is a click
    expect(first.getAttribute("aria-pressed")).toBe("true");
    expect(document.body.textContent).toContain("Selected: The Harbor Bridge is 130 feet long.");
    fireEvent.keyDown(first, { key: "Escape" });
    expect(card(/130 feet/).getAttribute("aria-pressed")).toBe("false");
    const put = bucketButton("Fact");
    put.focus();
    fireEvent.click(put);
    expect(inBucket("Fact", /130 feet/)).toBeTruthy();
  });

  it("sorts by dragging the card onto a bucket", async () => {
    mount();
    await drag(card(/130 feet/), bucketButton("Opinion"));
    expect(inBucket("Opinion", /130 feet/)).toBeTruthy();
  });

  it("lets the page scroll over a card: no touch-action none, and a quick swipe is not a drag", async () => {
    mount();
    const first = card(/130 feet/);
    expect(first.style.touchAction).not.toBe("none");
    await drag(first, bucketButton("Opinion"), { hold: false });
    expect(card(/130 feet.*not sorted yet/)).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Opinion bucket" })).toBeNull();
  });

  it("stops the page scrolling only while a held card is being moved", async () => {
    mount();
    const swipe = () => {
      const move = new Event("touchmove", { bubbles: true, cancelable: true });
      window.dispatchEvent(move);
      return move.defaultPrevented;
    };
    const first = card(/130 feet/);
    expect(swipe()).toBe(false);
    fireEvent.pointerDown(first, { clientX: 10, clientY: 10, pointerId: 1, pointerType: "touch" });
    expect(swipe()).toBe(false);
    await rest(TOUCH_HOLD_MS + 20);
    expect(swipe()).toBe(true);
    fireEvent.pointerUp(first, { clientX: 10, clientY: 10, pointerId: 1, pointerType: "touch" });
    expect(swipe()).toBe(false);
  });

  it("drags straight away with a mouse", async () => {
    mount();
    const first = card(/130 feet/);
    pointerOver(bucketButton("Fact"));
    fireEvent.pointerDown(first, { clientX: 10, clientY: 10, pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerMove(first, { clientX: 60, clientY: 80, pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerUp(first, { clientX: 60, clientY: 80, pointerId: 1, pointerType: "mouse" });
    await rest(0);
    expect(inBucket("Fact", /130 feet/)).toBeTruthy();
  });

  it("leaves the card where it was when dropped on nothing", async () => {
    mount();
    await drag(card(/130 feet/), document.body);
    expect(
      within(screen.getByRole("group", { name: "Card to sort" })).getByText("Card 1 of 3"),
    ).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Fact bucket" })).toBeNull();
  });

  it("lets a filed card be moved by tapping it and then another bucket", async () => {
    mount();
    putIn("Fact");
    fireEvent.click(inBucket("Fact", /130 feet/)!);
    expect(screen.getByText("Moving this one")).toBeTruthy();
    putIn("Opinion");
    expect(inBucket("Opinion", /130 feet/)).toBeTruthy();
    expect(inBucket("Fact", /130 feet/)).toBeNull();
    expect(card(/ugly.*not sorted yet/)).toBeTruthy();
  });

  it("lets a filed card be dragged to another bucket, or back to the card slot", async () => {
    mount();
    putIn("Fact");
    await drag(inBucket("Fact", /130 feet/)!, bucketButton("Opinion"));
    expect(inBucket("Opinion", /130 feet/)).toBeTruthy();
    await drag(
      inBucket("Opinion", /130 feet/)!,
      screen.getByRole("group", { name: "Card to sort" }),
    );
    expect(card(/130 feet.*not sorted yet/)).toBeTruthy();
  });

  it("marks right and wrong with a tick, a cross and words, says why beside each miss, and keeps the right ones on retry", async () => {
    const onResolve = mount();
    putIn("Fact"); // 130 feet: right
    putIn("Fact"); // ugly: wrong
    putIn("Fact"); // 1998: right
    click("Check my sorting");
    expect(status()).toContain("2 of 3 are in the right place");
    const wrong = inBucket("Fact", /ugly.*wrong bucket/)!;
    expect(wrong.className).toMatch(/border-dashed/);
    expect(document.getElementById(wrong.getAttribute("aria-describedby")!)!.textContent).toContain(
      "Ugly is a taste",
    );
    expect(inBucket("Fact", /130 feet.*correct/)!.className).toMatch(/border-success/);
    expect(onResolve).not.toHaveBeenCalled();

    click("Try again");
    expect(inBucket("Fact", /130 feet/)).toBeTruthy();
    expect(inBucket("Fact", /ugly/)).toBeNull();
    expect(card(/ugly.*not sorted yet/)).toBeTruthy();
    putIn("Opinion");
    click("Check my sorting");
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 0.5, wrongAttempts: 1 });
  });

  it("lets a wrong card be moved straight away, clearing the marks so it can be checked again", async () => {
    const onResolve = mount();
    putIn("Fact");
    putIn("Fact");
    putIn("Fact");
    click("Check my sorting");
    fireEvent.click(inBucket("Fact", /ugly.*wrong bucket/)!);
    putIn("Opinion");
    expect(screen.queryByText(/Ugly is a taste/)).toBeNull();
    click("Check my sorting");
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 0.5, wrongAttempts: 1 });
  });

  it("scores full marks when sorted right first time", async () => {
    const onResolve = mount();
    putIn("Fact");
    putIn("Opinion");
    putIn("Fact");
    click("Check my sorting");
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 1 });
    expect(status()).toContain("Correct");
    expect(screen.getByText("Sorted.")).toBeTruthy();
  });

  it("shows the sorting after two misses if asked, scoring nothing", async () => {
    const onResolve = mount();
    for (let i = 0; i < 3; i++) putIn("Opinion");
    click("Check my sorting");
    click("Try again");
    for (let i = 0; i < 2; i++) putIn("Opinion");
    click("Check my sorting");
    click("Show me");
    expect(onResolve.mock.calls[0]![0]).toMatchObject({ score: 0, revealed: true });
    expect(inBucket("Fact", /130 feet/)).toBeTruthy();
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

  it("leads with tapping, and says a drag starts with a hold", () => {
    mount();
    expect(
      screen.getByText(
        "Tap a piece, then tap where it goes. Or hold a piece and drag it into the map.",
      ),
    ).toBeTruthy();
  });

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
